-- Add RLS policy to allow anyone to view active organizers (public profiles)
CREATE POLICY "Anyone can view active organizers" 
ON organizer_accounts 
FOR SELECT 
USING (status = 'active');