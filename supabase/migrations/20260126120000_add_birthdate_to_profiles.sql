-- Migration: Add birthdate to profiles
-- Adds a nullable `birthdate` column of type `date` to public.profiles

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS birthdate date;

COMMENT ON COLUMN public.profiles.birthdate IS 'User birthdate (nullable). Stored as date.';

-- NOTE: Do NOT add a strict CHECK constraint here if you have existing users
-- with unknown/invalid birthdates. If you want to enforce age >=18 at the DB
-- level, consider running a backfill and then adding a CHECK constraint.
