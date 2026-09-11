-- Optimize current_user_role function to read from JWT first, and fallback to auth.users (avoids recursion and timeouts on RLS)
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

-- Fix chat threads and messages RLS policies to allow:
-- 1. Administrators to view chats of all other users.
-- 2. Teachers to view chats of students sharing their assigned courses.

-- Drop old policies
drop policy if exists "chat_threads_select_owner" on public.chat_threads;
drop policy if exists "chat_messages_select_owner" on public.chat_messages;

-- Recreate chat_threads select policy
create policy "chat_threads_select_owner"
on public.chat_threads
for select
using (
  student_id = auth.uid()
  or public.current_user_role() = 'admin'::public.user_role
  or (
    public.current_user_role() = 'teacher'::public.user_role
    and exists (
      select 1
      from public.enrollments e
      join public.courses c on e.course_id = c.id
      where e.student_id = chat_threads.student_id
        and c.teacher_id = auth.uid()
    )
  )
);

-- Recreate chat_messages select policy
create policy "chat_messages_select_owner"
on public.chat_messages
for select
using (
  exists (
    select 1
    from public.chat_threads t
    where t.id = thread_id
      and (
        t.student_id = auth.uid()
        or public.current_user_role() = 'admin'::public.user_role
        or (
          public.current_user_role() = 'teacher'::public.user_role
          and exists (
            select 1
            from public.enrollments e
            join public.courses c on e.course_id = c.id
            where e.student_id = t.student_id
              and c.teacher_id = auth.uid()
          )
        )
      )
  )
);
