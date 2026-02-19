import { z } from "zod";

export const bottleSchema = z.object({
  id: z.string().uuid().optional(),
  brewery_id: z.string().uuid("Ungültige Brauerei-ID"),
  brew_id: z.string().uuid("Ungültiges Rezept").optional().nullable(),
  size_l: z.number().min(0.1, "Größe muss mindestens 0.1L sein").max(50, "Größe darf maximal 50L sein").optional().default(0.33),
});

export const createBottleBatchSchema = z.object({
  brewery_id: z.string().uuid("Ungültige Brauerei-ID"),
  amount: z.number().int().min(1, "Mindestens 1 Flasche").max(100, "Maximal 100 Flaschen auf einmal"),
  size_l: z.number().min(0.1).max(50).optional().default(0.33),
});

export const updateBottleSchema = z.object({
  bottle_id: z.string().uuid(),
  brew_id: z.string().uuid().optional().nullable(),
  size_l: z.number().optional()
});

export const batchUpdateSchema = z.object({
    bottle_ids: z.array(z.string().uuid()),
    brew_id: z.string().uuid().optional().nullable(),
    brewery_id: z.string().uuid()
});

export type BottleInput = z.infer<typeof bottleSchema>;
export type BatchInput = z.infer<typeof createBottleBatchSchema>;
export type UpdateBottleInput = z.infer<typeof updateBottleSchema>;
export type BatchUpdateInput = z.infer<typeof batchUpdateSchema>;
