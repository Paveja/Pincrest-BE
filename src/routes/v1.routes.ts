import { Router } from "express";
import { getHealth } from "../controllers/health.controller.js";
import { authRouter } from "./auth.routes.js";
import { uploadsRouter } from "./uploads.routes.js";
import { usersRouter } from "./users.routes.js";

export const v1Router = Router();

v1Router.get("/health", getHealth);
v1Router.use("/auth", authRouter);
v1Router.use("/uploads", uploadsRouter);
v1Router.use("/users", usersRouter);
