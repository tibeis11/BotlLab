-- Add preferences column to brewery_members to store user specific settings per squad
ALTER TABLE brewery_members 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"notifications": {"email_new_brew": true, "email_new_rating": true, "email_new_message": true}}'::jsonb;
