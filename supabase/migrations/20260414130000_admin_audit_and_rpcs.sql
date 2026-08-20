-- =====================================================
-- ADMIN AUDIT + SECURE RPCS
-- - audit log table
-- - audited admin RPCs
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON public.audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user_id ON public.audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action text,
  _entity_type text,
  _entity_id text,
  _target_user_id uuid,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    actor_user_id,
    target_user_id,
    action,
    entity_type,
    entity_id,
    details
  )
  VALUES (
    auth.uid(),
    _target_user_id,
    _action,
    _entity_type,
    _entity_id,
    COALESCE(_details, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  target_user_id uuid,
  target_role text,
  enable_role boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can manage roles';
  END IF;

  IF target_role <> 'admin' THEN
    RAISE EXCEPTION 'Unsupported role';
  END IF;

  IF target_user_id = auth.uid() AND enable_role = false THEN
    RAISE EXCEPTION 'Admins cannot remove their own admin role';
  END IF;

  IF enable_role THEN
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (target_user_id, target_role, auth.uid())
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = target_user_id
      AND role = target_role;
  END IF;

  PERFORM public.log_admin_action(
    CASE WHEN enable_role THEN 'grant_role' ELSE 'revoke_role' END,
    'user_role',
    target_user_id::text,
    target_user_id,
    jsonb_build_object('role', target_role, 'enabled', enable_role)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user_premium(
  target_user_id uuid,
  new_is_premium boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can update premium status';
  END IF;

  UPDATE public.profiles
  SET is_premium = new_is_premium
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  PERFORM public.log_admin_action(
    'update_premium',
    'profile',
    target_user_id::text,
    target_user_id,
    jsonb_build_object('is_premium', new_is_premium)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_appointment(
  appointment_id uuid,
  new_scheduled_date date DEFAULT NULL,
  new_scheduled_time time DEFAULT NULL,
  new_status text DEFAULT NULL,
  new_admin_notes text DEFAULT NULL
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_record public.appointments;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can update appointments';
  END IF;

  IF new_status IS NOT NULL
     AND new_status NOT IN ('pending', 'confirmed', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid appointment status';
  END IF;

  UPDATE public.appointments
  SET
    scheduled_date = new_scheduled_date,
    scheduled_time = new_scheduled_time,
    status = COALESCE(new_status, status),
    admin_notes = new_admin_notes
  WHERE id = appointment_id
  RETURNING * INTO updated_record;

  IF updated_record IS NULL THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  PERFORM public.log_admin_action(
    'update_appointment',
    'appointment',
    updated_record.id::text,
    updated_record.user_id,
    jsonb_build_object(
      'scheduled_date', updated_record.scheduled_date,
      'scheduled_time', updated_record.scheduled_time,
      'status', updated_record.status,
      'admin_notes', updated_record.admin_notes
    )
  );

  RETURN updated_record;
END;
$$;

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

  PERFORM public.log_admin_action(
    'delete_user',
    'user',
    target_user_id::text,
    target_user_id,
    '{}'::jsonb
  );

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
