import { prisma } from "../lib/prisma.js";
import { ApiError } from "../lib/api-error.js";
import type {
  BoardListQuery,
  CreateBoardInput,
  UpdateBoardInput,
} from "../schemas/boards.schema.js";

const boardSelect = {
  id: true,
  name: true,
  description: true,
  coverImage: true,
  isPrivate: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
} as const;

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export function boardWriteError(error: unknown): ApiError | null {
  if (isPrismaError(error, "P2025")) {
    return new ApiError(404, "BOARD_NOT_FOUND", "Board was not found.");
  }

  return null;
}

function notFound(): ApiError {
  return new ApiError(404, "BOARD_NOT_FOUND", "Board was not found.");
}

async function listBoards(
  where: { ownerId: string; isPrivate?: boolean },
  { page, pageSize }: BoardListQuery,
) {
  const [boards, total] = await Promise.all([
    prisma.board.findMany({
      where,
      select: boardSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.board.count({ where }),
  ]);

  return {
    boards,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function createBoard(ownerId: string, input: CreateBoardInput) {
  return prisma.board.create({
    data: {
      name: input.name,
      description: input.description,
      isPrivate: input.isPrivate,
      ...(input.coverImage === undefined
        ? {}
        : { coverImage: input.coverImage }),
      ownerId,
    },
    select: boardSelect,
  });
}

export async function getBoard(boardId: string, viewerId: string | null) {
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      OR: [{ isPrivate: false }, ...(viewerId ? [{ ownerId: viewerId }] : [])],
    },
    select: boardSelect,
  });

  if (!board) {
    throw notFound();
  }

  return board;
}

export function getMyBoards(ownerId: string, pagination: BoardListQuery) {
  return listBoards({ ownerId }, pagination);
}

export async function getPublicUserBoards(
  username: string,
  pagination: BoardListQuery,
) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User profile was not found.");
  }

  return listBoards({ ownerId: user.id, isPrivate: false }, pagination);
}

export async function updateBoard(
  boardId: string,
  ownerId: string,
  input: UpdateBoardInput,
) {
  const data = {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.description === undefined
      ? {}
      : { description: input.description }),
    ...(input.coverImage === undefined ? {} : { coverImage: input.coverImage }),
    ...(input.isPrivate === undefined ? {} : { isPrivate: input.isPrivate }),
  };

  try {
    return await prisma.board.update({
      where: { id: boardId, ownerId },
      data,
      select: boardSelect,
    });
  } catch (error) {
    const writeError = boardWriteError(error);

    if (writeError) {
      throw writeError;
    }

    throw error;
  }
}

export async function deleteBoard(boardId: string, ownerId: string) {
  const result = await prisma.board.deleteMany({
    where: { id: boardId, ownerId },
  });

  if (result.count === 0) {
    throw notFound();
  }
}
