import type { CookieOptions, Response } from "express";
export const SESSION_COOKIE_NAME = "pincrest_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const isProduction = process.env.NODE_ENV === "production";

const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/api/v1",
};

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    ...sessionCookieOptions,
    maxAge: SESSION_TTL_MS,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions);
}

export function readSessionCookie(
  cookieHeader: string | undefined,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(";")) {
    const separatorIndex = cookie.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const name = cookie.slice(0, separatorIndex).trim();

    if (name === SESSION_COOKIE_NAME) {
      return cookie.slice(separatorIndex + 1).trim() || null;
    }
  }

  return null;
}
