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
  listPublicUserPins,
  patchMyProfile,
} from "../controllers/users.controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import { pinListQuerySchema } from "../schemas/pins.schema.js";
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
usersRouter.get(
  "/:username/pins",
  optionalAuth,
  validateRequest(publicProfileParamsSchema, "params"),
  validateRequest(pinListQuerySchema, "query"),
  listPublicUserPins,
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
  optionalAuth,
  validateRequest(publicProfileParamsSchema, "params"),
  getPublicUserProfile,
);
