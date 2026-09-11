-- Ensure grade fields exist on profiles for admin user updates
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS grade_level text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS assigned_grade_levels text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS profiles_grade_level_idx ON public.profiles(grade_level);
CREATE INDEX IF NOT EXISTS profiles_assigned_grade_levels_idx ON public.profiles USING gin (assigned_grade_levels);