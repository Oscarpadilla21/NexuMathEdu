-- Migration: NexuMathEdu Full RLS & Foreign Key Performance Optimization
-- Date: 2026-09-11
-- Description: Applies Supabase Postgres best practices:
-- 1. Wraps auth.uid() and current_user_role() in scalar subqueries (select ...) to avoid per-row evaluation (5x-100x speedup).
-- 2. Creates missing B-Tree indexes on all foreign key columns to eliminate sequential scans on JOINs and cascading operations.

-- ============================================================================
-- 1. Foreign Key Performance Indexes
-- ============================================================================
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
-- 2. Optimized RLS Policies (Cached Scalar Subqueries)
-- ============================================================================

-- PROFILES
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

-- COURSES
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

-- ENROLLMENTS
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

-- ASSESSMENTS
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

-- GRADE RECORDS
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

-- COURSE GRADES
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

-- CHAT THREADS
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

-- CHAT MESSAGES
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
