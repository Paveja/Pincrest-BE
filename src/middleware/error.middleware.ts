import type { ErrorRequestHandler } from "express";
import { ApiError } from "../lib/api-error.js";

export const errorMiddleware: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const isMalformedJson =
    error instanceof SyntaxError &&
    "type" in error &&
    error.type === "entity.parse.failed";
  const apiError =
    error instanceof ApiError
      ? error
      : isMalformedJson
        ? new ApiError(
            400,
            "INVALID_JSON",
            "Request body must contain valid JSON.",
          )
        : new ApiError(
            500,
            "INTERNAL_SERVER_ERROR",
            "An unexpected error occurred.",
          );

  if (apiError.statusCode >= 500) {
    console.error(
      JSON.stringify({
        level: "error",
        method: req.method,
        path: req.path,
        statusCode: apiError.statusCode,
        errorName: error instanceof Error ? error.name : "UnknownError",
      }),
    );
  }

  res.status(apiError.statusCode).json({
    success: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.details === undefined ? {} : { details: apiError.details }),
    },
  });
};
