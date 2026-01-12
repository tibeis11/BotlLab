-- Add invite_code column to breweries table
ALTER TABLE breweries 
ADD COLUMN invite_code UUID DEFAULT gen_random_uuid();

-- Ensure unique constraint
CREATE UNIQUE INDEX breweries_invite_code_idx ON breweries (invite_code);

-- Make it not null after population (default handles population)
ALTER TABLE breweries 
ALTER COLUMN invite_code SET NOT NULL;
