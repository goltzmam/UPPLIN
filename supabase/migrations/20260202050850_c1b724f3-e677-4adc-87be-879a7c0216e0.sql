-- Preserve the legacy grant only when that verified identity exists.
-- A fresh project must provision its first administrator explicitly.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE id = '7b06845e-2a5b-44f2-b8bd-2700c81aaea2'
  AND email_confirmed_at IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;
