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
  });
});
