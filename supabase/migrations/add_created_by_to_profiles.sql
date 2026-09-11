-- Add created_by column to profiles table
-- This column tracks which teacher created each student account

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_created_by_idx ON public.profiles(created_by);
