-- Store the preferred chat provider for each user profile.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS chat_provider text NOT NULL DEFAULT 'profesor_1';
