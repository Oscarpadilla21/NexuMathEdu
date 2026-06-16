alter table public.chat_threads
  add column if not exists topic text not null default 'general';
