-- ============================================================================
-- Migration: Resolve All Supabase Database Advisors & Linter Warnings
-- Date: 2026-09-11
-- Purpose: Completely resolves all 12+ Performance and Security Advisor warnings:
--   1. unindexed_foreign_keys: Creates B-Tree indexes on every FK column.
--   2. auth_rls_initplan: Wraps auth.uid() and current_user_role() in scalar subqueries.
--   3. multiple_permissive_policies: Drops all overlapping legacy policies.
--   4. function_search_path_mutable: Sets immutable search_path on all functions.
-- ============================================================================

-- ============================================================================
-- 1. FIX FUNCTION SEARCH PATH (Security Advisor: function_search_path_mutable)
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

create or replace function public.set_course_grades_final_grade()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.final_grade := round(((coalesce(new.note_1, 0) + coalesce(new.note_2, 0) + coalesce(new.note_3, 0)) / 3.0), 2);
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fallback_role public.user_role;
begin
  fallback_role :=
    case coalesce(new.raw_user_meta_data->>'role', 'student')
      when 'admin' then 'admin'::public.user_role
      when 'teacher' then 'teacher'::public.user_role
      else 'student'::public.user_role
    end;

  insert into public.profiles (id, email, full_name, role, grade_level, assigned_grade_levels, created_by)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    fallback_role,
    nullif(new.raw_user_meta_data->>'grade_level', ''),
    coalesce(
      (
        select array_agg(value::text)
        from jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'assigned_grade_levels', '[]'::jsonb)) as elems(value)
      ),
      '{}'::text[]
    ),
    nullif(new.raw_user_meta_data->>'created_by', '')::uuid
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      role = excluded.role,
      grade_level = excluded.grade_level,
      assigned_grade_levels = excluded.assigned_grade_levels;

  return new;
end;
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'role', '')::public.user_role,
    nullif(auth.jwt() -> 'user_metadata' ->> 'role', '')::public.user_role,
    'student'::public.user_role
  )
$$;

grant execute on function public.current_user_role() to anon, authenticated;

create or replace function public.has_any_role(allowed_roles public.user_role[])
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select public.current_user_role()) = any (allowed_roles), false)
$$;

grant execute on function public.has_any_role(public.user_role[]) to anon, authenticated;

create or replace function public.prevent_invalid_profile_role_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    if (select public.current_user_role()) = 'teacher'::public.user_role then
      raise exception 'Teachers cannot change roles';
    end if;

    if new.role = 'admin'::public.user_role and (select auth.uid()) <> new.id then
      raise exception 'Admin role cannot be assigned to another user';
    end if;
  end if;

  return new;
end;
$$;

-- Trigger functions should never be executable by public/anon/authenticated over RPC
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.prevent_invalid_profile_role_changes() from public, anon, authenticated;

-- Drop obsolete teacher dashboard RPC function (replaced by teacher-dashboard-data Edge function)
drop function if exists public.get_teacher_dashboard_data(uuid);

-- Security / Extension Hygiene: Move pgcrypto out of public schema if installed there
do $$
begin
  create schema if not exists extensions;
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on e.extnamespace = n.oid
    where e.extname = 'pgcrypto' and n.nspname = 'public'
  ) then
    alter extension pgcrypto set schema extensions;
  end if;
end$$;

-- ============================================================================
-- 2. CREATE ALL MISSING FOREIGN KEY INDEXES (Performance Advisor: unindexed_foreign_keys)
-- ============================================================================

-- courses
create index if not exists courses_teacher_id_idx
  on public.courses (teacher_id);

-- enrollments
create index if not exists enrollments_student_id_idx
  on public.enrollments (student_id);

create index if not exists enrollments_course_id_idx
  on public.enrollments (course_id);

-- assessments
create index if not exists assessments_course_id_idx
  on public.assessments (course_id);

create index if not exists assessments_created_by_idx
  on public.assessments (created_by);

-- grade_records
create index if not exists grade_records_assessment_id_idx
  on public.grade_records (assessment_id);

create index if not exists grade_records_student_id_idx
  on public.grade_records (student_id);

create index if not exists grade_records_graded_by_idx
  on public.grade_records (graded_by);

-- course_grades
create index if not exists course_grades_course_id_idx
  on public.course_grades (course_id);

create index if not exists course_grades_student_id_idx
  on public.course_grades (student_id);

create index if not exists course_grades_updated_by_idx
  on public.course_grades (updated_by);

-- chat_threads (if table exists)
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'chat_threads') then
    create index if not exists chat_threads_student_id_idx
      on public.chat_threads (student_id);
  end if;
end$$;

-- chat_messages (if table exists)
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'chat_messages') then
    create index if not exists chat_messages_thread_id_idx
      on public.chat_messages (thread_id);
  end if;
end$$;

-- profiles
create index if not exists profiles_created_by_idx
  on public.profiles (created_by);

create index if not exists profiles_role_idx
  on public.profiles (role);

