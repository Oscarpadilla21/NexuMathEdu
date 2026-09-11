-- Migration: Supabase Performance, Indexes, and RLS Optimization
-- Date: 2026-07-28

-- ============================================================================
-- 1. High Performance B-Tree & GIN Indexes
-- ============================================================================
create index if not exists courses_teacher_id_idx
  on public.courses (teacher_id);

create index if not exists enrollments_student_course_idx
  on public.enrollments (student_id, course_id);

create index if not exists course_grades_student_course_idx
  on public.course_grades (student_id, course_id);

create index if not exists assessments_course_id_idx
  on public.assessments (course_id);

create index if not exists grade_records_assessment_student_idx
  on public.grade_records (assessment_id, student_id);

-- ============================================================================
-- 2. Optimized RLS Policies using (select auth.uid()) wrapping
-- ============================================================================

-- Profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (
  (select auth.uid()) = id
  or public.current_user_role() = 'admin'::public.user_role
  or (
    public.current_user_role() = 'teacher'::public.user_role
    and created_by = (select auth.uid())
  )
);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Courses
drop policy if exists "courses_select_authenticated" on public.courses;
create policy "courses_select_authenticated"
on public.courses
for select
to authenticated
using (true);

drop policy if exists "courses_write_admin_teacher" on public.courses;
create policy "courses_write_admin_teacher"
on public.courses
for insert
to authenticated
with check (
  public.current_user_role() = 'admin'::public.user_role
  or (
    public.current_user_role() = 'teacher'::public.user_role
    and teacher_id = (select auth.uid())
  )
);

drop policy if exists "courses_update_admin_teacher" on public.courses;
create policy "courses_update_admin_teacher"
on public.courses
for update
to authenticated
using (
  public.current_user_role() = 'admin'::public.user_role
  or (
    public.current_user_role() = 'teacher'::public.user_role
    and teacher_id = (select auth.uid())
  )
)
with check (
  public.current_user_role() = 'admin'::public.user_role
  or (
    public.current_user_role() = 'teacher'::public.user_role
    and teacher_id = (select auth.uid())
  )
);

-- Enrollments
drop policy if exists "enrollments_select" on public.enrollments;
create policy "enrollments_select"
on public.enrollments
for select
to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1
    from public.courses c
    where c.id = course_id
      and c.teacher_id = (select auth.uid())
  )
  or public.current_user_role() = 'admin'::public.user_role
);

-- Course Grades
drop policy if exists "course_grades_select" on public.course_grades;
create policy "course_grades_select"
on public.course_grades
for select
to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1
    from public.courses c
    where c.id = course_id
      and c.teacher_id = (select auth.uid())
  )
  or public.current_user_role() = 'admin'::public.user_role
);

-- Chat Threads
drop policy if exists "chat_threads_select_owner" on public.chat_threads;
create policy "chat_threads_select_owner"
on public.chat_threads
for select
to authenticated
using (
  student_id = (select auth.uid())
  or public.current_user_role() = 'admin'::public.user_role
  or (
    public.current_user_role() = 'teacher'::public.user_role
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
to authenticated
with check (student_id = (select auth.uid()));

-- Chat Messages
drop policy if exists "chat_messages_select_owner" on public.chat_messages;
create policy "chat_messages_select_owner"
on public.chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.chat_threads t
    where t.id = thread_id
      and (
        t.student_id = (select auth.uid())
        or public.current_user_role() = 'admin'::public.user_role
        or (
          public.current_user_role() = 'teacher'::public.user_role
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
to authenticated
with check (
  exists (
    select 1
    from public.chat_threads t
    where t.id = thread_id
      and t.student_id = (select auth.uid())
  )
);

-- ============================================================================
-- 3. Stored Procedure for Single Round-Trip Teacher Dashboard Data
-- ============================================================================
create or replace function public.get_teacher_dashboard_data(p_teacher_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'courses', coalesce(jsonb_agg(c_data.course_json), '[]'::jsonb)
  )
  into result
  from (
    select jsonb_build_object(
      'id', c.id,
      'title', c.title,
      'description', c.description,
      'subject', c.subject,
      'grade_level', c.grade_level,
      'teacher_id', c.teacher_id,
      'is_active', c.is_active,
      'records', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'student_id', p.id,
              'student_name', coalesce(p.full_name, p.email),
              'student_email', p.email,
              'course_id', c.id,
              'course_title', c.title,
              'course_subject', c.subject,
              'course_grade_level', c.grade_level,
              'note_1', cg.note_1,
              'note_2', cg.note_2,
              'note_3', cg.note_3,
              'final_grade', cg.final_grade,
              'attendance', null
            )
          )
          from public.enrollments e
          join public.profiles p on e.student_id = p.id
          left join public.course_grades cg on cg.course_id = c.id and cg.student_id = p.id
          where e.course_id = c.id
        ),
        '[]'::jsonb
      )
    ) as course_json
    from public.courses c
    where c.teacher_id = p_teacher_id or public.current_user_role() = 'admin'::public.user_role
  ) c_data;

  return coalesce(result, '{"courses":[]}'::jsonb);
end;
$$;
