import { prisma } from "../lib/prisma.js";
import { ApiError } from "../lib/api-error.js";
import type { GetBoardPinsQuery } from "../schemas/boards.schema.js";

const boardSelect = {
  id: true,
  name: true,
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
  const board = await requireOwnedBoard(boardId, userId);

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
    select: pinBoardSelect,
  });
  const hasMore = results.length > query.limit;
  const pins = results.slice(0, query.limit);
  const nextCursor = hasMore ? (pins.at(-1)?.id ?? null) : null;

  return {
    board,
    pins,
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
