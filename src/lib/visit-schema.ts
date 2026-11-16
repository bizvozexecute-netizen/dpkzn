import { z } from "zod";

export const visitSchema = z.object({
  id: z.string().uuid(), landing: z.string().max(400).regex(/^\/(?!\/)[^?#\s]*$/),
  source: z.string().trim().min(1).max(120), medium: z.string().max(120), campaign: z.string().max(120),
});

