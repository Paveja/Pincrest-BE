import type { RequestHandler } from "express";
import { ApiError } from "../lib/api-error.js";
import {
  clearSessionCookie,
  getSessionToken,
  setSessionCookie,
} from "../lib/auth.js";
import type { AuthenticatedUser } from "../middleware/auth.middleware.js";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema.js";
import {
  deleteSession,
  loginUser,
  registerUser,
} from "../services/auth.service.js";

export const register: RequestHandler = async (_request, response) => {
  const input = response.locals.validatedRequest as RegisterInput;
  const session = await registerUser(input);

  setSessionCookie(
    response,
    session.token,
    session.expiresAt,
    process.env.NODE_ENV === "production",
  );

  response.status(201).json({
    success: true,
    data: { user: session.user },
  });
};

export const login: RequestHandler = async (_request, response) => {
  const input = response.locals.validatedRequest as LoginInput;
  const session = await loginUser(input);

  if (!session) {
    throw new ApiError(
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password.",
    );
  }

  setSessionCookie(
    response,
    session.token,
    session.expiresAt,
    process.env.NODE_ENV === "production",
  );

  response.status(200).json({
    success: true,
    data: { user: session.user },
  });
};

export const logout: RequestHandler = async (request, response) => {
  const token = getSessionToken(request.get("cookie"));
  await deleteSession(token);
  clearSessionCookie(response, process.env.NODE_ENV === "production");
  response.status(204).end();
};

export const getMe: RequestHandler = (_request, response) => {
  const user = response.locals.authenticatedUser as AuthenticatedUser;

  response.status(200).json({
  readSessionCookie,
  setSessionCookie,
} from "../lib/auth-cookie.js";
import {
  loginUser,
  registerUser,
  revokeSession,
} from "../services/auth.service.js";
import type { LoginInput, RegisterInput } from "../services/auth.schemas.js";

export const register: RequestHandler = async (_req, res) => {
  const input = res.locals.validatedRequest as RegisterInput;
  const result = await registerUser(input);

  setSessionCookie(res, result.sessionToken);
  res.status(201).json({
    success: true,
    data: { user: result.user },
  });
};

export const login: RequestHandler = async (_req, res) => {
  const input = res.locals.validatedRequest as LoginInput;
  const result = await loginUser(input);

  setSessionCookie(res, result.sessionToken);
  res.status(200).json({
    success: true,
    data: { user: result.user },
  });
};

export const logout: RequestHandler = async (req, res) => {
  const token = readSessionCookie(req.headers.cookie);
  await revokeSession(token);
  clearSessionCookie(res);

  res.status(200).json({
    success: true,
    data: { message: "Logged out successfully." },
  });
};

export const getCurrentUser: RequestHandler = (_req, res, next) => {
  const user = res.locals.authenticatedUser;

  if (!user) {
    return next(
      new ApiError(401, "UNAUTHENTICATED", "Authentication is required."),
    );
  }

  res.status(200).json({
    success: true,
    data: { user },
  });
};
