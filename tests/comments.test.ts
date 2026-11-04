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
const [{ getPinComments, ownedCommentWhere }, { prisma }] = await Promise.all([
  import("../src/services/comments.service.js"),
  import("../src/lib/prisma.js"),
]);

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

describe("comment list response", () => {
  it("returns author and hasNextPage in the expected response shape", async () => {
    const originalPinFindUnique = prisma.pin.findUnique;
    const originalCommentFindMany = prisma.comment.findMany;
    const originalCommentCount = prisma.comment.count;
    const createdAt = new Date("2026-02-01T00:00:00.000Z");
    const author = {
      id: "user_1",
      name: "Avery Stone",
      username: "averystone",
      profileImage: null,
    };
    const comment = {
      id: "comment_1",
      content: "A useful note.",
      userId: author.id,
      pinId: "pin_1",
      createdAt,
      updatedAt: createdAt,
      user: author,
    };

    prisma.pin.findUnique = (async () => ({
      id: "pin_1",
    })) as typeof prisma.pin.findUnique;
    prisma.comment.findMany = (async () => [
      comment,
    ]) as typeof prisma.comment.findMany;
    prisma.comment.count = (async () => 5) as typeof prisma.comment.count;

    try {
      const result = await getPinComments("pin_1", { page: 2, limit: 2 });
      const [returnedComment] = result.comments;

      assert.deepEqual(returnedComment.author, author);
      assert.equal("creator" in returnedComment, false);
      assert.deepEqual(result.pagination, {
        page: 2,
        limit: 2,
        total: 5,
        totalPages: 3,
        hasNextPage: true,
      });
    } finally {
      prisma.pin.findUnique = originalPinFindUnique;
      prisma.comment.findMany = originalCommentFindMany;
      prisma.comment.count = originalCommentCount;
    }
  });
});
