-- Add workout_type column to workouts table
ALTER TABLE public.workouts 
ADD COLUMN workout_type text DEFAULT 'academia';

-- Create cardio_workouts table for cardio activities
CREATE TABLE public.cardio_workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  workout_type TEXT NOT NULL, -- corrida, ciclismo, natacao
  duration_min NUMERIC,
  distance_km NUMERIC,
  calories INTEGER,
  avg_pace TEXT, -- pace médio para corrida/natação
  avg_speed NUMERIC, -- velocidade média para ciclismo
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cardio_workouts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cardio_workouts
CREATE POLICY "Users can view their own cardio workouts" 
ON public.cardio_workouts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cardio workouts" 
ON public.cardio_workouts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cardio workouts" 
ON public.cardio_workouts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cardio workouts" 
ON public.cardio_workouts 
FOR DELETE 
USING (auth.uid() = user_id);