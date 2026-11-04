import { z } from "zod";

const idSchema = z.string().trim().min(1).max(128);

export const boardParamsSchema = z.object({
  boardId: idSchema,
});

export const boardPinParamsSchema = z.object({
  boardId: idSchema,
  pinId: idSchema,
});

export const saveBoardPinSchema = z
  .object({
    pinId: idSchema,
  })
  .strict();

export const getBoardPinsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: idSchema.optional(),
  })
  .strict();

export type BoardParams = z.infer<typeof boardParamsSchema>;
export type BoardPinParams = z.infer<typeof boardPinParamsSchema>;
export type SaveBoardPinInput = z.infer<typeof saveBoardPinSchema>;
export type GetBoardPinsQuery = z.infer<typeof getBoardPinsQuerySchema>;
const boardNameSchema = z.string().trim().min(1).max(100);
const boardDescriptionSchema = z.string().trim().max(2000);
const boardCoverImageSchema = z.string().trim().max(2048).nullable();
const boardIdSchema = z.string().trim().min(1).max(128);
const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9_]+$/);

export const createBoardSchema = z
  .object({
    name: boardNameSchema,
    description: boardDescriptionSchema,
    coverImage: boardCoverImageSchema.optional(),
    isPrivate: z.boolean().default(false),
  })
  .strict();

export const updateBoardSchema = z
  .object({
    name: boardNameSchema.optional(),
    description: boardDescriptionSchema.optional(),
    coverImage: boardCoverImageSchema.optional(),
    isPrivate: z.boolean().optional(),
  })
  .strict()
  .refine(
    (board) => Object.values(board).some((value) => value !== undefined),
    { message: "At least one board field must be provided." },
  );

export const boardIdParamsSchema = z.object({
  boardId: boardIdSchema,
});

export const publicUserBoardsParamsSchema = z.object({
  username: usernameSchema,
});

export const boardListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type BoardListQuery = z.infer<typeof boardListQuerySchema>;
