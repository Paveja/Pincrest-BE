import { prisma } from "../lib/prisma.js";
import { ApiError } from "../lib/api-error.js";
import type { UpdateProfileInput } from "../schemas/users.schema.js";

const profileSelect = {
  id: true,
  name: true,
  username: true,
  profileImage: true,
  bio: true,
  createdAt: true,
  _count: {
    select: {
      followers: true,
      following: true,
      pins: true,
    },
  },
} as const;

function toProfile(user: {
  id: string;
  name: string;
  username: string;
  profileImage: string | null;
  bio: string | null;
  createdAt: Date;
  _count: {
    followers: number;
    following: number;
    pins: number;
  };
}) {
  const { _count, ...profile } = user;

  return {
    ...profile,
    followerCount: _count.followers,
    followingCount: _count.following,
    createdPinsCount: _count.pins,
  };
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export function profileWriteError(error: unknown): ApiError | null {
  if (isPrismaError(error, "P2002")) {
    return new ApiError(
      409,
      "USERNAME_TAKEN",
      "That username is already in use.",
    );
  }

  if (isPrismaError(error, "P2025")) {
    return new ApiError(404, "USER_NOT_FOUND", "User profile was not found.");
  }

  return null;
}

async function requireProfile(where: { id: string } | { username: string }) {
  const user = await prisma.user.findUnique({
    where,
    select: profileSelect,
  });

  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User profile was not found.");
  }

  return toProfile(user);
}

export async function getPublicProfile(username: string, viewerId?: string) {
  const profile = await requireProfile({ username });

  if (!viewerId) {
    return { ...profile, isFollowing: false };
  }

  const relationship = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: viewerId,
        followingId: profile.id,
      },
    },
    select: { id: true },
  });

  return { ...profile, isFollowing: relationship !== null };
}

export function getCurrentProfile(userId: string) {
  return requireProfile({ id: userId });
}

export async function updateCurrentProfile(
  userId: string,
  input: UpdateProfileInput,
) {
  const data = {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.username === undefined ? {} : { username: input.username }),
    ...(input.bio === undefined ? {} : { bio: input.bio }),
    ...(input.profileImage === undefined
      ? {}
      : { profileImage: input.profileImage }),
  };

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: profileSelect,
    });

    return toProfile(user);
  } catch (error) {
    const profileError = profileWriteError(error);

    if (profileError) {
      throw profileError;
    }

    throw error;
  }
}
