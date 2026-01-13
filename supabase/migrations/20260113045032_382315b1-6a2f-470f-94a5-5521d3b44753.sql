-- Fix RLS: Add policies to block anonymous access to sensitive tables

-- Profiles: Require authentication for any access
CREATE POLICY "Block anonymous access to profiles"
  ON public.profiles FOR SELECT
  TO anon
  USING (false);

-- CPF Change Requests: Block anonymous access
CREATE POLICY "Block anonymous access to cpf requests"
  ON public.cpf_change_requests FOR SELECT
  TO anon
  USING (false);