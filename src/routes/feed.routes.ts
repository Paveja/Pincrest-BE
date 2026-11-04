import { Router } from "express";
import { listPins } from "../controllers/pins.controller.js";
import { optionalAuth } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import { pinListQuerySchema } from "../schemas/pins.schema.js";

export const feedRouter = Router();

feedRouter.get(
  "/",
  optionalAuth,
  validateRequest(pinListQuerySchema, "query"),
  listPins,
);
