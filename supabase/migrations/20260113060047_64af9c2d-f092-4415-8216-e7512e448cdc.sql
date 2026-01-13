-- Add additional organizer fields to organizer_accounts table
ALTER TABLE public.organizer_accounts 
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS social_instagram TEXT,
ADD COLUMN IF NOT EXISTS social_facebook TEXT,
ADD COLUMN IF NOT EXISTS social_website TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;