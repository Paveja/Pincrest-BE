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
