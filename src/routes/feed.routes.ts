import { Router } from "express";
import { listPins } from "../controllers/pins.controller.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import { pinListQuerySchema } from "../schemas/pins.schema.js";

export const feedRouter = Router();

feedRouter.get("/", validateRequest(pinListQuerySchema, "query"), listPins);
