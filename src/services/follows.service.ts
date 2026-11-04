import { prisma } from "../lib/prisma.js";
import { ApiError } from "../lib/api-error.js";
import type { RelationshipListQuery } from "../schemas/users.schema.js";

const followerSelect = {
  id: true,
  name: true,
  username: true,
  profileImage: true,
  bio: true,
} as const;

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export function assertCanFollow(followerId: string, followingId: string): void {
  if (followerId === followingId) {
    throw new ApiError(
      400,
      "CANNOT_FOLLOW_SELF",
      "You cannot follow yourself.",
    );
  }
}

async function requireUserId(username: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User profile was not found.");
  }

  return user.id;
}

async function getRelationshipCounts(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      _count: {
        select: {
          followers: true,
          following: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User profile was not found.");
  }

  return user._count;
}

export async function followUser(username: string, followerId: string) {
  const followingId = await requireUserId(username);
  assertCanFollow(followerId, followingId);

  let created = true;

  try {
    await prisma.follow.create({
      data: { followerId, followingId },
      select: { id: true },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const existingFollow = await prisma.follow.findFirst({
      where: { followerId, followingId },
      select: { id: true },
    });

    if (!existingFollow) {
      throw error;
    }

    created = false;
  }

  const [targetCounts, followerCounts] = await Promise.all([
    getRelationshipCounts(followingId),
    getRelationshipCounts(followerId),
  ]);

  return {
    isFollowing: true,
    created,
    followerCount: targetCounts.followers,
    followingCount: followerCounts.following,
  };
}

export async function unfollowUser(username: string, followerId: string) {
  const followingId = await requireUserId(username);
  assertCanFollow(followerId, followingId);

  await prisma.follow.deleteMany({
    where: { followerId, followingId },
  });

  const [targetCounts, followerCounts] = await Promise.all([
    getRelationshipCounts(followingId),
    getRelationshipCounts(followerId),
  ]);

  return {
    isFollowing: false,
    followerCount: targetCounts.followers,
    followingCount: followerCounts.following,
  };
}

export async function getFollowers(
  username: string,
  pagination: RelationshipListQuery,
) {
  const userId = await requireUserId(username);
  const where = { followingId: userId };
  const [relationships, total] = await Promise.all([
    prisma.follow.findMany({
      where,
      select: { follower: { select: followerSelect } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    }),
    prisma.follow.count({ where }),
  ]);

  return {
    users: relationships.map(({ follower }) => follower),
    pagination: {
      ...pagination,
      total,
      totalPages: Math.ceil(total / pagination.pageSize),
    },
  };
}

export async function getFollowing(
  username: string,
  pagination: RelationshipListQuery,
) {
  const userId = await requireUserId(username);
  const where = { followerId: userId };
  const [relationships, total] = await Promise.all([
    prisma.follow.findMany({
      where,
      select: { following: { select: followerSelect } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    }),
    prisma.follow.count({ where }),
  ]);

  return {
    users: relationships.map(({ following }) => following),
    pagination: {
      ...pagination,
      total,
      totalPages: Math.ceil(total / pagination.pageSize),
    },
  };
}
