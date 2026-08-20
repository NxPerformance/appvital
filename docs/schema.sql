-- =====================================================
-- VITALISSY - SCHEMA SQL COMPLETO
-- Execute este script no seu Supabase self-hosted
-- =====================================================

-- =====================================================
-- 1. TABELA: profiles
-- =====================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT auth.uid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  age INTEGER NOT NULL,
  height_cm INTEGER NOT NULL,
  weight_kg NUMERIC NOT NULL,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  entry_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (id = auth.uid());

-- =====================================================
-- 2. TABELA: achievements
-- =====================================================
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements are viewable by everyone" 
  ON public.achievements FOR SELECT 
  USING (true);

-- Inserir conquistas iniciais
INSERT INTO public.achievements (name, description, icon, sort_order) VALUES
  ('Mudança de Vida', 'Você iniciou sua jornada de transformação', '🌟', 1),
  ('Primeiro Treino', 'Completou seu primeiro treino', '💪', 2),
  ('Semana Consistente', '7 dias de treino consecutivos', '🔥', 3),
  ('Mês de Ferro', '30 dias de treino no mês', '🏆', 4),
  ('Primeira Aplicação', 'Registrou sua primeira aplicação', '💉', 5);

-- =====================================================
-- 3. TABELA: user_achievements
-- =====================================================
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements" 
  ON public.user_achievements FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own achievements" 
  ON public.user_achievements FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 4. TABELA: appointments
-- =====================================================
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own appointments" 
  ON public.appointments FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own appointments" 
  ON public.appointments FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 5. TABELA: workouts
-- =====================================================
CREATE TABLE public.workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  objective TEXT NOT NULL,
  duration_min INTEGER,
  calories INTEGER,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workouts" 
  ON public.workouts FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own workouts" 
  ON public.workouts FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own workouts" 
  ON public.workouts FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own workouts" 
  ON public.workouts FOR DELETE 
  USING (user_id = auth.uid());

-- =====================================================
-- 6. TABELA: injectables
-- =====================================================
CREATE TABLE public.injectables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  medication TEXT NOT NULL,
  dose TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.injectables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own injectables" 
  ON public.injectables FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own injectables" 
  ON public.injectables FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own injectables" 
  ON public.injectables FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own injectables" 
  ON public.injectables FOR DELETE 
  USING (auth.uid() = user_id);

-- =====================================================
-- FIM DO SCHEMA
-- =====================================================
