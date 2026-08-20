-- Create injectables table
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

-- Enable Row Level Security
ALTER TABLE public.injectables ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own injectables" 
ON public.injectables 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own injectables" 
ON public.injectables 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own injectables" 
ON public.injectables 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own injectables" 
ON public.injectables 
FOR DELETE 
USING (auth.uid() = user_id);