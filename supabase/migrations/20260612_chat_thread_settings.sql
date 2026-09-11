alter table public.chat_threads
  add column if not exists provider text not null default 'profesor_1',
  add column if not exists tone text not null default 'claro',
  add column if not exists detail_level text not null default 'medio',
  add column if not exists focus text not null default 'matematicas',
  add column if not exists language text not null default 'espanol';

update public.chat_threads ct
set provider = coalesce(p.chat_provider, 'profesor_1')
from public.profiles p
where p.id = ct.student_id;
