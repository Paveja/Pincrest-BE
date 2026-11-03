import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { ApiError } from "../lib/api-error.js";

type RequestPart = "body" | "params" | "query";

export function validateRequest<T>(
  schema: ZodType<T>,
  part: RequestPart = "body",
): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));

      return next(
        new ApiError(
          400,
          "VALIDATION_ERROR",
          "Request validation failed.",
          details,
        ),
      );
    }

    const partName = `${part[0]?.toUpperCase()}${part.slice(1)}`;
    res.locals[`validated${partName}`] = result.data;
    res.locals.validatedRequest = result.data;
    next();
  };
}
