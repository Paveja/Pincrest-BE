import { Router } from "express";
import { getHealth } from "../controllers/health.controller.js";

export const v1Router = Router();

v1Router.get("/health", getHealth);
