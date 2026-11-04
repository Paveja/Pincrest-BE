import { Router } from "express";
import {
  deleteFollowUser,
  getFollowersList,
  getFollowingList,
  postFollowUser,
} from "../controllers/follows.controller.js";
import {
  getMyProfile,
  getPublicUserProfile,
  patchMyProfile,
} from "../controllers/users.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  followUserParamsSchema,
  publicProfileParamsSchema,
  relationshipListQuerySchema,
  updateProfileSchema,
} from "../schemas/users.schema.js";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, getMyProfile);
usersRouter.patch(
  "/me",
  requireAuth,
  validateRequest(updateProfileSchema),
  patchMyProfile,
);
usersRouter.post(
  "/:username/follow",
  requireAuth,
  validateRequest(followUserParamsSchema, "params"),
  postFollowUser,
);
usersRouter.delete(
  "/:username/follow",
  requireAuth,
  validateRequest(followUserParamsSchema, "params"),
  deleteFollowUser,
);
usersRouter.get(
  "/:username/followers",
  validateRequest(followUserParamsSchema, "params"),
  validateRequest(relationshipListQuerySchema, "query"),
  getFollowersList,
);
usersRouter.get(
  "/:username/following",
  validateRequest(followUserParamsSchema, "params"),
  validateRequest(relationshipListQuerySchema, "query"),
  getFollowingList,
);
usersRouter.get(
  "/:username",
  validateRequest(publicProfileParamsSchema, "params"),
  getPublicUserProfile,
);
