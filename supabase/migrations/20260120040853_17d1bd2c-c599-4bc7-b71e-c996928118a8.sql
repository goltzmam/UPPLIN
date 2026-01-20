-- Fix RLS policy: remove duplicate SELECT policy and keep only the one that allows public counting
DROP POLICY IF EXISTS "Anyone can count followers" ON public.follows;
DROP POLICY IF EXISTS "Users can view their own follows" ON public.follows;

-- Allow users to view their own follows and anyone to count (for public profiles)
CREATE POLICY "Users can view follows"
ON public.follows
FOR SELECT
USING (true);