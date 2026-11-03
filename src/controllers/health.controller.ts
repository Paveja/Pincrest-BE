import type { RequestHandler } from "express";
import {
  checkDatabaseConnection,
  getHealthStatus,
} from "../services/health.service.js";

export const getHealth: RequestHandler = async (_req, res) => {
  await checkDatabaseConnection();

  res.status(200).json({
    success: true,
    data: getHealthStatus(),
  });
};
