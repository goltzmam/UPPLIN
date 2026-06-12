
DROP TABLE IF EXISTS public.email_campaign_recipients CASCADE;
DROP TABLE IF EXISTS public.email_campaigns CASCADE;
DROP TABLE IF EXISTS public.email_audiences CASCADE;
DROP TABLE IF EXISTS public.email_marketing_unsubscribes CASCADE;
DROP TABLE IF EXISTS public.admin_invites CASCADE;

DROP FUNCTION IF EXISTS public.accept_admin_invite(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.compute_audience(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.increment_campaign_counter(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.assign_conversation(uuid, text, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.has_any_role(uuid, app_role[]) CASCADE;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS marketing_opt_in;
ALTER TABLE public.conversations DROP COLUMN IF EXISTS status;
ALTER TABLE public.conversations DROP COLUMN IF EXISTS assigned_to;

DELETE FROM public.user_roles WHERE role IN ('marketing','support');
