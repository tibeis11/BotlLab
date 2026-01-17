-- Add size_l column to bottles table
alter table bottles add column if not exists size_l float;

-- Optional: Update existing rows to a default if needed, or leave null
-- update bottles set size_l = 0.5 where size_l is null;
