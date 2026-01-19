import { z } from "zod";

// UUID Validation (reusable)
const UUIDSchema = z.string().uuid("Invalid UUID format");

// Optional Measurement Override
const MeasurementOverrideSchema = z.object({
  og: z.number().min(1.0).max(1.2).optional(),
  fg: z.number().min(0.99).max(1.1).optional(),
  volume: z.number().min(0.1).max(10000).optional(), // Liters
  abv: z.number().min(0).max(20).optional(), // Alcohol by Volume %
}).optional();

// Quick Session Creation Input
export const QuickSessionCreateSchema = z.object({
  brewId: UUIDSchema,
  breweryId: UUIDSchema,
  brewedAt: z.string().date().optional(), // ISO Date String
  measurements: MeasurementOverrideSchema,
  batchCode: z.string().min(1).max(50).optional(),
  notes: z.string().max(5000).optional(),
});

export type QuickSessionCreateInput = z.infer<typeof QuickSessionCreateSchema>;

// Validation Error Helper
export function formatZodError(error: z.ZodError): string {
  return (error as any).errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
}
