import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  commentListQuerySchema,
  commentParamsSchema,
  createCommentSchema,
  updateCommentSchema,
} from "../src/schemas/comments.schema.js";
process.env.DATABASE_URL ??=
  "postgresql://comments-test:comments-test@127.0.0.1:5432/pincrest_test";
const { ownedCommentWhere } =
  await import("../src/services/comments.service.js");

const validComment = { content: "A helpful note about this Pin." };

describe("comment content validation", () => {
  it("accepts trimmed non-empty content for creation and updates", () => {
    assert.deepEqual(createCommentSchema.parse(validComment), validComment);
    assert.deepEqual(updateCommentSchema.parse({ content: "Updated note" }), {
      content: "Updated note",
    });
  });

  it("rejects blank, oversized, and unexpected content fields", () => {
    assert.equal(
      createCommentSchema.safeParse({ content: "  " }).success,
      false,
    );
    assert.equal(
      createCommentSchema.safeParse({ content: "x".repeat(2001) }).success,
      false,
    );
    assert.equal(
      createCommentSchema.safeParse({ ...validComment, userId: "another-user" })
        .success,
      false,
    );
  });
});

describe("comment request parameters and pagination", () => {
  it("validates comment IDs and defaults to bounded pagination", () => {
    assert.equal(
      commentParamsSchema.safeParse({ commentId: "c123456789012345678901234" })
        .success,
      true,
    );
    assert.deepEqual(commentListQuerySchema.parse({}), { page: 1, limit: 20 });
    assert.deepEqual(commentListQuerySchema.parse({ page: "2", limit: "50" }), {
      page: 2,
      limit: 50,
    });
  });

  it("rejects malformed IDs and out-of-range pagination", () => {
    assert.equal(
      commentParamsSchema.safeParse({ commentId: "../private" }).success,
      false,
    );
    assert.equal(
      commentListQuerySchema.safeParse({ page: "0" }).success,
      false,
    );
    assert.equal(
      commentListQuerySchema.safeParse({ limit: "101" }).success,
      false,
    );
  });
});

describe("comment ownership query", () => {
  it("scopes writes to both the requested comment and authenticated creator", () => {
    assert.deepEqual(ownedCommentWhere("owner-1", "comment-1"), {
      id: "comment-1",
      userId: "owner-1",
    });
    assert.notDeepEqual(
      ownedCommentWhere("another-user", "comment-1"),
      ownedCommentWhere("owner-1", "comment-1"),
    );
  });
});
