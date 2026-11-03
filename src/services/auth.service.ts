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
          expiresAt,
        },
      });

      return createdUser;
    });

    return { user, token, expiresAt };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(
        409,
        "ACCOUNT_ALREADY_EXISTS",
        "Email or username is already in use.",
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
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
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
}
