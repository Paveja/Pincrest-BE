import { prisma } from "../lib/prisma.js";
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  sessionLifetimeMs,
  verifyPassword,
} from "../lib/auth.js";
import { ApiError } from "../lib/api-error.js";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema.js";

const publicUserSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  profileImage: true,
  bio: true,
  createdAt: true,
  updatedAt: true,
} as const;
import { createHash, randomBytes } from "node:crypto";
import type { User } from "../generated/prisma/client.js";
import { ApiError } from "../lib/api-error.js";
import { SESSION_TTL_MS } from "../lib/auth-cookie.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";

export type PublicUser = Pick<
  User,
  | "id"
  | "name"
  | "username"
  | "email"
  | "profileImage"
  | "bio"
  | "createdAt"
  | "updatedAt"
>;

export type AuthResult = {
  user: PublicUser;
  sessionToken: string;
};

const dummyPasswordHash = hashPassword(randomBytes(32).toString("hex"));

function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function registerUser(input: RegisterInput) {
  const passwordHash = await hashPassword(input.password);
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + sessionLifetimeMs);

  try {
    const user = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
async function createSession(userId: string): Promise<AuthResult> {
  const sessionToken = createSessionToken();
  const tokenHash = hashSessionToken(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const session = await prisma.session.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
    },
    include: {
      user: true,
    },
  });

  return {
    user: toPublicUser(session.user),
    sessionToken,
  };
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const passwordHash = await hashPassword(input.password);
  const sessionToken = createSessionToken();
  const tokenHash = hashSessionToken(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          name: input.name,
          username: input.username,
          email: input.email,
          passwordHash,
        },
        select: publicUserSelect,
      });

      await transaction.session.create({
        data: {
          userId: createdUser.id,
          tokenHash: hashSessionToken(token),
          tokenHash,
          userId: user.id,
          expiresAt,
        },
      });

      return createdUser;
    });

    return { user, token, expiresAt };
      return user;
    });

    return {
      user: toPublicUser(result),
      sessionToken,
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(
        409,
        "ACCOUNT_ALREADY_EXISTS",
        "Email or username is already in use.",
        "The email or username is already in use.",
      );
    }

    throw error;
  }
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      ...publicUserSelect,
      passwordHash: true,
    },
  });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    return null;
  }

  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + sessionLifetimeMs);

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });

  const { passwordHash: _passwordHash, ...publicUser } = user;
  return { user: publicUser, token, expiresAt };
}

export async function getAuthenticatedUser(token: string) {
  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: { select: publicUserSelect } },
export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });
  const passwordHash = user?.passwordHash ?? (await dummyPasswordHash);
  const passwordMatches = await verifyPassword(input.password, passwordHash);

  if (!user || !passwordMatches) {
    throw new ApiError(
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password.",
    );
  }

  return createSession(user.id);
}

export async function revokeSession(token: string | null): Promise<void> {
  if (!token) {
    return;
  }

  await prisma.session.deleteMany({
    where: { tokenHash: hashSessionToken(token) },
  });
}

export async function getSession(token: string): Promise<{
  user: PublicUser;
} | null> {
  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
  if (session.expiresAt <= new Date()) {
    await prisma.session.deleteMany({ where: { tokenHash } });
    return null;
  }

  return session.user;
}

export async function deleteSession(token: string | null): Promise<void> {
  if (!token) {
    return;
  }

  await prisma.session.deleteMany({
    where: { tokenHash: hashSessionToken(token) },
  });
  return {
    user: toPublicUser(session.user),
  };
}
