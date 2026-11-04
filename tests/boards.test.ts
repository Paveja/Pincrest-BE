import assert from "node:assert/strict";
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
