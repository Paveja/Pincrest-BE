import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchQuerySchema } from "../src/schemas/search.schema.js";

process.env.DATABASE_URL ??=
  "postgresql://search-test:search-test@127.0.0.1:5432/pincrest_test?sslmode=disable";
const [{ searchUsers }, { prisma }] = await Promise.all([
  import("../src/services/search.service.js"),
  import("../src/lib/prisma.js"),
]);

describe("search query validation", () => {
  it("defaults an omitted query and pagination values", () => {
    assert.deepEqual(searchQuerySchema.parse({}), {
      q: "",
      page: 1,
      limit: 20,
    });
  });

  it("trims query text and accepts pagination overrides", () => {
    assert.deepEqual(
      searchQuerySchema.parse({ q: "  Art Deco  ", page: "2", limit: "50" }),
      { q: "Art Deco", page: 2, limit: 50 },
    );
  });

  it("accepts a blank query for an empty-result search", () => {
    assert.deepEqual(searchQuerySchema.parse({ q: "   " }), {
      q: "",
      page: 1,
      limit: 20,
    });
  });

  it("rejects malformed queries and out-of-range values", () => {
    assert.equal(searchQuerySchema.safeParse({ q: 42 }).success, false);
    assert.equal(
      searchQuerySchema.safeParse({ q: "x".repeat(201) }).success,
      false,
    );
    assert.equal(searchQuerySchema.safeParse({ page: "0" }).success, false);
    assert.equal(searchQuerySchema.safeParse({ limit: "101" }).success, false);
    assert.equal(
      searchQuerySchema.safeParse({ unexpected: "value" }).success,
      false,
    );
  });

  it("includes each user's bio in the search result", async () => {
    const originalUserFindMany = prisma.user.findMany;
    const originalUserCount = prisma.user.count;
    const user = {
      id: "user_1",
      name: "Avery Stone",
      username: "averystone",
      profileImage: null,
      bio: "Collects mid-century ceramics.",
    };
    let selectedFields: unknown;

    prisma.user.findMany = (async (args: { select?: unknown }) => {
      selectedFields = args.select;
      return [user];
    }) as typeof prisma.user.findMany;
    prisma.user.count = (async () => 1) as typeof prisma.user.count;

    try {
      const result = await searchUsers({ q: "avery", page: 1, limit: 20 });

      assert.deepEqual(selectedFields, {
        id: true,
        name: true,
        username: true,
        profileImage: true,
        bio: true,
      });
      assert.deepEqual(result.users, [user]);
    } finally {
      prisma.user.findMany = originalUserFindMany;
      prisma.user.count = originalUserCount;
    }
  });
});
