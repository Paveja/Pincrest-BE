import { Router } from "express";
import {
  listPinComments,
  patchComment,
  postPinComment,
  removeComment,
} from "../controllers/comments.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  commentListQuerySchema,
  commentParamsSchema,
  createCommentSchema,
  pinCommentsParamsSchema,
  updateCommentSchema,
} from "../schemas/comments.schema.js";

export const commentsRouter = Router();

commentsRouter.get(
  "/pins/:pinId/comments",
  validateRequest(pinCommentsParamsSchema, "params"),
  validateRequest(commentListQuerySchema, "query"),
  listPinComments,
);
commentsRouter.post(
  "/pins/:pinId/comments",
  requireAuth,
  validateRequest(pinCommentsParamsSchema, "params"),
  validateRequest(createCommentSchema),
  postPinComment,
);
commentsRouter.patch(
  "/comments/:commentId",
  requireAuth,
  validateRequest(commentParamsSchema, "params"),
  validateRequest(updateCommentSchema),
  patchComment,
);
commentsRouter.delete(
  "/comments/:commentId",
  requireAuth,
  validateRequest(commentParamsSchema, "params"),
  removeComment,
);
