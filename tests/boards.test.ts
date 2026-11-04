import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";
import express from "express";
import { after, describe, it } from "node:test";
import type { Request, Response } from "express";
import { ApiError } from "../src/lib/api-error.js";
import { createOptionalAuthMiddleware } from "../src/middleware/auth.middleware.js";
import { errorMiddleware } from "../src/middleware/error.middleware.js";
import { validateRequest } from "../src/middleware/validation.middleware.js";
import {
  boardIdParamsSchema,
  boardListQuerySchema,
  boardParamsSchema,
  boardPinParamsSchema,
  createBoardSchema,
  getBoardPinsQuerySchema,
  saveBoardPinSchema,
  updateBoardSchema,
} from "../src/schemas/boards.schema.js";

process.env.DATABASE_URL ??=
  "postgresql://pincrest-test:pincrest-test@127.0.0.1:5432/pincrest_test?sslmode=disable";

const [{ boardsRouter }, { authorizeBoardOwner, boardWriteError }] =
  await Promise.all([
    import("../src/routes/boards.routes.js"),
    import("../src/services/boards.service.js"),
  ]);
const { prisma } = await import("../src/lib/prisma.js");

const app = express();
app.use(express.json());
app.use("/api/v1/boards", boardsRouter);
app.use(errorMiddleware);

const server: Server = createServer(app);
await new Promise<void>((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    server.removeListener("error", reject);
    resolve();
  });
});

const address = server.address() as AddressInfo;
const origin = `http://127.0.0.1:${address.port}`;

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

describe("board request validation", () => {
  it("accepts valid creation and partial update bodies", () => {
    assert.deepEqual(
      createBoardSchema.parse({ name: "Reading list", description: "Books" }),
      { name: "Reading list", description: "Books", isPrivate: false },
    );
    assert.deepEqual(
      updateBoardSchema.parse({ coverImage: null, isPrivate: true }),
      { coverImage: null, isPrivate: true },
    );
  });

  it("rejects empty updates, unknown fields, and unbounded pagination", () => {
    assert.equal(updateBoardSchema.safeParse({}).success, false);
    assert.equal(
      createBoardSchema.safeParse({
        name: "Plans",
        description: "",
        ownerId: "attacker",
      }).success,
      false,
    );
    assert.equal(
      boardListQuerySchema.safeParse({ pageSize: "101" }).success,
      false,
    );
    assert.equal(
      getBoardPinsQuerySchema.safeParse({ limit: "0" }).success,
      false,
    );
    assert.equal(
      boardIdParamsSchema.safeParse({ boardId: " " }).success,
      false,
    );
  });

  it("validates board-pin bodies and parameters independently", () => {
    const request = {
      params: { boardId: "board_1" },
      body: { pinId: "pin_1" },
    } as Request;
    const response = { locals: {} } as Response;
    const next = (error?: unknown) => {
      if (error) {
        throw error;
      }
    };

    validateRequest(boardParamsSchema, "params")(request, response, next);
    validateRequest(saveBoardPinSchema)(request, response, next);

    assert.deepEqual(response.locals.validatedParams, { boardId: "board_1" });
    assert.deepEqual(response.locals.validatedRequest, { pinId: "pin_1" });
    assert.equal(
      boardPinParamsSchema.safeParse({ boardId: "board_1", pinId: "pin_1" })
        .success,
      true,
    );
  });
});

describe("board ownership authorization", () => {
  it("allows the owner and rejects another user", () => {
    assert.doesNotThrow(() => authorizeBoardOwner("owner_1", "owner_1"));
    assert.throws(
      () => authorizeBoardOwner("owner_1", "user_2"),
      (error: unknown) =>
        error instanceof ApiError &&
        error.statusCode === 403 &&
        error.code === "BOARD_FORBIDDEN",
    );
  });

  it("maps ownership-constrained writes for missing boards to a not-found API error", () => {
    const error = boardWriteError({ code: "P2025" });

    assert.ok(error instanceof ApiError);
    assert.equal(error.statusCode, 404);
    assert.equal(error.code, "BOARD_NOT_FOUND");
    assert.equal(boardWriteError(new Error("database unavailable")), null);
  });
});

