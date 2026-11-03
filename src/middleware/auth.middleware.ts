import type { RequestHandler } from "express";
import { ApiError } from "../lib/api-error.js";
import { clearSessionCookie, readSessionCookie } from "../lib/auth-cookie.js";
import type { PublicUser } from "../services/auth.service.js";

export type AuthenticatedUser = PublicUser;

async function resolveAuthenticatedUser(
  token: string,
): Promise<AuthenticatedUser | null> {
  const { getSession } = await import("../services/auth.service.js");
  return (await getSession(token))?.user ?? null;
}

function buildAuthMiddleware(
  resolveUser: (token: string) => Promise<AuthenticatedUser | null>,
  optional: boolean,
): RequestHandler {
  return async (request, response, next) => {
    const sessionToken = readSessionCookie(request.get("cookie"));

    if (!sessionToken) {
      if (optional) {
        return next();
      }

      return next(
        new ApiError(401, "UNAUTHENTICATED", "Authentication is required."),
      );
    }

    const user = await resolveUser(sessionToken);

    if (!user) {
      clearSessionCookie(response);
      if (optional) {
        return next();
      }

      return next(
        new ApiError(401, "UNAUTHENTICATED", "Authentication is required."),
      );
    }

    response.locals.authenticatedUser = user;
    return next();
  };
}

export function createAuthMiddleware(
  resolveUser: (
    token: string,
  ) => Promise<AuthenticatedUser | null> = resolveAuthenticatedUser,
): RequestHandler {
  return buildAuthMiddleware(resolveUser, false);
}

export function createOptionalAuthMiddleware(
  resolveUser: (
    token: string,
  ) => Promise<AuthenticatedUser | null> = resolveAuthenticatedUser,
): RequestHandler {
  return buildAuthMiddleware(resolveUser, true);
}

export const requireAuth = createAuthMiddleware();
export const optionalAuth = createOptionalAuthMiddleware();
