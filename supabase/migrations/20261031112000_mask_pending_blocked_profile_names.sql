CREATE OR REPLACE FUNCTION public.my_blocked_users() RETURNS TABLE(user_id uuid,display_name text,created_at timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT b.blocked_id,CASE WHEN p.moderation_status='approved' THEN coalesce(nullif(p.full_name,''),'Usuário bloqueado') ELSE 'Usuário bloqueado' END,b.created_at
 FROM public.user_blocks b LEFT JOIN public.profiles p ON p.id=b.blocked_id WHERE blocker_id=auth.uid() ORDER BY b.created_at DESC;
$$;
