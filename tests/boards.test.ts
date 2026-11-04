import assert from "node:assert/strict";
import type { Request, Response } from "express";
import { describe, it } from "node:test";
import { ApiError } from "../src/lib/api-error.js";
import { validateRequest } from "../src/middleware/validation.middleware.js";
import {
  boardParamsSchema,
  boardPinParamsSchema,
  getBoardPinsQuerySchema,
  saveBoardPinSchema,
} from "../src/schemas/boards.schema.js";

process.env.DATABASE_URL ??=
  "postgresql://boards-test:boards-test@127.0.0.1:5432/pincrest_test";
const { authorizeBoardOwner } =
  await import("../src/services/boards.service.js");

describe("board pin route validation", () => {
  it("accepts board and pin identifiers", () => {
    assert.deepEqual(boardParamsSchema.parse({ boardId: "board_1" }), {
      boardId: "board_1",
    });
    assert.deepEqual(
      boardPinParamsSchema.parse({ boardId: "board_1", pinId: "pin_1" }),
      { boardId: "board_1", pinId: "pin_1" },
    );
  });

  it("defaults and bounds board contents pagination", () => {
    assert.deepEqual(getBoardPinsQuerySchema.parse({}), { limit: 50 });
    assert.deepEqual(
      getBoardPinsQuerySchema.parse({ limit: "25", cursor: "pinboard_1" }),
      { limit: 25, cursor: "pinboard_1" },
    );
    assert.equal(
      getBoardPinsQuerySchema.safeParse({ limit: "101" }).success,
      false,
    );
    assert.equal(
      getBoardPinsQuerySchema.safeParse({ limit: "0" }).success,
      false,
    );
  });

  it("validates the save body and rejects missing or oversized identifiers", () => {
    assert.deepEqual(saveBoardPinSchema.parse({ pinId: "pin_1" }), {
      pinId: "pin_1",
    });
    assert.equal(boardParamsSchema.safeParse({ boardId: " " }).success, false);
    assert.equal(saveBoardPinSchema.safeParse({}).success, false);
    assert.equal(
      boardPinParamsSchema.safeParse({
        boardId: "board_1",
        pinId: "p".repeat(129),
      }).success,
import { describe, it } from "node:test";
import { ApiError } from "../src/lib/api-error.js";
import type { Request, Response } from "express";
import { createOptionalAuthMiddleware } from "../src/middleware/auth.middleware.js";
import {
  boardListQuerySchema,
  createBoardSchema,
  updateBoardSchema,
} from "../src/schemas/boards.schema.js";

process.env.DATABASE_URL ??=
  "postgresql://board-test:board-test@127.0.0.1:5432/pincrest_test";
const { boardWriteError } = await import("../src/services/boards.service.js");

describe("board create validation", () => {
  it("defaults new boards to public and accepts private boards", () => {
    assert.deepEqual(
      createBoardSchema.parse({ name: "Reading list", description: "Books" }),
      { name: "Reading list", description: "Books", isPrivate: false },
    );
    assert.equal(
      createBoardSchema.parse({
        name: "Planning",
        description: "Quarterly plans",
        isPrivate: true,
      }).isPrivate,
      true,
    );
  });

  it("rejects missing names, unknown fields, and non-boolean visibility", () => {
    assert.equal(
      createBoardSchema.safeParse({ description: "No name" }).success,
      false,
    );
    assert.equal(
      createBoardSchema.safeParse({
        name: "Plans",
        description: "",
        ownerId: "attacker",
      }).success,
      false,
    );
    assert.equal(
      createBoardSchema.safeParse({
        name: "Plans",
        description: "",
        isPrivate: "true",
      }).success,
      false,
    );
  });
});

describe("board update validation", () => {
  it("accepts partial updates and nullable cover images", () => {
    assert.deepEqual(
      updateBoardSchema.parse({ coverImage: null, isPrivate: true }),
      { coverImage: null, isPrivate: true },
    );
  });

  it("rejects empty updates and fields outside the board", () => {
    assert.equal(updateBoardSchema.safeParse({}).success, false);
    assert.equal(
      updateBoardSchema.safeParse({ ownerId: "attacker" }).success,
      false,
    );
  });
});

describe("board list pagination validation", () => {
  it("applies bounded pagination defaults and accepts overrides", () => {
    assert.deepEqual(boardListQuerySchema.parse({}), {
      page: 1,
      pageSize: 20,
    });
    assert.deepEqual(
      boardListQuerySchema.parse({ page: "2", pageSize: "50" }),
      {
        page: 2,
        pageSize: 50,
      },
    );
  });

  it("rejects invalid and excessive page sizes", () => {
    assert.equal(boardListQuerySchema.safeParse({ page: "0" }).success, false);
    assert.equal(
      boardListQuerySchema.safeParse({ pageSize: "101" }).success,
      false,
    );
  });
});

describe("request validation middleware", () => {
  it("keeps validated params when validating the body afterward", () => {
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
  });
});

describe("board ownership authorization", () => {
  it("allows the board owner", () => {
    assert.doesNotThrow(() => authorizeBoardOwner("owner_1", "owner_1"));
  });

  it("rejects users who do not own the board", () => {
    assert.throws(
      () => authorizeBoardOwner("owner_1", "user_2"),
      (error: unknown) =>
        error instanceof ApiError &&
        error.statusCode === 403 &&
        error.code === "BOARD_FORBIDDEN",
    );
describe("optional authentication for public board details", () => {
  it("allows anonymous requests to continue without an authenticated user", async () => {
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

  it("continues after an invalid optional session without authenticating it", async () => {
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

describe("board write error mapping", () => {
  it("maps missing or unowned boards to a not-found API error", () => {
    const error = boardWriteError({ code: "P2025" });

    assert.ok(error instanceof ApiError);
    assert.equal(error.statusCode, 404);
    assert.equal(error.code, "BOARD_NOT_FOUND");
    assert.equal(boardWriteError(new Error("database unavailable")), null);
  });
});
