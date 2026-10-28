-- Keep presence private through application-table RLS, without changing any
-- platform-owned Realtime tables or using public Broadcast channels.
CREATE TABLE IF NOT EXISTS public.chat_presence (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  online_until timestamptz NOT NULL DEFAULT now(),
  typing_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
ALTER TABLE public.chat_presence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_presence FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.chat_presence TO authenticated;
GRANT ALL ON public.chat_presence TO service_role;
CREATE POLICY "Conversation members read presence" ON public.chat_presence
FOR SELECT TO authenticated USING (EXISTS (
  SELECT 1 FROM public.conversations c WHERE c.id = conversation_id
  AND auth.uid() IN (c.participant_1_id, c.participant_2_id)
));

CREATE OR REPLACE FUNCTION public.set_chat_presence(
  p_conversation_id uuid, p_typing boolean DEFAULT false, p_online boolean DEFAULT true
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.conversations c WHERE c.id = p_conversation_id
    AND uid IN (c.participant_1_id, c.participant_2_id)
  ) THEN RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.chat_presence(conversation_id,user_id,online_until,typing_until,updated_at)
  VALUES (p_conversation_id,uid,
    CASE WHEN p_online THEN now()+interval '25 seconds' ELSE now() END,
    CASE WHEN p_online AND p_typing THEN now()+interval '3 seconds' ELSE NULL END,now())
  ON CONFLICT (conversation_id,user_id) DO UPDATE SET
    online_until=EXCLUDED.online_until, typing_until=EXCLUDED.typing_until, updated_at=EXCLUDED.updated_at;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_chat_presence(uuid,boolean,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_chat_presence(uuid,boolean,boolean) TO authenticated;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='chat_presence') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_presence;
  END IF;
END $$;
