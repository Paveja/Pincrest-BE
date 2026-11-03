import type { RequestHandler } from "express";
import { ApiError } from "../lib/api-error.js";
import {
  clearSessionCookie,
  readSessionCookie,
  setSessionCookie,
} from "../lib/auth-cookie.js";
import type { AuthenticatedUser } from "../middleware/auth.middleware.js";
import type { LoginInput, RegisterInput } from "../services/auth.schemas.js";
import {
  loginUser,
  registerUser,
  revokeSession,
} from "../services/auth.service.js";

export const register: RequestHandler = async (_request, response) => {
  const input = response.locals.validatedRequest as RegisterInput;
  const result = await registerUser(input);

  setSessionCookie(response, result.sessionToken);
  response.status(201).json({
    success: true,
    data: { user: result.user },
  });
};

export const login: RequestHandler = async (_request, response) => {
  const input = response.locals.validatedRequest as LoginInput;
  const result = await loginUser(input);

  setSessionCookie(response, result.sessionToken);
  response.status(200).json({
    success: true,
    data: { user: result.user },
  });
};

export const logout: RequestHandler = async (request, response) => {
  const token = readSessionCookie(request.headers.cookie);
  await revokeSession(token);
  clearSessionCookie(response);

  response.status(200).json({
    success: true,
    data: { message: "Logged out successfully." },
  });
};

export const getMe: RequestHandler = (_request, response, next) => {
  const user = response.locals.authenticatedUser as
    AuthenticatedUser | undefined;

  if (!user) {
    return next(
      new ApiError(401, "UNAUTHENTICATED", "Authentication is required."),
    );
  }

  response.status(200).json({
    success: true,
    data: { user },
  });
};
