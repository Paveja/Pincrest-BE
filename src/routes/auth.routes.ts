import { rateLimit } from "express-rate-limit";
import { Router } from "express";
import {
  getMe,
  login,
  logout,
  register,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";

function createAuthRateLimit() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_request, response) => {
      response.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many attempts. Please try again later.",
        },
      });
    },
  });
}

export const authRouter = Router();

authRouter.post(
  "/register",
  createAuthRateLimit(),
  validateRequest(registerSchema),
  register,
);
authRouter.post(
  "/login",
  createAuthRateLimit(),
  validateRequest(loginSchema),
  login,
);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, getMe);
