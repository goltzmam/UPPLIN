CREATE OR REPLACE FUNCTION public.guard_blocked_chat() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a uuid;b uuid;
BEGIN
 IF coalesce(auth.role(),'') IN('','service_role') OR public.has_role(auth.uid(),'admin') THEN RETURN NEW;END IF;
 IF TG_TABLE_NAME='messages' THEN SELECT participant_1_id,participant_2_id INTO a,b FROM public.conversations WHERE id=NEW.conversation_id;
 ELSE a:=NEW.participant_1_id;b:=NEW.participant_2_id;END IF;
 -- A restriction must never prevent contacting official support.
 IF public.has_role(a,'admin') OR public.has_role(b,'admin') THEN RETURN NEW;END IF;
 IF EXISTS(SELECT 1 FROM public.user_blocks WHERE (blocker_id=a AND blocked_id=b) OR (blocker_id=b AND blocked_id=a))
 OR EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND moderation_status='hidden') THEN
 RAISE EXCEPTION 'Não é possível conversar com este perfil.' USING ERRCODE='42501';END IF;
 RETURN NEW;
END $$;
