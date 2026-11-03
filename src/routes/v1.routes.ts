import { Router } from "express";
import { getHealth } from "../controllers/health.controller.js";
import { authRouter } from "./auth.routes.js";
import { boardsRouter } from "./boards.routes.js";
import { usersRouter } from "./users.routes.js";

export const v1Router = Router();

v1Router.get("/health", getHealth);
v1Router.use("/auth", authRouter);
v1Router.use("/boards", boardsRouter);
v1Router.use("/users", usersRouter);
