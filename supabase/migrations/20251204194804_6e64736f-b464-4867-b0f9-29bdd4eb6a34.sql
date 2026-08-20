-- Create achievements table
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on achievements (public read access)
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Anyone can read achievements
CREATE POLICY "Achievements are viewable by everyone"
ON public.achievements
FOR SELECT
USING (true);

-- Create user_achievements table
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

-- Enable RLS on user_achievements
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Users can view their own achievements
CREATE POLICY "Users can view their own achievements"
ON public.user_achievements
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own achievements
CREATE POLICY "Users can insert their own achievements"
ON public.user_achievements
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Insert the first achievement
INSERT INTO public.achievements (name, description, icon, sort_order)
VALUES ('Mudança de Vida', 'Você iniciou sua jornada de transformação.', '🌟', 1);

-- Insert placeholder achievements for future use
INSERT INTO public.achievements (name, description, icon, sort_order) VALUES
('Primeira Semana', 'Completou sua primeira semana de treino.', '💪', 2),
('Consistência', 'Treinou 4 semanas seguidas.', '🔥', 3),
('Evolução Visível', 'Registrou sua primeira bioimpedância.', '📊', 4),
('Dedicação Total', 'Completou 30 treinos.', '🏆', 5);