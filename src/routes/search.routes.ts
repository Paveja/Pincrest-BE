import { Router } from "express";
import {
  searchPinsHandler,
  searchUsersHandler,
} from "../controllers/search.controller.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import { searchQuerySchema } from "../schemas/search.schema.js";

export const searchRouter = Router();

searchRouter.get(
  "/pins",
  validateRequest(searchQuerySchema, "query"),
  searchPinsHandler,
);
searchRouter.get(
  "/users",
  validateRequest(searchQuerySchema, "query"),
  searchUsersHandler,
);
