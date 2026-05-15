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

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    fallback_role
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      role = excluded.role;

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
    (
      select p.role
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    nullif(auth.jwt() -> 'app_metadata' ->> 'role', '')::public.user_role,
    nullif(auth.jwt() -> 'user_metadata' ->> 'role', '')::public.user_role
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

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Chat IA',
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
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

-- Profiles: each user can read/update their own profile. Admin can read all.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (
  auth.uid() = id
  or public.current_user_role() = 'admin'::public.user_role
);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert"
on public.profiles
for insert
with check (
  auth.uid() = id
  or public.current_user_role() = 'admin'::public.user_role
);

drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete"
on public.profiles
for delete
using (
  public.current_user_role() = 'admin'::public.user_role
  and auth.uid() <> id
);

-- Courses: authenticated users can read; teachers and admins can manage.
drop policy if exists "courses_select_authenticated" on public.courses;
create policy "courses_select_authenticated"
on public.courses
for select
using (auth.uid() is not null);

drop policy if exists "courses_write_admin_teacher" on public.courses;
create policy "courses_write_admin_teacher"
on public.courses
for insert
with check (
  public.has_any_role(ARRAY['admin'::public.user_role, 'teacher'::public.user_role])
);

drop policy if exists "courses_update_admin_teacher" on public.courses;
create policy "courses_update_admin_teacher"
on public.courses
for update
using (
  public.has_any_role(ARRAY['admin'::public.user_role, 'teacher'::public.user_role])
)
with check (
  public.has_any_role(ARRAY['admin'::public.user_role, 'teacher'::public.user_role])
);

drop policy if exists "courses_delete_admin_teacher" on public.courses;
create policy "courses_delete_admin_teacher"
on public.courses
for delete
using (
  public.has_any_role(ARRAY['admin'::public.user_role, 'teacher'::public.user_role])
);

-- Enrollments: students see their own, teachers see enrollments in their courses, admins see all.
drop policy if exists "enrollments_select" on public.enrollments;
create policy "enrollments_select"
on public.enrollments
for select
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.courses c
    where c.id = course_id
      and c.teacher_id = auth.uid()
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "enrollments_write_admin_teacher" on public.enrollments;
create policy "enrollments_write_admin_teacher"
on public.enrollments
for insert
with check (
  public.has_any_role(ARRAY['admin'::public.user_role, 'teacher'::public.user_role])
);

drop policy if exists "enrollments_update_admin_teacher" on public.enrollments;
create policy "enrollments_update_admin_teacher"
on public.enrollments
for update
using (
  public.has_any_role(ARRAY['admin'::public.user_role, 'teacher'::public.user_role])
)
with check (
  public.has_any_role(ARRAY['admin'::public.user_role, 'teacher'::public.user_role])
);

drop policy if exists "enrollments_delete_admin_teacher" on public.enrollments;
create policy "enrollments_delete_admin_teacher"
on public.enrollments
for delete
using (
  public.has_any_role(ARRAY['admin'::public.user_role, 'teacher'::public.user_role])
);

-- Assessments and grade records follow the same access model.
drop policy if exists "assessments_select" on public.assessments;
create policy "assessments_select"
on public.assessments
for select
using (
  auth.uid() is not null
);

drop policy if exists "assessments_write_admin_teacher" on public.assessments;
create policy "assessments_write_admin_teacher"
on public.assessments
for insert
with check (
  public.has_any_role(ARRAY['admin'::public.user_role, 'teacher'::public.user_role])
);

drop policy if exists "grade_records_select" on public.grade_records;
create policy "grade_records_select"
on public.grade_records
for select
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.courses c
    join public.assessments a on a.course_id = c.id
    where a.id = assessment_id
      and c.teacher_id = auth.uid()
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "grade_records_write_admin_teacher" on public.grade_records;
create policy "grade_records_write_admin_teacher"
on public.grade_records
for insert
with check (
  public.has_any_role(ARRAY['admin'::public.user_role, 'teacher'::public.user_role])
);

-- Chat tables: the owning user can see their threads/messages, and admin can audit all chats.
drop policy if exists "chat_threads_select_owner" on public.chat_threads;
create policy "chat_threads_select_owner"
on public.chat_threads
for select
using (
  student_id = auth.uid()
  or public.current_user_role() = 'admin'::public.user_role
);

drop policy if exists "chat_threads_write_owner" on public.chat_threads;
create policy "chat_threads_write_owner"
on public.chat_threads
for insert
with check (student_id = auth.uid());

drop policy if exists "chat_messages_select_owner" on public.chat_messages;
create policy "chat_messages_select_owner"
on public.chat_messages
for select
using (
  exists (
    select 1
    from public.chat_threads t
    where t.id = thread_id
      and t.student_id = auth.uid()
  )
  or public.current_user_role() = 'admin'::public.user_role
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
      and t.student_id = auth.uid()
  )
);
