-- Restrict coupon code exposure to signed-in users only
DROP POLICY IF EXISTS "Anyone can view active coupons for published events" ON public.coupons;

CREATE POLICY "Authenticated users can view active coupons for checkout"
ON public.coupons
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (valid_from IS NULL OR valid_from <= now())
  AND (valid_until IS NULL OR valid_until > now())
  AND (usage_limit IS NULL OR usage_count < usage_limit)
);

-- Restrict follow relationship enumeration
DROP POLICY IF EXISTS "Users can view follows" ON public.follows;

CREATE POLICY "Users can view relevant follows"
ON public.follows
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.organizer_accounts oa
    WHERE oa.id = follows.organizer_id
      AND oa.owner_user_id = auth.uid()
  )
);

-- Authorize realtime channel subscriptions for private topics
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive authorized realtime topics" ON realtime.messages;
CREATE POLICY "Authenticated users can receive authorized realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension = 'postgres_changes'
  AND (
    -- Private chat topics
    realtime.topic() LIKE 'messages:%'
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id::text = split_part(realtime.topic(), ':', 2)
        AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
    OR
    -- Organizer follower count topics
    realtime.topic() LIKE 'organizer-followers-%'
    AND EXISTS (
      SELECT 1
      FROM public.organizer_accounts oa
      WHERE oa.id::text = replace(realtime.topic(), 'organizer-followers-', '')
        AND oa.owner_user_id = auth.uid()
    )
    OR
    -- Organizer check-in desk topics
    realtime.topic() LIKE 'checkin-tickets-%'
    AND EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id::text = replace(realtime.topic(), 'checkin-tickets-', '')
        AND public.is_organizer_owner(auth.uid(), e.organizer_id)
    )
    OR
    -- Collaborator scanner topics
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
    OR
    -- Admin monitoring topic
    realtime.topic() = 'admin-all-messages'
    AND public.has_role(auth.uid(), 'admin')
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
    realtime.topic() LIKE 'messages:%'
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id::text = split_part(realtime.topic(), ':', 2)
        AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
    OR realtime.topic() = 'admin-all-messages' AND public.has_role(auth.uid(), 'admin')
    OR realtime.topic() LIKE 'organizer-followers-%'
      AND EXISTS (
        SELECT 1
        FROM public.organizer_accounts oa
        WHERE oa.id::text = replace(realtime.topic(), 'organizer-followers-', '')
          AND oa.owner_user_id = auth.uid()
      )
    OR realtime.topic() LIKE 'checkin-tickets-%'
      AND EXISTS (
        SELECT 1
        FROM public.events e
        WHERE e.id::text = replace(realtime.topic(), 'checkin-tickets-', '')
          AND public.is_organizer_owner(auth.uid(), e.organizer_id)
      )
    OR realtime.topic() LIKE 'collab-scan-%'
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
);