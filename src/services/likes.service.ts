import { prisma } from "../lib/prisma.js";
import { ApiError } from "../lib/api-error.js";
import type { LikeListQuery } from "../schemas/likes.schema.js";

function pinNotFound(): ApiError {
  return new ApiError(404, "PIN_NOT_FOUND", "Pin was not found.");
}

async function requirePin(pinId: string): Promise<void> {
  const pin = await prisma.pin.findUnique({
    where: { id: pinId },
    select: { id: true },
  });

  if (!pin) {
    throw pinNotFound();
  }
}

async function getLikeCount(pinId: string): Promise<number> {
  return prisma.like.count({ where: { pinId } });
}

export async function likePin(userId: string, pinId: string) {
  await requirePin(pinId);

  await prisma.like.upsert({
    where: { userId_pinId: { userId, pinId } },
    create: { userId, pinId },
    update: {},
  });

  return {
    liked: true,
    likeCount: await getLikeCount(pinId),
  };
}

export async function unlikePin(userId: string, pinId: string) {
  await requirePin(pinId);

  await prisma.like.deleteMany({
    where: { userId, pinId },
  });

  return {
    liked: false,
    likeCount: await getLikeCount(pinId),
  };
}

export async function getPinLikes(
  pinId: string,
  query: LikeListQuery,
  currentUserId?: string,
) {
  await requirePin(pinId);

  const where = { pinId };
  const [likes, total, currentUserLike] = await Promise.all([
    prisma.like.findMany({
      where,
      select: {
        id: true,
        userId: true,
        pinId: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.like.count({ where }),
    currentUserId
      ? prisma.like.findUnique({
          where: {
            userId_pinId: { userId: currentUserId, pinId },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  return {
    likes,
    likeCount: total,
    likedByCurrentUser: currentUserLike !== null,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}
