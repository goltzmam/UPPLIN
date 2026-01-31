-- Add slug column to events table
ALTER TABLE public.events ADD COLUMN slug TEXT UNIQUE;

-- Create index for fast slug lookups
CREATE INDEX idx_events_slug ON public.events(slug);

-- Function to generate URL-friendly slug from title
CREATE OR REPLACE FUNCTION public.generate_event_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  random_code TEXT;
BEGIN
  -- Only generate if slug is null or title changed
  IF NEW.slug IS NULL OR (TG_OP = 'UPDATE' AND OLD.title != NEW.title AND NEW.slug = OLD.slug) THEN
    -- Convert title to URL-friendly slug
    -- Remove accents, lowercase, replace spaces with hyphens, remove special chars
    base_slug := lower(
      regexp_replace(
        regexp_replace(
          translate(
            NEW.title,
            'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
            'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
          ),
          '[^a-zA-Z0-9\s-]', '', 'g'
        ),
        '\s+', '-', 'g'
      )
    );
    
    -- Remove leading/trailing hyphens and multiple consecutive hyphens
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    
    -- Generate 4-digit random code
    random_code := lpad(floor(random() * 10000)::text, 4, '0');
    
    -- Combine slug with random code
    final_slug := base_slug || '-' || random_code;
    
    -- Check for uniqueness and regenerate if needed
    WHILE EXISTS (SELECT 1 FROM public.events WHERE slug = final_slug AND id != NEW.id) LOOP
      random_code := lpad(floor(random() * 10000)::text, 4, '0');
      final_slug := base_slug || '-' || random_code;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic slug generation
CREATE TRIGGER generate_event_slug_trigger
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.generate_event_slug();

-- Generate slugs for existing events
UPDATE public.events SET slug = NULL WHERE slug IS NULL;