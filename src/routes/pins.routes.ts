import { Router } from "express";
import {
  createPin,
  getPinById,
  listMyPins,
  listPins,
  patchPin,
  removePin,
} from "../controllers/pins.controller.js";
import {
  likePin,
  listPinLikes,
  unlikePin,
} from "../controllers/likes.controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  createPinSchema,
  pinIdParamsSchema,
  pinListQuerySchema,
  updatePinSchema,
} from "../schemas/pins.schema.js";
import { likeListQuerySchema } from "../schemas/likes.schema.js";

export const pinsRouter = Router();

pinsRouter.get(
  "/",
  optionalAuth,
  validateRequest(pinListQuerySchema, "query"),
  listPins,
);
pinsRouter.get(
  "/mine",
  requireAuth,
  validateRequest(pinListQuerySchema, "query"),
  listMyPins,
);
pinsRouter.get(
  "/:id",
  optionalAuth,
  validateRequest(pinIdParamsSchema, "params"),
  getPinById,
);
pinsRouter.post("/", requireAuth, validateRequest(createPinSchema), createPin);
pinsRouter.patch(
  "/:id",
  requireAuth,
  validateRequest(pinIdParamsSchema, "params"),
  validateRequest(updatePinSchema),
  patchPin,
);
pinsRouter.delete(
  "/:id",
  requireAuth,
  validateRequest(pinIdParamsSchema, "params"),
  removePin,
);
pinsRouter.post(
  "/:id/like",
  requireAuth,
  validateRequest(pinIdParamsSchema, "params"),
  likePin,
);
pinsRouter.put(
  "/:id/like",
  requireAuth,
  validateRequest(pinIdParamsSchema, "params"),
  likePin,
);
pinsRouter.delete(
  "/:id/like",
  requireAuth,
  validateRequest(pinIdParamsSchema, "params"),
  unlikePin,
);
pinsRouter.get(
  "/:id/likes",
  optionalAuth,
  validateRequest(pinIdParamsSchema, "params"),
  validateRequest(likeListQuerySchema, "query"),
  listPinLikes,
);
