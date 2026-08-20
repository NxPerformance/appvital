-- Rode este script uma vez, depois que a migration de admin for aplicada.
-- Substitua o UUID abaixo pelo id real do usuário que deve ser o primeiro admin.

INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000000', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
