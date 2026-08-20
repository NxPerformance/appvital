-- =====================================================
-- ADMIN BACKEND FOUNDATION
-- - user_roles + helpers
-- - appointments admin fields
-- - admin RLS policies
-- - avatar storage bucket
-- - admin RPC for user deletion
-- =====================================================

-- -----------------------------------------------------
-- 1. Roles
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT user_roles_role_check CHECK (role IN ('admin')),
  CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- -----------------------------------------------------
-- 2. Appointments schema alignment
-- -----------------------------------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS scheduled_date date NULL,
  ADD COLUMN IF NOT EXISTS scheduled_time time NULL,
  ADD COLUMN IF NOT EXISTS admin_notes text NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON public.appointments(scheduled_date);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointments_status_check'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_status_check
      CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointments_type_check'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_type_check
      CHECK (type IN ('consulta_online', 'consulta_presencial', 'bioimpedancia'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_appointments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON public.appointments;
CREATE TRIGGER trg_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.set_appointments_updated_at();

DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;
CREATE POLICY "Users can update their own appointments"
ON public.appointments
FOR UPDATE
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Users can delete their own appointments" ON public.appointments;
CREATE POLICY "Users can delete their own appointments"
ON public.appointments
FOR DELETE
USING (user_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
CREATE POLICY "Admins can view all appointments"
ON public.appointments
FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all appointments" ON public.appointments;
CREATE POLICY "Admins can update all appointments"
ON public.appointments
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete all appointments" ON public.appointments;
CREATE POLICY "Admins can delete all appointments"
ON public.appointments
FOR DELETE
USING (public.is_admin());

-- -----------------------------------------------------
-- 3. Admin access to profiles
-- -----------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (public.is_admin());

-- -----------------------------------------------------
-- 4. Admin access to bioimpedance
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all bioimpedance records" ON public.bioimpedance_records;
CREATE POLICY "Admins can view all bioimpedance records"
ON public.bioimpedance_records
FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert bioimpedance records" ON public.bioimpedance_records;
CREATE POLICY "Admins can insert bioimpedance records"
ON public.bioimpedance_records
FOR INSERT
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update bioimpedance records" ON public.bioimpedance_records;
CREATE POLICY "Admins can update bioimpedance records"
ON public.bioimpedance_records
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete bioimpedance records" ON public.bioimpedance_records;
CREATE POLICY "Admins can delete bioimpedance records"
ON public.bioimpedance_records
FOR DELETE
USING (public.is_admin());

-- -----------------------------------------------------
-- 5. Avatar storage bucket
-- -----------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;
CREATE POLICY "Public can read avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- -----------------------------------------------------
-- 6. Admin RPCs
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Admins cannot delete their own account';
  END IF;

  DELETE FROM public.user_achievements WHERE user_id = target_user_id;
  DELETE FROM public.bioimpedance_records WHERE user_id = target_user_id;
  DELETE FROM public.cardio_workouts WHERE user_id = target_user_id;
  DELETE FROM public.workouts WHERE user_id = target_user_id;
  DELETE FROM public.injectables WHERE user_id = target_user_id;
  DELETE FROM public.appointments WHERE user_id = target_user_id;
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
