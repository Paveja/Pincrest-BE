import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchQuerySchema } from "../src/schemas/search.schema.js";

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
});
