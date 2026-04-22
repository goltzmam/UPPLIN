DROP POLICY IF EXISTS "Owners can view own organizer account" ON public.organizer_accounts;

DROP POLICY IF EXISTS "Owners can update own mp account" ON public.organizer_mp_accounts;
CREATE POLICY "Owners can update own mp account"
ON public.organizer_mp_accounts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organizer_accounts oa
    WHERE oa.id = organizer_mp_accounts.organizer_id
      AND oa.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organizer_accounts oa
    WHERE oa.id = organizer_mp_accounts.organizer_id
      AND oa.owner_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Anyone can view public RSVPs" ON public.event_rsvps;
CREATE POLICY "Authenticated users can view public RSVPs"
ON public.event_rsvps
FOR SELECT
TO authenticated
USING (is_public = true);

DROP POLICY IF EXISTS "Anyone can view event likes" ON public.event_likes;
CREATE POLICY "Authenticated users can view event likes"
ON public.event_likes
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can view active coupons for checkout" ON public.coupons;
CREATE POLICY "Organizers can view own coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organizer_accounts oa
    WHERE oa.id = coupons.organizer_id
      AND oa.owner_user_id = auth.uid()
  )
);

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
        SELECT 1 FROM public.conversations c
        WHERE c.id::text = split_part(realtime.topic(), ':', 2)
          AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
      )
    )
    OR (realtime.topic() = 'admin-all-messages' AND public.has_role(auth.uid(), 'admin'))
    OR (
      realtime.topic() LIKE 'organizer-followers-%'
      AND EXISTS (
        SELECT 1 FROM public.organizer_accounts oa
        WHERE oa.id::text = replace(realtime.topic(), 'organizer-followers-', '')
          AND oa.owner_user_id = auth.uid()
      )
    )
    OR (
      realtime.topic() LIKE 'checkin-tickets-%'
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id::text = replace(realtime.topic(), 'checkin-tickets-', '')
          AND public.is_organizer_owner(auth.uid(), e.organizer_id)
      )
    )
    OR (
      realtime.topic() LIKE 'collab-scan-%'
      AND EXISTS (
        SELECT 1 FROM public.checkin_collaborators cc
        WHERE cc.user_id = auth.uid()
          AND cc.status = 'active'
          AND (
            cc.event_id IS NULL
            OR cc.event_id::text = replace(realtime.topic(), 'collab-scan-', '')
          )
          AND EXISTS (
            SELECT 1 FROM public.events e
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
              SELECT 1 FROM public.follows f
              WHERE f.organizer_id = oa.id AND f.user_id = auth.uid()
            )
          )
      )
    )
    OR (
      realtime.topic() LIKE 'event-rsvps:%'
      AND auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id::text = split_part(realtime.topic(), ':', 2)
      )
    )
    OR (
      realtime.topic() LIKE 'event-likes:%'
      AND auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id::text = split_part(realtime.topic(), ':', 2)
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
        SELECT 1 FROM public.conversations c
        WHERE c.id::text = split_part(realtime.topic(), ':', 2)
          AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
      )
    )
    OR (realtime.topic() = 'admin-all-messages' AND public.has_role(auth.uid(), 'admin'))
    OR (
      realtime.topic() LIKE 'organizer-followers-%'
      AND EXISTS (
        SELECT 1 FROM public.organizer_accounts oa
        WHERE oa.id::text = replace(realtime.topic(), 'organizer-followers-', '')
          AND oa.owner_user_id = auth.uid()
      )
    )
    OR (
      realtime.topic() LIKE 'checkin-tickets-%'
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id::text = replace(realtime.topic(), 'checkin-tickets-', '')
          AND public.is_organizer_owner(auth.uid(), e.organizer_id)
      )
    )
    OR (
      realtime.topic() LIKE 'collab-scan-%'
      AND EXISTS (
        SELECT 1 FROM public.checkin_collaborators cc
        WHERE cc.user_id = auth.uid()
          AND cc.status = 'active'
          AND (
            cc.event_id IS NULL
            OR cc.event_id::text = replace(realtime.topic(), 'collab-scan-', '')
          )
          AND EXISTS (
            SELECT 1 FROM public.events e
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
              SELECT 1 FROM public.follows f
              WHERE f.organizer_id = oa.id AND f.user_id = auth.uid()
            )
          )
      )
    )
    OR (realtime.topic() LIKE 'event-rsvps:%' AND auth.uid() IS NOT NULL)
    OR (realtime.topic() LIKE 'event-likes:%' AND auth.uid() IS NOT NULL)
  )
);