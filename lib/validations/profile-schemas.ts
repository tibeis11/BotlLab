import { z } from "zod";

export const profileUpdateSchema = z.object({
  display_name: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein").max(50, "Name darf maximal 50 Zeichen lang sein").optional().nullable(),
  bio: z.string().max(500, "Bio darf maximal 500 Zeichen lang sein").optional().nullable(),
  location: z.string().max(100, "Ort darf maximal 100 Zeichen lang sein").optional().nullable(),
  website: z.string().url("Ungültige URL").optional().nullable().or(z.literal("")),
  founded_year: z.number().int().min(1000).max(new Date().getFullYear()).optional().nullable(),
  birthdate: z.string().optional().nullable(), // ISO date string
  active_brewery_id: z.string().uuid().optional().nullable(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