-- ============================================================================
-- 3. OPTIMIZED RLS POLICIES WITH INITPLAN SCALAR SUBQUERIES (Performance Advisor: auth_rls_initplan)
-- ============================================================================

-- Ensure RLS is enabled on all tables
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.assessments enable row level security;
alter table public.grade_records enable row level security;
alter table public.course_grades enable row level security;

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'chat_threads') then
    alter table public.chat_threads enable row level security;
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'chat_messages') then
    alter table public.chat_messages enable row level security;
  end if;
end$$;

-- --- PROFILES ---
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
using (
  id = (select auth.uid())
  or (select public.current_user_role()) = 'admin'::public.user_role
  or (
    (select public.current_user_role()) = 'teacher'::public.user_role
    and created_by = (select auth.uid())
  )
);

drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "profiles_update_own"
on public.profiles
for update
using (
  id = (select auth.uid())
  or (select public.current_user_role()) = 'admin'::public.user_role
)
with check (
  id = (select auth.uid())
  or (select public.current_user_role()) = 'admin'::public.user_role
);

drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert"
on public.profiles
for insert
with check (
  id = (select auth.uid())
  or (select public.current_user_role()) = 'admin'::public.user_role
  or (
    (select public.current_user_role()) = 'teacher'::public.user_role
    and created_by = (select auth.uid())
  )
);

drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete"
on public.profiles
for delete
using (
  (select public.current_user_role()) = 'admin'::public.user_role
  and id <> (select auth.uid())
);

-- --- COURSES ---
drop policy if exists "courses_select_authenticated" on public.courses;
drop policy if exists "courses_select" on public.courses;
drop policy if exists "Anyone can view courses" on public.courses;

create policy "courses_select_authenticated"
on public.courses
for select
using ((select auth.uid()) is not null);

drop policy if exists "courses_write_admin_teacher" on public.courses;
drop policy if exists "Teachers and admins can insert courses" on public.courses;

create policy "courses_write_admin_teacher"
on public.courses
for insert
with check (
  (select public.current_user_role()) = 'admin'::public.user_role
  or (
    (select public.current_user_role()) = 'teacher'::public.user_role
    and teacher_id = (select auth.uid())
  )
);

drop policy if exists "courses_update_admin_teacher" on public.courses;
drop policy if exists "Teachers and admins can update courses" on public.courses;

create policy "courses_update_admin_teacher"
on public.courses
for update
using (
  (select public.current_user_role()) = 'admin'::public.user_role
  or (
    (select public.current_user_role()) = 'teacher'::public.user_role
    and teacher_id = (select auth.uid())
  )
)
with check (
  (select public.current_user_role()) = 'admin'::public.user_role
  or (
    (select public.current_user_role()) = 'teacher'::public.user_role
    and teacher_id = (select auth.uid())
  )
);

drop policy if exists "courses_delete_admin_teacher" on public.courses;
drop policy if exists "Teachers and admins can delete courses" on public.courses;

create policy "courses_delete_admin_teacher"
on public.courses
for delete
using (
  (select public.current_user_role()) = 'admin'::public.user_role
  or (
    (select public.current_user_role()) = 'teacher'::public.user_role
    and teacher_id = (select auth.uid())
  )
);

-- --- ENROLLMENTS ---
drop policy if exists "enrollments_select" on public.enrollments;
drop policy if exists "enrollments_select_policy" on public.enrollments;

create policy "enrollments_select"
on public.enrollments
for select
using (
  student_id = (select auth.uid())
  or (select public.current_user_role()) = 'admin'::public.user_role
  or exists (
    select 1
    from public.courses c
    where c.id = course_id
      and c.teacher_id = (select auth.uid())
  )
);

drop policy if exists "enrollments_write_admin_teacher" on public.enrollments;
create policy "enrollments_write_admin_teacher"
on public.enrollments
for insert
with check (
  (select public.current_user_role()) = 'admin'::public.user_role
  or exists (
    select 1
    from public.courses c
    where c.id = course_id
      and c.teacher_id = (select auth.uid())
  )
);

drop policy if exists "enrollments_update_admin_teacher" on public.enrollments;
create policy "enrollments_update_admin_teacher"
on public.enrollments
for update
using (
  (select public.current_user_role()) = 'admin'::public.user_role
  or exists (
    select 1
    from public.courses c
    where c.id = course_id
      and c.teacher_id = (select auth.uid())
  )
)
with check (
  (select public.current_user_role()) = 'admin'::public.user_role
  or exists (
    select 1
    from public.courses c
    where c.id = course_id
      and c.teacher_id = (select auth.uid())
  )
);

drop policy if exists "enrollments_delete_admin_teacher" on public.enrollments;
create policy "enrollments_delete_admin_teacher"
on public.enrollments
for delete
using (
  (select public.current_user_role()) = 'admin'::public.user_role
  or exists (
    select 1
    from public.courses c
    where c.id = course_id
      and c.teacher_id = (select auth.uid())
  )
);

-- --- ASSESSMENTS ---
drop policy if exists "assessments_select" on public.assessments;
create policy "assessments_select"
on public.assessments
for select
using ((select auth.uid()) is not null);

