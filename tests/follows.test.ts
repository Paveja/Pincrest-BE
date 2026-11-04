import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "../src/lib/api-error.js";
import {
  followUserParamsSchema,
  relationshipListQuerySchema,
} from "../src/schemas/users.schema.js";

process.env.DATABASE_URL ??=
  "postgresql://follow-test:follow-test@127.0.0.1:5432/pincrest_test";
const { assertCanFollow } = await import("../src/services/follows.service.js");

describe("follow route validation", () => {
  it("normalizes target usernames", () => {
    assert.deepEqual(followUserParamsSchema.parse({ username: "Jane_12" }), {
      username: "jane_12",
    });
  });

  it("rejects invalid usernames", () => {
    assert.equal(
      followUserParamsSchema.safeParse({ username: "invalid.name" }).success,
      false,
    );
  });

  it("validates and bounds follower-list pagination", () => {
    assert.deepEqual(relationshipListQuerySchema.parse({}), {
      page: 1,
      pageSize: 20,
    });
    assert.deepEqual(
      relationshipListQuerySchema.parse({ page: "2", pageSize: "50" }),
      { page: 2, pageSize: 50 },
    );
    assert.equal(
      relationshipListQuerySchema.safeParse({ pageSize: "101" }).success,
      false,
    );
  });
});

describe("follow self-protection", () => {
  it("allows following a different user", () => {
    assert.doesNotThrow(() => assertCanFollow("follower_1", "following_1"));
  });

  it("rejects attempts to follow yourself", () => {
    assert.throws(
      () => assertCanFollow("user_1", "user_1"),
      (error: unknown) =>
        error instanceof ApiError &&
        error.statusCode === 400 &&
        error.code === "CANNOT_FOLLOW_SELF",
    );
  });
});
