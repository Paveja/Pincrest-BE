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
    success: true,
    data: { user },
  });
};
