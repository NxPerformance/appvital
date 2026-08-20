-- Add entry_date column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN entry_date date DEFAULT CURRENT_DATE;

-- Update existing profiles that don't have an entry_date to use their created_at date
UPDATE public.profiles 
SET entry_date = DATE(created_at) 
WHERE entry_date IS NULL;