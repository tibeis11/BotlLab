-- Add custom_slogan to breweries table
ALTER TABLE public.breweries ADD COLUMN custom_slogan TEXT;

-- Move existing slogans from profiles to their respective breweries (where user is owner)
UPDATE public.breweries b
SET custom_slogan = p.custom_brewery_slogan
FROM public.brewery_members bm
JOIN public.profiles p ON bm.user_id = p.id
WHERE bm.brewery_id = b.id 
  AND bm.role = 'owner'
  AND p.custom_brewery_slogan IS NOT NULL;

COMMENT ON COLUMN public.breweries.custom_slogan IS 'Team-defined slogan for Smart Labels (Premium feature)';
