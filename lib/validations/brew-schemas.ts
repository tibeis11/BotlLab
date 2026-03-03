import { z } from "zod";

export const brewSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100, "Name darf maximal 100 Zeichen lang sein"),
  style: z.string().max(100, "Stil darf maximal 100 Zeichen lang sein").optional().nullable(),
  brew_type: z.string().max(50, "Brauart darf maximal 50 Zeichen lang sein").optional().nullable(),
  description: z.string().max(2000, "Beschreibung darf maximal 2000 Zeichen lang sein").optional().nullable(),
  // Allow relative paths (starts with /) and empty strings, or valid URLs. 
  // Zod's .url() is too strict for internal paths or placeholders.
  image_url: z.string().optional().nullable(),
  cap_url: z.string().optional().nullable(),
  is_public: z.boolean().default(false),
  brewery_id: z.string().uuid("Ungültige Brauerei-ID"),
  data: z.record(z.string(), z.any()).optional().nullable(),
  flavor_profile: z.object({
    sweetness: z.number().min(0).max(1),
    bitterness: z.number().min(0).max(1),
    body: z.number().min(0).max(1),
    roast: z.number().min(0).max(1),
    fruitiness: z.number().min(0).max(1),
    source: z.enum(['manual', 'data_suggestion', 'botlguide']),
  }).optional().nullable(),
});

export type BrewInput = z.infer<typeof brewSchema>;
