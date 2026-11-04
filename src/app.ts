import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { notFoundMiddleware } from "./middleware/not-found.middleware.js";
import { requestLoggingMiddleware } from "./middleware/request-logging.middleware.js";
import { v1Router } from "./routes/v1.routes.js";

export const app = express();
const allowedFrontendOrigins = new Set(env.FRONTEND_ORIGINS);

app.disable("x-powered-by");
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      return callback(
        null,
        allowedFrontendOrigins.has(origin) ? origin : false,
      );
    },
    credentials: true,
  }),
);
app.use((_request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader(
    "Content-Security-Policy",
    "frame-ancestors 'self' https://revolte.ai https://*.revolte.ai",
  );
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  if (env.NODE_ENV === "production") {
    response.setHeader("Strict-Transport-Security", "max-age=31536000");
  }

  next();
});
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