drop policy if exists "assessments_write_admin_teacher" on public.assessments;
create policy "assessments_write_admin_teacher"
on public.assessments
for insert
with check (
  (select public.has_any_role(ARRAY['admin'::public.user_role, 'teacher'::public.user_role]))
);

-- --- GRADE RECORDS ---
drop policy if exists "grade_records_select" on public.grade_records;
create policy "grade_records_select"
on public.grade_records
for select
using (
  student_id = (select auth.uid())
  or (select public.current_user_role()) = 'admin'::public.user_role
  or exists (
    select 1
    from public.courses c
    join public.assessments a on a.course_id = c.id
    where a.id = assessment_id
      and c.teacher_id = (select auth.uid())
  )
);

drop policy if exists "grade_records_write_admin_teacher" on public.grade_records;
create policy "grade_records_write_admin_teacher"
on public.grade_records
for insert
with check (
  (select public.has_any_role(ARRAY['admin'::public.user_role, 'teacher'::public.user_role]))
);

drop policy if exists "grade_records_update_admin_teacher" on public.grade_records;
create policy "grade_records_update_admin_teacher"
on public.grade_records
for update
using (
  (select public.has_any_role(ARRAY['admin'::public.user_role, 'teacher'::public.user_role]))
)
with check (
  (select public.has_any_role(ARRAY['admin'::public.user_role, 'teacher'::public.user_role]))
);

-- --- COURSE GRADES ---
drop policy if exists "course_grades_select" on public.course_grades;
create policy "course_grades_select"
on public.course_grades
for select
using (
  student_id = (select auth.uid())
  or (select public.current_user_role()) = 'admin'::public.user_role
  or exists (
    select 1
    from public.courses c
    where c.id = course_id
      and c.teacher_id = (select auth.uid())
  )
);

drop policy if exists "course_grades_write_admin_teacher" on public.course_grades;
create policy "course_grades_write_admin_teacher"
on public.course_grades
for insert
with check (
  (select public.current_user_role()) = 'admin'::public.user_role
  or (
    (select public.current_user_role()) = 'teacher'::public.user_role
    and exists (
      select 1
      from public.courses c
      where c.id = course_id
        and c.teacher_id = (select auth.uid())
    )
  )
);

drop policy if exists "course_grades_update_admin_teacher" on public.course_grades;
create policy "course_grades_update_admin_teacher"
on public.course_grades
for update
using (
  (select public.current_user_role()) = 'admin'::public.user_role
  or (
    (select public.current_user_role()) = 'teacher'::public.user_role
    and exists (
      select 1
      from public.courses c
      where c.id = course_id
        and c.teacher_id = (select auth.uid())
    )
  )
)
with check (
  (select public.current_user_role()) = 'admin'::public.user_role
  or (
    (select public.current_user_role()) = 'teacher'::public.user_role
    and exists (
      select 1
      from public.courses c
      where c.id = course_id
        and c.teacher_id = (select auth.uid())
    )
  )
);

-- --- CHAT THREADS & MESSAGES ---
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'chat_threads') then
    drop policy if exists "chat_threads_select_owner" on public.chat_threads;
    create policy "chat_threads_select_owner"
    on public.chat_threads
    for select
    using (
      student_id = (select auth.uid())
      or (select public.current_user_role()) = 'admin'::public.user_role
      or (
        (select public.current_user_role()) = 'teacher'::public.user_role
        and exists (
          select 1
          from public.enrollments e
          join public.courses c on e.course_id = c.id
          where e.student_id = chat_threads.student_id
            and c.teacher_id = (select auth.uid())
        )
      )
    );

    drop policy if exists "chat_threads_write_owner" on public.chat_threads;
    create policy "chat_threads_write_owner"
    on public.chat_threads
    for insert
    with check (
      student_id = (select auth.uid())
      or (select public.current_user_role()) = 'admin'::public.user_role
    );
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'chat_messages') then
    drop policy if exists "chat_messages_select_owner" on public.chat_messages;
    create policy "chat_messages_select_owner"
    on public.chat_messages
    for select
    using (
      exists (
        select 1
        from public.chat_threads t
        where t.id = thread_id
          and (
            t.student_id = (select auth.uid())
            or (select public.current_user_role()) = 'admin'::public.user_role
            or (
              (select public.current_user_role()) = 'teacher'::public.user_role
              and exists (
                select 1
                from public.enrollments e
                join public.courses c on e.course_id = c.id
                where e.student_id = t.student_id
                  and c.teacher_id = (select auth.uid())
              )
            )
          )
      )
    );

    drop policy if exists "chat_messages_write_owner" on public.chat_messages;
    create policy "chat_messages_write_owner"
    on public.chat_messages
    for insert
    with check (
      exists (
        select 1
        from public.chat_threads t
        where t.id = thread_id
          and (
            t.student_id = (select auth.uid())
            or (select public.current_user_role()) = 'admin'::public.user_role
          )
      )
    );
  end if;
end$$;
