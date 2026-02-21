-- ==========================================================
-- 🍺 RECIPE INSERT TEMPLATE: "Rauensteiner Blonde"
-- ==========================================================
-- Usage:
-- 1. Replace 'YOUR_USER_ID_HERE' with your actual User UUID.
-- 2. Replace 'YOUR_BREWERY_ID_HERE' with your Brewery UUID.
-- 3. Run in Supabase SQL Editor.
-- ==========================================================

INSERT INTO public.brews (
    user_id,
    brewery_id,
    name,
    style,
    brew_type,
    description,
    is_public,
    image_url,
    cap_url,
    data,
    created_at
) VALUES (
    'e26e7848-9165-4941-ad3e-f14b43bd98cd'::uuid,      -- ⚠️ Replace with 'a2e7b77d-...' 
    '13123cc6-f3ae-4217-9b92-2095a903ed18'::uuid,   -- ⚠️ Replace with Brewery ID
    'Rauensteiner Blonde',
    'Kölsch',
    'beer',
    'Sieht aus wie ein Kölsch, riecht wie ein Kölsch, schmeckt wie ein Kölsch, nur heißen darf es so nicht :-) Weniger herbes und mehr süffiges Kölsch.',
    true,
    NULL,
    '🍺',
    '{
      "abv": 5.0,
      "ibu": 32,
      "og": 12.5,
      "fg": 3.4,
      "color_ebc": 9,
      "carbonation_g_l": 5.5,
      "boil_time": 90,
      "boil_temp": 100,
      "mash_water_liters": 25,
      "sparge_water_liters": 6,
      "primary_temp": 13,
      "hops": [
        { "name": "Tettnanger", "amount": 30, "unit": "g", "usage": "First Wort", "time": "90", "alpha": "3.1" },
        { "name": "Tettnanger", "amount": 54, "unit": "g", "usage": "Boil", "time": "70", "alpha": "3.1" },
        { "name": "Tettnanger", "amount": 9, "unit": "g", "usage": "Boil", "time": "10", "alpha": "3.1" }
      ], 
      "malts": [
        { "name": "Pilsener Malz (Weyermann Bio)", "amount": 4.8, "unit": "kg", "color_ebc": "3" },
        { "name": "Weizenmalz hell (Weyermann Bio)", "amount": 0.55, "unit": "kg", "color_ebc": "4" },
        { "name": "Sauermalz", "amount": 0.12, "unit": "kg", "color_ebc": "4" }
      ],
      "yeast": [
        {
          "name": "Wyeast #2565 Kölsch",
          "attenuation": "73"
        }
      ],
      "mash_steps": [
        { "name": "Einmaischen", "temperature": "55", "duration": "0" },
        { "name": "Eiweißrast", "temperature": "55", "duration": "10" },
        { "name": "Maltoserast", "temperature": "63", "duration": "40" },
        { "name": "Verzuckerung", "temperature": "72", "duration": "15" },
        { "name": "Abmaischen", "temperature": "78", "duration": "0" }
      ],
      "steps": [
        { "title": "Läutern", "instruction": "Vorderwürze abziehen und Nachguss geben." },
        { "title": "Kochen", "instruction": "Würze 90 Minuten kochen. Tettnanger Gaben beachten (30g VHW, 54g @ 70min, 9g @ 10min)." },
        { "title": "Gärung", "instruction": "Gärtemperatur: 13°C. Hauptgärung ca. 9 Tage." },
        { "title": "Reifung", "instruction": "8 Wochen bei ca. 1°C lagern." }
      ]
    }'::jsonb,
    NOW()
)
RETURNING id;
