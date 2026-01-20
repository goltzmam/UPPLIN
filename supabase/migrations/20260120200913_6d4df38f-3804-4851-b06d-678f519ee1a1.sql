-- Add slug field to organizer_accounts for custom usernames
ALTER TABLE public.organizer_accounts
ADD COLUMN slug text UNIQUE;

-- Create index for faster slug lookups
CREATE INDEX idx_organizer_accounts_slug ON public.organizer_accounts(slug);

-- Create function to generate slug from display_name
CREATE OR REPLACE FUNCTION public.generate_organizer_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Generate base slug from display_name
  base_slug := lower(regexp_replace(NEW.display_name, '[^a-zA-Z0-9]', '', 'g'));
  
  -- If slug is not provided, generate one
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    final_slug := base_slug;
    
    -- Check for uniqueness and add counter if needed
    WHILE EXISTS (SELECT 1 FROM organizer_accounts WHERE slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || counter::text;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate slug
CREATE TRIGGER generate_organizer_slug_trigger
BEFORE INSERT OR UPDATE ON public.organizer_accounts
FOR EACH ROW
EXECUTE FUNCTION public.generate_organizer_slug();