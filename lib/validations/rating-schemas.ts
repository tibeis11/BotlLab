import { z } from "zod";

export const ratingProfileSchema = z.object({
  taste_bitterness: z.number().min(1).max(10).optional(),
  taste_sweetness: z.number().min(1).max(10).optional(),
  taste_body: z.number().min(1).max(10).optional(),
  taste_carbonation: z.number().min(1).max(10).optional(),
  taste_acidity: z.number().min(1).max(10).optional(),
  flavor_tags: z.array(z.string()).max(8).optional(),
  appearance_color: z.enum(["pale", "amber", "dark"]).optional(),
  appearance_clarity: z.enum(["clear", "hazy", "opaque"]).optional(),
  aroma_intensity: z.number().min(1).max(10).optional(),
});

export const ratingSubmissionSchema = z
  .object({
    rating: z.number().min(1).max(5),
    author_name: z.string().min(1).max(50),
    comment: z.string().max(500).optional(),
  })
  .merge(ratingProfileSchema);
