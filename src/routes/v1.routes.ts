import { Router } from "express";
import {
  getCurrentUser,
  login,
  logout,
  register,
} from "../controllers/auth.controller.js";
import { getHealth } from "../controllers/health.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import { loginSchema, registerSchema } from "../services/auth.schemas.js";

export const v1Router = Router();

v1Router.get("/health", getHealth);
v1Router.post("/auth/register", validateRequest(registerSchema), register);
v1Router.post("/auth/login", validateRequest(loginSchema), login);
v1Router.post("/auth/logout", logout);
v1Router.get("/auth/me", requireAuth, getCurrentUser);
