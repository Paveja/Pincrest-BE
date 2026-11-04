import { Router } from "express";
import {
  deleteBoardPin,
  deleteOwnedBoard,
  getBoardDetails,
  getBoardPinsHandler,
  getMyBoardsList,
  getPublicBoardsForUser,
  patchBoard,
  postBoard,
  saveBoardPin,
} from "../controllers/boards.controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  boardIdParamsSchema,
  boardListQuerySchema,
  boardParamsSchema,
  boardPinParamsSchema,
  createBoardSchema,
  getBoardPinsQuerySchema,
  publicUserBoardsParamsSchema,
  saveBoardPinSchema,
  updateBoardSchema,
} from "../schemas/boards.schema.js";

export const boardsRouter = Router();

boardsRouter.post(
  "/",
  requireAuth,
  validateRequest(createBoardSchema),
  postBoard,
);
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
boardsRouter.get(
  "/mine",
  requireAuth,
  validateRequest(boardListQuerySchema, "query"),
  getMyBoardsList,
);
boardsRouter.get(
  "/:boardId",
  optionalAuth,
  validateRequest(boardIdParamsSchema, "params"),
  getBoardDetails,
);
boardsRouter.patch(
  "/:boardId",
  requireAuth,
  validateRequest(boardIdParamsSchema, "params"),
  validateRequest(updateBoardSchema),
  patchBoard,
);
boardsRouter.delete(
  "/:boardId",
  requireAuth,
  validateRequest(boardIdParamsSchema, "params"),
  deleteOwnedBoard,
);

export const publicUserBoardsRouter = Router({ mergeParams: true });
publicUserBoardsRouter.get(
  "/:username/boards",
  validateRequest(publicUserBoardsParamsSchema, "params"),
  validateRequest(boardListQuerySchema, "query"),
  getPublicBoardsForUser,
);
