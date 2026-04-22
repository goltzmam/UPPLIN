CREATE OR REPLACE VIEW public.organizer_accounts_public AS
SELECT
  id,
  display_name,
  slug,
  description,
  logo_url,
  social_instagram,
  social_facebook,
  social_website,
  status,
  city,
  state,
  created_at,
  updated_at
FROM public.organizer_accounts
WHERE status = 'active';

GRANT SELECT ON public.organizer_accounts_public TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view active organizers" ON public.organizer_accounts;
DROP POLICY IF EXISTS "Authenticated users can view active organizers" ON public.organizer_accounts;
DROP POLICY IF EXISTS "Users can view active organizers" ON public.organizer_accounts;
DROP POLICY IF EXISTS "Public can view active organizers" ON public.organizer_accounts;
DROP POLICY IF EXISTS "Owners and admins can view organizer accounts" ON public.organizer_accounts;

CREATE POLICY "Owners and admins can view organizer accounts"
ON public.organizer_accounts
FOR SELECT
TO authenticated
USING (
  owner_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive authorized realtime topics" ON realtime.messages;
CREATE POLICY "Authenticated users can receive authorized realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension = 'postgres_changes'
  AND (
    (
      realtime.topic() LIKE 'messages:%'
      AND EXISTS (
        SELECT 1
        FROM public.conversations c
        WHERE c.id::text = split_part(realtime.topic(), ':', 2)
          AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
      )
    )
    OR (
      realtime.topic() = 'admin-all-messages'
      AND public.has_role(auth.uid(), 'admin')
    )
    OR (
      realtime.topic() LIKE 'organizer-followers-%'
      AND EXISTS (
        SELECT 1
        FROM public.organizer_accounts oa
        WHERE oa.id::text = replace(realtime.topic(), 'organizer-followers-', '')
          AND oa.owner_user_id = auth.uid()
      )
    )
    OR (
      realtime.topic() LIKE 'checkin-tickets-%'
      AND EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id::text = replace(realtime.topic(), 'checkin-tickets-', '')
          AND public.is_organizer_owner(auth.uid(), e.organizer_id)
      )
    )
    OR (
      realtime.topic() LIKE 'collab-scan-%'
      AND EXISTS (
        SELECT 1
        FROM public.checkin_collaborators cc
        WHERE cc.user_id = auth.uid()
          AND cc.status = 'active'
          AND (
            cc.event_id IS NULL
            OR cc.event_id::text = replace(realtime.topic(), 'collab-scan-', '')
          )
          AND EXISTS (
            SELECT 1
            FROM public.events e
            WHERE e.id::text = replace(realtime.topic(), 'collab-scan-', '')
              AND e.organizer_id = cc.organizer_id
          )
      )
    )
    OR (
      realtime.topic() LIKE 'notifications:%'
      AND split_part(realtime.topic(), ':', 2) = auth.uid()::text
    )
    OR (
      realtime.topic() LIKE 'social-notifications:%'
      AND split_part(realtime.topic(), ':', 2) = auth.uid()::text
    )
    OR (
      realtime.topic() LIKE 'user-posts:%'
      AND (
        split_part(realtime.topic(), ':', 2) = auth.uid()::text
        OR EXISTS (
          SELECT 1
          FROM public.organizer_accounts oa
          JOIN public.follows f ON f.organizer_id = oa.id
          WHERE oa.owner_user_id::text = split_part(realtime.topic(), ':', 2)
            AND f.user_id = auth.uid()
        )
      )
    )
    OR (
      realtime.topic() LIKE 'follows:%'
      AND EXISTS (
        SELECT 1
        FROM public.organizer_accounts oa
        WHERE oa.id::text = split_part(realtime.topic(), ':', 2)
          AND (
            oa.owner_user_id = auth.uid()
            OR EXISTS (
              SELECT 1
              FROM public.follows f
              WHERE f.organizer_id = oa.id
                AND f.user_id = auth.uid()
            )
          )
      )
    )
    OR (
      realtime.topic() LIKE 'event-rsvps:%'
      AND EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id::text = split_part(realtime.topic(), ':', 2)
          AND (
            e.status = 'published'
            OR public.is_organizer_owner(auth.uid(), e.organizer_id)
          )
      )
    )
  )
);

DROP POLICY IF EXISTS "Authenticated users can send authorized realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated users can send authorized realtime messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  extension = 'postgres_changes'
  AND (
    (
      realtime.topic() LIKE 'messages:%'
      AND EXISTS (
        SELECT 1
        FROM public.conversations c
        WHERE c.id::text = split_part(realtime.topic(), ':', 2)
          AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
      )
    )
    OR (realtime.topic() = 'admin-all-messages' AND public.has_role(auth.uid(), 'admin'))
    OR (
      realtime.topic() LIKE 'organizer-followers-%'
      AND EXISTS (
        SELECT 1
        FROM public.organizer_accounts oa
        WHERE oa.id::text = replace(realtime.topic(), 'organizer-followers-', '')
          AND oa.owner_user_id = auth.uid()
      )
    )
    OR (
      realtime.topic() LIKE 'checkin-tickets-%'
      AND EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id::text = replace(realtime.topic(), 'checkin-tickets-', '')
          AND public.is_organizer_owner(auth.uid(), e.organizer_id)
      )
    )
    OR (
      realtime.topic() LIKE 'collab-scan-%'
      AND EXISTS (
        SELECT 1
        FROM public.checkin_collaborators cc
        WHERE cc.user_id = auth.uid()
          AND cc.status = 'active'
          AND (
            cc.event_id IS NULL
            OR cc.event_id::text = replace(realtime.topic(), 'collab-scan-', '')
          )
          AND EXISTS (
            SELECT 1
            FROM public.events e
            WHERE e.id::text = replace(realtime.topic(), 'collab-scan-', '')
              AND e.organizer_id = cc.organizer_id
          )
      )
    )
    OR (realtime.topic() LIKE 'notifications:%' AND split_part(realtime.topic(), ':', 2) = auth.uid()::text)
    OR (realtime.topic() LIKE 'social-notifications:%' AND split_part(realtime.topic(), ':', 2) = auth.uid()::text)
    OR (
      realtime.topic() LIKE 'user-posts:%'
      AND (
        split_part(realtime.topic(), ':', 2) = auth.uid()::text
        OR EXISTS (
          SELECT 1
          FROM public.organizer_accounts oa
          JOIN public.follows f ON f.organizer_id = oa.id
          WHERE oa.owner_user_id::text = split_part(realtime.topic(), ':', 2)
            AND f.user_id = auth.uid()
        )
      )
    )
    OR (
      realtime.topic() LIKE 'follows:%'
      AND EXISTS (
        SELECT 1
        FROM public.organizer_accounts oa
        WHERE oa.id::text = split_part(realtime.topic(), ':', 2)
          AND (
            oa.owner_user_id = auth.uid()
            OR EXISTS (
              SELECT 1
              FROM public.follows f
              WHERE f.organizer_id = oa.id
                AND f.user_id = auth.uid()
            )
          )
      )
    )
    OR (
      realtime.topic() LIKE 'event-rsvps:%'
      AND EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id::text = split_part(realtime.topic(), ':', 2)
          AND (
            e.status = 'published'
            OR public.is_organizer_owner(auth.uid(), e.organizer_id)
          )
      )
    )
  )
);