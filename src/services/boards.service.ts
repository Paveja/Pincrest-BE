import { prisma } from "../lib/prisma.js";
import { ApiError } from "../lib/api-error.js";
import type { GetBoardPinsQuery } from "../schemas/boards.schema.js";
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

const pinBoardSelect = {
  id: true,
  pinId: true,
  boardId: true,
  savedByUserId: true,
  createdAt: true,
  pin: {
    select: {
      id: true,
      ownerId: true,
    },
  },
  board: {
    select: boardSelect,
  },
} as const;

export function authorizeBoardOwner(
  ownerId: string,
  authenticatedUserId: string,
): void {
  if (ownerId !== authenticatedUserId) {
    throw new ApiError(
      403,
      "BOARD_FORBIDDEN",
      "You do not have permission to modify this board.",
    );
  }
}

async function requireOwnedBoard(boardId: string, userId: string) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: boardSelect,
  });

  if (!board) {
    throw new ApiError(404, "BOARD_NOT_FOUND", "Board was not found.");
  }

  authorizeBoardOwner(board.ownerId, userId);
  return board;
}

async function findSavedPin(pinId: string, boardId: string) {
  return prisma.pinBoard.findUnique({
    where: {
      pinId_boardId: { pinId, boardId },
    },
    select: pinBoardSelect,
  });
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function savePinToBoard(
  boardId: string,
  pinId: string,
  userId: string,
) {
  const board = await requireOwnedBoard(boardId, userId);
  const pin = await prisma.pin.findUnique({
    where: { id: pinId },
    select: { id: true, ownerId: true },
  });

  if (!pin) {
    throw new ApiError(404, "PIN_NOT_FOUND", "Pin was not found.");
  }

  const existing = await findSavedPin(pinId, boardId);

  if (existing) {
    return { pinBoard: existing, created: false };
  }

  try {
    const pinBoard = await prisma.pinBoard.create({
      data: {
        pinId,
        boardId,
        savedByUserId: userId,
      },
      select: pinBoardSelect,
    });

    return { pinBoard, created: true };
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const duplicate = await findSavedPin(pinId, boardId);

    if (!duplicate) {
      throw error;
    }

    return { pinBoard: duplicate, created: false };
  }
}

export async function getBoardPins(
  boardId: string,
  userId: string,
  query: GetBoardPinsQuery,
) {
  const board = await getBoard(boardId, userId);

  if (query.cursor) {
    const cursorPin = await prisma.pinBoard.findFirst({
      where: { id: query.cursor, boardId },
      select: { id: true },
    });

    if (!cursorPin) {
      throw new ApiError(
        400,
        "INVALID_CURSOR",
        "Pagination cursor is invalid.",
      );
    }
  }

  const results = await prisma.pinBoard.findMany({
    where: { boardId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    take: query.limit + 1,
    select: {
      id: true,
      pin: {
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true,
          destinationUrl: true,
          ownerId: true,
          createdAt: true,
          updatedAt: true,
          owner: {
            select: {
              id: true,
              name: true,
              username: true,
              profileImage: true,
            },
          },
          _count: {
            select: { likes: true },
          },
          likes: {
            where: { userId },
            select: { id: true },
          },
        },
      },
    },
  });
  const hasMore = results.length > query.limit;
  const pinBoards = results.slice(0, query.limit);
  const nextCursor = hasMore ? (pinBoards.at(-1)?.id ?? null) : null;

  return {
    board,
    pins: pinBoards.map(({ pin }) => {
      const { owner, _count, likes, ...pinData } = pin;

      return {
        ...pinData,
        creator: owner,
        likeCount: _count.likes,
        isLiked: likes.length > 0,
      };
    }),
    pagination: {
      limit: query.limit,
      hasMore,
      nextCursor,
    },
  };
}

export async function removePinFromBoard(
  boardId: string,
  pinId: string,
  userId: string,
) {
  const board = await requireOwnedBoard(boardId, userId);
  const result = await prisma.pinBoard.deleteMany({
    where: { boardId, pinId },
  });

  if (result.count === 0) {
    throw new ApiError(
      404,
      "PIN_BOARD_NOT_FOUND",
      "Pin was not saved to this board.",
    );
  }

  return { board, pinId };
}

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
