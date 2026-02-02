
-- Add admin role to estefaniomelo@gmail.com (existing user)
INSERT INTO public.user_roles (user_id, role)
SELECT '7b06845e-2a5b-44f2-b8bd-2700c81aaea2', 'admin'::app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '7b06845e-2a5b-44f2-b8bd-2700c81aaea2' AND role = 'admin'
);
