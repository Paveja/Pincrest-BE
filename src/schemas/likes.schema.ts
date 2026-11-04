import { z } from "zod";

export const likeListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type LikeListQuery = z.infer<typeof likeListQuerySchema>;
