-- NexuMathEdu - Supabase schema
-- Paste this into Supabase SQL Editor to create the database from scratch.

create extension if not exists pgcrypto;

-- ============================================================================
-- Types
-- ============================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'teacher', 'student');
  end if;
end$$;

-- ============================================================================
-- Helpers
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_course_grades_final_grade()
returns trigger
language plpgsql
as $$
begin
  new.final_grade := round(((coalesce(new.note_1, 0) + coalesce(new.note_2, 0) + coalesce(new.note_3, 0)) / 3), 2);
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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
security definer
set search_path = public
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'role', '')::public.user_role,
    nullif(auth.jwt() -> 'user_metadata' ->> 'role', '')::public.user_role,
    (
      select coalesce(raw_app_meta_data->>'role', raw_user_meta_data->>'role', 'student')::public.user_role
      from auth.users
      where id = auth.uid()
      limit 1
    )
  )
$$;

create or replace function public.has_any_role(allowed_roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = any (allowed_roles), false)
$$;

create or replace function public.prevent_invalid_profile_role_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if public.current_user_role() = 'teacher'::public.user_role then
      raise exception 'Teachers cannot change roles';
    end if;

    if new.role = 'admin'::public.user_role and auth.uid() <> new.id then
      raise exception 'Admin role cannot be assigned to another user';
    end if;
  end if;

  return new;
end;
$$;

-- ============================================================================
-- Core tables
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.user_role not null default 'student',
  avatar_url text,
  grade_level text,
  assigned_grade_levels text[] not null default '{}',
  chat_provider text not null default 'profesor_1',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  subject text,
  grade_level text,
  teacher_id uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (course_id, student_id)
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  max_score numeric(5,2) not null default 5.00,
  due_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.grade_records (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  score numeric(5,2) not null check (score >= 0),
  feedback text,
  graded_by uuid references public.profiles(id) on delete set null,
  graded_at timestamptz not null default now(),
  unique (assessment_id, student_id)
);

create table if not exists public.course_grades (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  note_1 numeric(5,2) not null default 0,
  note_2 numeric(5,2) not null default 0,
  note_3 numeric(5,2) not null default 0,
  final_grade numeric(5,2) not null default 0,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, student_id)
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Chat',
  provider text not null default 'profesor_1',
  tone text not null default 'claro',
  detail_level text not null default 'medio',
  focus text not null default 'matematicas',
  language text not null default 'espanol',
  topic text not null default 'general',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_role text not null check (sender_role in ('student', 'assistant', 'teacher', 'admin')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_threads_student_updated_idx
  on public.chat_threads (student_id, updated_at desc);

create index if not exists chat_messages_thread_created_idx
  on public.chat_messages (thread_id, created_at asc);

-- Profile indexes for performance
create index if not exists profiles_role_idx
  on public.profiles (role);

create index if not exists profiles_created_by_idx
  on public.profiles (created_by);

create index if not exists profiles_email_idx
  on public.profiles (email);

create index if not exists profiles_grade_level_idx
  on public.profiles (grade_level);

create index if not exists profiles_assigned_grade_levels_idx
  on public.profiles using gin (assigned_grade_levels);

-- Foreign key indexes for high-performance JOINs and cascades
create index if not exists courses_teacher_id_idx
  on public.courses (teacher_id);

create index if not exists enrollments_student_id_idx
  on public.enrollments (student_id);

create index if not exists enrollments_course_id_idx
  on public.enrollments (course_id);

create index if not exists assessments_course_id_idx
  on public.assessments (course_id);

create index if not exists assessments_created_by_idx
  on public.assessments (created_by);

create index if not exists grade_records_assessment_id_idx
  on public.grade_records (assessment_id);

create index if not exists grade_records_student_id_idx
  on public.grade_records (student_id);

create index if not exists grade_records_graded_by_idx
  on public.grade_records (graded_by);

create index if not exists course_grades_course_id_idx
  on public.course_grades (course_id);

create index if not exists course_grades_student_id_idx
  on public.course_grades (student_id);

create index if not exists course_grades_updated_by_idx
  on public.course_grades (updated_by);

-- ============================================================================
-- Triggers
-- ============================================================================
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists prevent_invalid_profile_role_changes_on_profiles on public.profiles;
create trigger prevent_invalid_profile_role_changes_on_profiles
before update on public.profiles
for each row execute procedure public.prevent_invalid_profile_role_changes();

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at
before update on public.courses
for each row execute procedure public.set_updated_at();

drop trigger if exists set_assessments_updated_at on public.assessments;
create trigger set_assessments_updated_at
before update on public.assessments
for each row execute procedure public.set_updated_at();

drop trigger if exists set_course_grades_updated_at on public.course_grades;
create trigger set_course_grades_updated_at
before update on public.course_grades
for each row execute procedure public.set_updated_at();

drop trigger if exists set_course_grades_final_grade on public.course_grades;
create trigger set_course_grades_final_grade
before insert or update on public.course_grades
for each row execute procedure public.set_course_grades_final_grade();

drop trigger if exists set_chat_threads_updated_at on public.chat_threads;
create trigger set_chat_threads_updated_at
before update on public.chat_threads
for each row execute procedure public.set_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.assessments enable row level security;
alter table public.grade_records enable row level security;
alter table public.course_grades enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

-- Profiles: each user can read/update their own profile. Admin can read all.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (
  (select auth.uid()) = id
  or (select public.current_user_role()) = 'admin'::public.user_role
  or (
    (select public.current_user_role()) = 'teacher'::public.user_role
    and created_by = (select auth.uid())
  )
);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert"
on public.profiles
for insert
with check (
  (select auth.uid()) = id
  or (select public.current_user_role()) = 'admin'::public.user_role
);

drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete"
on public.profiles
for delete
using (
  (select public.current_user_role()) = 'admin'::public.user_role
  and (select auth.uid()) <> id
);

-- Courses: authenticated users can read; teachers and admins can manage.
drop policy if exists "courses_select_authenticated" on public.courses;
create policy "courses_select_authenticated"
on public.courses
for select
using ((select auth.uid()) is not null);

drop policy if exists "courses_write_admin_teacher" on public.courses;
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

-- Enrollments: students see their own, teachers see enrollments in their courses, admins see all.
drop policy if exists "enrollments_select" on public.enrollments;
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

-- Assessments and grade records follow the same access model.
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

-- Chat tables: the owning user can see their threads/messages, and admin can audit all chats.
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
