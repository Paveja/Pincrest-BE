import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { notFoundMiddleware } from "./middleware/not-found.middleware.js";
import { requestLoggingMiddleware } from "./middleware/request-logging.middleware.js";
import { v1Router } from "./routes/v1.routes.js";

export const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  }),
);
app.use(requestLoggingMiddleware);
app.use(express.json({ limit: "1mb" }));

if (env.IMAGE_STORAGE_DRIVER === "filesystem") {
  app.use(
    "/uploads",
    express.static(env.IMAGE_STORAGE_DIR, {
      index: false,
      dotfiles: "deny",
      setHeaders: (response) =>
        response.setHeader("X-Content-Type-Options", "nosniff"),
    }),
  );
}

app.use("/api/v1", v1Router);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
