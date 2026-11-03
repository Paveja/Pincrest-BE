import type { RequestHandler } from "express";
import { ApiError } from "../lib/api-error.js";
import { getSessionToken } from "../lib/auth.js";
export type AuthenticatedUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  profileImage: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
};

async function resolveAuthenticatedUser(
  token: string,
): Promise<AuthenticatedUser | null> {
  const { getAuthenticatedUser } = await import("../services/auth.service.js");
  return getAuthenticatedUser(token);
}

export function createAuthMiddleware(
  resolveUser: (
    token: string,
  ) => Promise<AuthenticatedUser | null> = resolveAuthenticatedUser,
): RequestHandler {
  return async (request, response, next) => {
    const token = getSessionToken(request.get("cookie"));

    if (!token) {
      return next(
        new ApiError(401, "UNAUTHENTICATED", "Authentication is required."),
      );
    }

    const user = await resolveUser(token);

    if (!user) {
      return next(
        new ApiError(401, "UNAUTHENTICATED", "Authentication is required."),
      );
    }

    response.locals.authenticatedUser = user;
    return next();
  };
}

export const requireAuth = createAuthMiddleware();
