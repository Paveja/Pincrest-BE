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