describe("board routes", () => {
  it("rejects unauthenticated board mutations and private-list access", async () => {
    const routes = [
      ["POST", "/api/v1/boards"],
      ["GET", "/api/v1/boards/mine"],
      ["POST", "/api/v1/boards/board_1/pins"],
      ["GET", "/api/v1/boards/board_1/pins"],
      ["DELETE", "/api/v1/boards/board_1/pins/pin_1"],
      ["PATCH", "/api/v1/boards/board_1"],
      ["DELETE", "/api/v1/boards/board_1"],
    ] as const;

    for (const [method, path] of routes) {
      const response = await fetch(`${origin}${path}`, { method });
      const body = await response.json();

      assert.equal(response.status, 401, `${method} ${path}`);
      assert.deepEqual(body, {
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required.",
        },
      });
    }
  });
});

describe("optional authentication for public board details", () => {
  it("allows anonymous requests without assigning a user", async () => {
    const middleware = createOptionalAuthMiddleware(async () => null);
    const request = { get: () => undefined } as unknown as Request;
    const response = { locals: {} } as Response;
    let receivedError: unknown;

    await middleware(request, response, (error) => {
      receivedError = error;
    });

    assert.equal(receivedError, undefined);
    assert.equal(response.locals.authenticatedUser, undefined);
  });

  it("clears an invalid optional session and continues anonymously", async () => {
    const middleware = createOptionalAuthMiddleware(async () => null);
    const request = {
      get: () => "pincrest_session=invalid-token",
    } as unknown as Request;
    let sessionCookieCleared = false;
    const response = {
      locals: {},
      clearCookie: () => {
        sessionCookieCleared = true;
      },
    } as unknown as Response;
    let receivedError: unknown;

    await middleware(request, response, (error) => {
      receivedError = error;
    });

    assert.equal(receivedError, undefined);
    assert.equal(sessionCookieCleared, true);
    assert.equal(response.locals.authenticatedUser, undefined);
  });
});

describe("board Pin response shape", () => {
  it("returns full Pin fields instead of PinBoard join rows", async () => {
    const originalSessionFindUnique = prisma.session.findUnique;
    const originalBoardFindUnique = prisma.board.findUnique;
    const originalPinBoardFindMany = prisma.pinBoard.findMany;
    const createdAt = new Date("2026-02-01T00:00:00.000Z");
    const sessionUser = {
      id: "board_owner_1",
      name: "Jordan Lee",
      username: "jordanlee",
      email: "jordan@example.com",
      passwordHash: "hidden",
      profileImage: null,
      bio: null,
      createdAt,
      updatedAt: createdAt,
    };
    const pinRecord = {
      id: "pin_1",
      title: "Ceramic tableware",
      description: "Handmade blue ceramic bowls.",
      imageUrl: "https://images.example.com/ceramics.jpg",
      destinationUrl: "https://shop.example.com/ceramics",
      ownerId: "creator_1",
      createdAt,
      updatedAt: createdAt,
      owner: {
        id: "creator_1",
        name: "Ava Green",
        username: "ava",
        profileImage: null,
      },
      _count: { likes: 3 },
      likes: [{ id: "like_1" }],
    };
    const boardId = "board_1";

    prisma.session.findUnique = (async () => ({
      expiresAt: new Date(Date.now() + 60_000),
      user: sessionUser,
    })) as typeof prisma.session.findUnique;
    prisma.board.findUnique = (async () => ({
      id: boardId,
      name: "Home inspiration",
      description: "Ideas for the living room.",
      coverImage: null,
      isPrivate: false,
      ownerId: sessionUser.id,
      createdAt,
      updatedAt: createdAt,
    })) as typeof prisma.board.findUnique;
    prisma.pinBoard.findMany = (async () => [
      { id: "pin_board_1", pin: pinRecord },
    ]) as typeof prisma.pinBoard.findMany;

    try {
      const response = await fetch(
        `${origin}/api/v1/boards/${boardId}/pins?limit=10`,
        { headers: { Cookie: "pincrest_session=board-pin-session" } },
      );
      const body = await response.json();
      const [pin] = body.data.pins;

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.pins.length, 1);
      assert.equal(pin.title, "Ceramic tableware");
      assert.equal(pin.imageUrl, "https://images.example.com/ceramics.jpg");
      assert.equal(pin.creator.username, "ava");
      assert.equal(pin.likeCount, 3);
      assert.equal(pin.isLiked, true);
      assert.equal("pinId" in pin, false);
    } finally {
      prisma.session.findUnique = originalSessionFindUnique;
      prisma.board.findUnique = originalBoardFindUnique;
      prisma.pinBoard.findMany = originalPinBoardFindMany;
    }
  });
});
