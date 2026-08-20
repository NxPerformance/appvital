-- Create workouts table for daily workout logging
CREATE TABLE public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  objective text NOT NULL,
  duration_min integer,
  calories integer,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- Users can insert their own workouts
CREATE POLICY "Users can insert their own workouts"
ON public.workouts
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can view their own workouts
CREATE POLICY "Users can view their own workouts"
ON public.workouts
FOR SELECT
USING (user_id = auth.uid());

-- Users can update their own workouts
CREATE POLICY "Users can update their own workouts"
ON public.workouts
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own workouts
CREATE POLICY "Users can delete their own workouts"
ON public.workouts
FOR DELETE
USING (user_id = auth.uid());