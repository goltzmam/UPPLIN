-- Collaborator updates must be identifiable by Realtime, including revocation at deletion.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_index WHERE indrelid='public.checkin_collaborators'::regclass AND indisprimary) THEN
  IF EXISTS(SELECT id FROM public.checkin_collaborators GROUP BY id HAVING id IS NULL OR count(*)>1) THEN
   RAISE EXCEPTION 'Collaborator identifiers require review before adding a primary key';
  END IF;
  ALTER TABLE public.checkin_collaborators ADD CONSTRAINT checkin_collaborators_pkey PRIMARY KEY(id);
 END IF;
END $$;
