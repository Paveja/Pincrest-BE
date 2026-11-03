import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import type { Response } from "express";

export const sessionCookieName = "pincrest_session";
export const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

function derivePasswordKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await derivePasswordKey(password, salt);

  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  const [algorithm, encodedSalt, encodedKey, extraPart] =
    passwordHash.split("$");

  if (
    algorithm !== "scrypt" ||
    !encodedSalt ||
    !encodedKey ||
    extraPart !== undefined
  ) {
    return false;
  }

  const salt = Buffer.from(encodedSalt, "base64url");
  const expectedKey = Buffer.from(encodedKey, "base64url");

  if (salt.length !== 16 || expectedKey.length !== 64) {
    return false;
  }

  const actualKey = await derivePasswordKey(password, salt);
  return timingSafeEqual(actualKey, expectedKey);
}

export function getSessionToken(
  cookieHeader: string | undefined,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(";")) {
    const separator = cookie.indexOf("=");

    if (separator < 0) {
      continue;
    }

    const name = cookie.slice(0, separator).trim();

    if (name === sessionCookieName) {
      return cookie.slice(separator + 1).trim() || null;
    }
  }

  return null;
}

function serializeSessionCookie(
  token: string,
  expiresAt: Date,
  secure: boolean,
): string {
  const maxAgeSeconds = Math.max(
    0,
    Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  );
  const secureAttribute = secure ? "; Secure" : "";

  return `${sessionCookieName}=${token}; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secureAttribute}`;
}

export function setSessionCookie(
  response: Response,
  token: string,
  expiresAt: Date,
  secure: boolean,
): void {
  response.setHeader(
    "Set-Cookie",
    serializeSessionCookie(token, expiresAt, secure),
  );
}

export function clearSessionCookie(response: Response, secure: boolean): void {
  response.setHeader(
    "Set-Cookie",
    serializeSessionCookie("", new Date(0), secure),
  );
}
