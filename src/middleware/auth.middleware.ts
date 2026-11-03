import type { RequestHandler } from "express";
import { ApiError } from "../lib/api-error.js";
import { clearSessionCookie, readSessionCookie } from "../lib/auth-cookie.js";
import { getSession } from "../services/auth.service.js";

export const requireAuth: RequestHandler = async (req, res, next) => {
  const sessionToken = readSessionCookie(req.headers.cookie);

  if (!sessionToken) {
    return next(
      new ApiError(401, "UNAUTHENTICATED", "Authentication is required."),
    );
  }

  const session = await getSession(sessionToken);

  if (!session) {
    clearSessionCookie(res);
    return next(
      new ApiError(401, "UNAUTHENTICATED", "Authentication is required."),
    );
  }

  res.locals.authenticatedUser = session.user;
  next();
};
