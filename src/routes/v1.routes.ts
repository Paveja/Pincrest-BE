import { Router } from "express";
import { getHealth } from "../controllers/health.controller.js";
import { authRouter } from "./auth.routes.js";

export const v1Router = Router();

v1Router.get("/health", getHealth);
v1Router.use("/auth", authRouter);
