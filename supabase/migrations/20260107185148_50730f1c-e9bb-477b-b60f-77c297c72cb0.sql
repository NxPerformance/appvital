-- Create bioimpedance_records table for storing user bioimpedance exam data
CREATE TABLE public.bioimpedance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Composição Corporal
  weight_kg NUMERIC,
  body_fat_percent NUMERIC,
  muscle_percent NUMERIC,
  water_percent NUMERIC,
  visceral_fat NUMERIC,
  subcutaneous_fat_percent NUMERIC,
  fat_free_mass_kg NUMERIC,
  protein_percent NUMERIC,
  bone_mass_kg NUMERIC,
  muscle_mass_kg NUMERIC,
  
  -- Análise de Obesidade
  bmi NUMERIC,
  fat_weight_kg NUMERIC,
  waist_hip_ratio NUMERIC,
  bmr_kcal INTEGER,
  
  -- Recomendações
  ideal_weight_kg NUMERIC,
  weight_control_tip NUMERIC,
  fat_control_tip NUMERIC,
  muscle_control_tip NUMERIC,
  daily_calories INTEGER,
  
  -- Medidas Corporais
  waist_cm NUMERIC,
  hip_cm NUMERIC,
  arm_cm NUMERIC,
  thigh_cm NUMERIC,
  
  -- Avaliação Postural
  shoulder_imbalance_cm NUMERIC,
  spine_curvature_cm NUMERIC,
  head_tilt_degrees NUMERIC,
  trunk_curvature_degrees NUMERIC,
  pelvis_tilt_degrees NUMERIC,
  head_forward_degrees NUMERIC,
  
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.bioimpedance_records ENABLE ROW LEVEL SECURITY;

-- Users can only view their own records
CREATE POLICY "Users can view their own bioimpedance records"
  ON public.bioimpedance_records
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service_role can insert (Vitalissy team)
-- No INSERT policy for authenticated users

-- Create index for faster queries
CREATE INDEX idx_bioimpedance_user_date ON public.bioimpedance_records(user_id, date DESC);