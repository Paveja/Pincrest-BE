import { z } from "zod";

const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^c[a-z0-9]{24}$/);
const commentContentSchema = z.string().trim().min(1).max(2000);

export const pinCommentsParamsSchema = z.object({
  pinId: idSchema,
});

export const commentParamsSchema = z.object({
  commentId: idSchema,
});

export const createCommentSchema = z
  .object({
    content: commentContentSchema,
  })
  .strict();

export const updateCommentSchema = z
  .object({
    content: commentContentSchema,
  })
  .strict();

export const commentListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CommentListQuery = z.infer<typeof commentListQuerySchema>;
