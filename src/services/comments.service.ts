import { prisma } from "../lib/prisma.js";
import { ApiError } from "../lib/api-error.js";
import type {
  CommentListQuery,
  CreateCommentInput,
  UpdateCommentInput,
} from "../schemas/comments.schema.js";

const commentSelect = {
  id: true,
  content: true,
  userId: true,
  pinId: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      username: true,
      profileImage: true,
    },
  },
} as const;

function toComment(comment: {
  id: string;
  content: string;
  userId: string;
  pinId: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    username: string;
    profileImage: string | null;
  };
}) {
  const { user, ...commentData } = comment;
  return { ...commentData, author: user };
}

function commentNotFound(): ApiError {
  return new ApiError(404, "COMMENT_NOT_FOUND", "Comment was not found.");
}

export function ownedCommentWhere(userId: string, commentId: string) {
  return { id: commentId, userId };
}

async function requirePin(pinId: string): Promise<void> {
  const pin = await prisma.pin.findUnique({
    where: { id: pinId },
    select: { id: true },
  });

  if (!pin) {
    throw new ApiError(404, "PIN_NOT_FOUND", "Pin was not found.");
  }
}

export async function getPinComments(pinId: string, query: CommentListQuery) {
  await requirePin(pinId);
  const where = { pinId };
  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      select: commentSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.comment.count({ where }),
  ]);

  const totalPages = Math.ceil(total / query.limit);

  return {
    comments: comments.map(toComment),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasNextPage: query.page < totalPages,
    },
  };
}

export async function createComment(
  userId: string,
  pinId: string,
  input: CreateCommentInput,
) {
  await requirePin(pinId);
  const comment = await prisma.comment.create({
    data: {
      content: input.content,
      userId,
      pinId,
    },
    select: commentSelect,
  });

  return toComment(comment);
}

export async function updateOwnedComment(
  userId: string,
  commentId: string,
  input: UpdateCommentInput,
) {
  const result = await prisma.comment.updateMany({
    where: ownedCommentWhere(userId, commentId),
    data: { content: input.content },
  });

  if (result.count === 0) {
    throw commentNotFound();
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: commentSelect,
  });

  if (!comment) {
    throw commentNotFound();
  }

  return toComment(comment);
}

export async function deleteOwnedComment(userId: string, commentId: string) {
  const result = await prisma.comment.deleteMany({
    where: ownedCommentWhere(userId, commentId),
  });

  if (result.count === 0) {
    throw commentNotFound();
  }
}
