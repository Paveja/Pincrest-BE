import { z } from "zod";

export const searchQuerySchema = z
  .object({
    q: z.string().trim().max(200).default(""),
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type SearchQuery = z.infer<typeof searchQuerySchema>;
