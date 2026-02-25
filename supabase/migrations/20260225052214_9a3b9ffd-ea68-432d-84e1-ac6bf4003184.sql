
-- 1. Create atomic increment function to prevent race conditions in ticket sales
CREATE OR REPLACE FUNCTION public.increment_quantity_sold(
  p_ticket_type_id UUID,
  p_increment_by INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ticket_types
  SET quantity_sold = COALESCE(quantity_sold, 0) + p_increment_by
  WHERE id = p_ticket_type_id
    AND COALESCE(quantity_sold, 0) + p_increment_by <= quantity_total
    AND status = 'active';
  
  RETURN FOUND;
END;
$$;

-- 2. Add database constraint to prevent overselling
ALTER TABLE ticket_types 
ADD CONSTRAINT check_quantity_sold_bounds 
CHECK (COALESCE(quantity_sold, 0) >= 0 AND COALESCE(quantity_sold, 0) <= quantity_total);
