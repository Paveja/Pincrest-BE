import { Router } from "express";
import {
  createPin,
  getPinById,
  listMyPins,
  listPins,
  patchPin,
  removePin,
} from "../controllers/pins.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  createPinSchema,
  pinIdParamsSchema,
  pinListQuerySchema,
  updatePinSchema,
} from "../schemas/pins.schema.js";

export const pinsRouter = Router();

pinsRouter.get("/", validateRequest(pinListQuerySchema, "query"), listPins);
pinsRouter.get(
  "/mine",
  requireAuth,
  validateRequest(pinListQuerySchema, "query"),
  listMyPins,
);
pinsRouter.get(
  "/:id",
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
