-- Add suspension fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
ADD COLUMN IF NOT EXISTS suspended_by UUID;

-- Create admin action logs table for audit trail
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view and insert logs
CREATE POLICY "Admins can view all action logs"
ON public.admin_action_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert action logs"
ON public.admin_action_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_target ON public.admin_action_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created ON public.admin_action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Update existing profiles to have 'active' status
UPDATE public.profiles SET status = 'active' WHERE status IS NULL;