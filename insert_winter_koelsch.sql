INSERT INTO public.brews (
  name,
  style,
  brew_type,
  description,
  is_public,
  user_id,
  brewery_id,
  data
) VALUES (
  'Kölner Wintermärchen',
  'Winter Kölsch',
  'beer',
  'Ein festliches, etwas kräftigeres Kölsch für die kalte Jahreszeit. Der Anteil an Wiener Malz verleiht ihm eine leuchtend goldene Farbe und einen Hauch von brotiger Malzigkeit, ohne die typische Spritzigkeit zu verlieren. Mit 5,4% Alkohol wärmt es leicht, bleibt aber gefährlich süffig. Perfekt klar filtriert oder als naturtrübes "Wiess" genießbar.',
  true,
  '6ac6b581-9ee6-45f4-9cb3-2fc8c3f4a9cc',
  'c7f0ceef-ad5a-422f-83b3-22c791bbe52e',
  '{
    "abv": 5.4,
    "ibu": 26,
    "og": 12.5,
    "fg": 2.5,
    "color": 10,
    "batch_size_liters": 20,
    "boil_time": 60,
    "mash_temp": 65,
    "malts": [
      { "name": "Pilsner Malz", "amount": "3.8 kg" },
      { "name": "Wiener Malz", "amount": "0.8 kg" },
      { "name": "Weizenmalz hell", "amount": "0.4 kg" }
    ],
    "hops": [
      { "name": "Hallertauer Mittelfrüh", "amount": "30g (60min)" },
      { "name": "Hallertauer Mittelfrüh", "amount": "15g (10min)" }
    ],
    "yeast": "Lallemand Köln (LalBrew) oder Fermentis K-97",
    "steps": [
      { "instruction": "### Einmaischen\nHauptguss (18L) auf 60°C erwärmen. Malz einrühren. \nDie Temperatur sollte sich bei **57°C** einpendeln. 10 Minuten Rast (Eiweißrast)." },
      { "instruction": "### Maltoserast\nErhitzen auf **65°C**.\n45 Minuten halten. Hier entstehen die vergärbaren Zucker." },
      { "instruction": "### Verzuckerung\nErhitzen auf **72°C**.\n20 Minuten halten. Jodprobe machen." },
      { "instruction": "### Kochen\nWürze 60 Minuten sprudelnd kochen.\n- **60 min:** Gib 30g Hallertauer Mittelfrüh hinzu.\n- **10 min:** Gib die restlichen 15g Hallertauer hinzu." },
      { "instruction": "### Gärung\nAuf **16°C – 18°C** abkühlen.\nHefe rehydrieren und zugeben.\nHauptgärung ca. 5-7 Tage." },
      { "instruction": "### Cold Crash\nNach der Gärung für **2-4 Wochen** bei 0°C-4°C lagern für den typischen, klaren Kölsch-Geschmack." }
    ]
  }'::jsonb
);