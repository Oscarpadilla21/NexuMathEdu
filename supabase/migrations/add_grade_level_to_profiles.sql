-- Add grade_level column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS grade_level text;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_grade_level_idx ON public.profiles(grade_level);
