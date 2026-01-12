-- Fix security warnings by enabling Row Level Security (RLS) on tables that have policies but no enforcement.

-- 1. Enable RLS for profiles
-- Policies already exist: "Anyone can create a profile", "Profiles are viewable by everyone", etc.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Enable RLS for breweries
-- Policies already exist: "Authenticated users can create breweries", "Mitglieder sehen ihre Brauerei", etc.
ALTER TABLE public.breweries ENABLE ROW LEVEL SECURITY;

-- 3. Enable RLS for brewery_members
-- Policies already exist: "Members can view their brewery members", etc.
ALTER TABLE public.brewery_members ENABLE ROW LEVEL SECURITY;
