import { Router } from "express";
import {
  getMyProfile,
  getPublicUserProfile,
  patchMyProfile,
} from "../controllers/users.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  publicProfileParamsSchema,
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
  "/:username",
  validateRequest(publicProfileParamsSchema, "params"),
  getPublicUserProfile,
);
