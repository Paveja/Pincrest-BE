import { Router } from "express";
import {
  deleteBoardPin,
  getBoardPinsHandler,
  saveBoardPin,
} from "../controllers/boards.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  boardParamsSchema,
  boardPinParamsSchema,
  getBoardPinsQuerySchema,
  saveBoardPinSchema,
} from "../schemas/boards.schema.js";

export const boardsRouter = Router();

boardsRouter.post(
  "/:boardId/pins",
  requireAuth,
  validateRequest(boardParamsSchema, "params"),
  validateRequest(saveBoardPinSchema),
  saveBoardPin,
);
boardsRouter.get(
  "/:boardId/pins",
  requireAuth,
  validateRequest(boardParamsSchema, "params"),
  validateRequest(getBoardPinsQuerySchema, "query"),
  getBoardPinsHandler,
);
boardsRouter.delete(
  "/:boardId/pins/:pinId",
  requireAuth,
  validateRequest(boardPinParamsSchema, "params"),
  deleteBoardPin,
);
