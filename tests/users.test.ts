import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "../src/lib/api-error.js";
import {
  publicProfileParamsSchema,
  updateProfileSchema,
} from "../src/schemas/users.schema.js";

process.env.DATABASE_URL ??=
  "postgresql://profile-test:profile-test@127.0.0.1:5432/pincrest_test";
const [{ getPublicProfile, profileWriteError }, { prisma }] = await Promise.all(
  [import("../src/services/users.service.js"), import("../src/lib/prisma.js")],
);

describe("public profile lookup validation", () => {
  it("normalizes usernames using registration rules", () => {
    const result = publicProfileParamsSchema.parse({ username: "Jane_12" });

    assert.equal(result.username, "jane_12");
  });

  it("rejects usernames that do not meet registration rules", () => {
    assert.equal(
      publicProfileParamsSchema.safeParse({ username: "a" }).success,
      false,
    );
    assert.equal(
      publicProfileParamsSchema.safeParse({ username: "jane.doe" }).success,
      false,
    );
  });
});

describe("profile update error handling", () => {
  it("translates duplicate usernames and missing users into API errors", () => {
    const usernameConflict = profileWriteError({ code: "P2002" });
    const missingUser = profileWriteError({ code: "P2025" });

    assert.ok(usernameConflict instanceof ApiError);
    assert.equal(usernameConflict.statusCode, 409);
    assert.equal(usernameConflict.code, "USERNAME_TAKEN");
    assert.ok(missingUser instanceof ApiError);
    assert.equal(missingUser.statusCode, 404);
    assert.equal(profileWriteError(new Error("database unavailable")), null);
  });
});

describe("profile update validation", () => {
  it("accepts partial profile updates and nullable fields", () => {
    const result = updateProfileSchema.parse({
      username: "New_Name",
      bio: null,
      profileImage: null,
    });

    assert.deepEqual(result, {
      username: "new_name",
      bio: null,
      profileImage: null,
    });
  });

  it("rejects empty updates, invalid usernames, and fields outside the profile", () => {
    assert.equal(updateProfileSchema.safeParse({}).success, false);
    assert.equal(
      updateProfileSchema.safeParse({ username: "invalid.name" }).success,
      false,
    );
    assert.equal(
      updateProfileSchema.safeParse({ email: "attacker@example.com" }).success,
      false,
    );
  });
});

describe("public profile follow state", () => {
  it("returns the viewer relationship and defaults anonymous profiles to false", async () => {
    const profileRecord = {
      id: "target_1",
      name: "Jane Doe",
      username: "janedoe",
      profileImage: null,
      bio: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      _count: { followers: 0, following: 0, pins: 0 },
    };
    const originalUserFindUnique = prisma.user.findUnique;
    const originalFollowFindUnique = prisma.follow.findUnique;
    let followQuery: unknown;

    prisma.user.findUnique = (async () =>
      profileRecord) as typeof prisma.user.findUnique;
    prisma.follow.findUnique = (async (query: unknown) => {
      followQuery = query;
      return { id: "follow_1" };
    }) as typeof prisma.follow.findUnique;

    try {
      const followedProfile = await getPublicProfile("janedoe", "viewer_1");
      assert.equal(followedProfile.isFollowing, true);
      assert.deepEqual(followQuery, {
        where: {
          followerId_followingId: {
            followerId: "viewer_1",
            followingId: "target_1",
          },
        },
        select: { id: true },
      });

      prisma.follow.findUnique = (async () =>
        null) as typeof prisma.follow.findUnique;
      const notFollowedProfile = await getPublicProfile("janedoe", "viewer_2");
      const anonymousProfile = await getPublicProfile("janedoe");

      assert.equal(notFollowedProfile.isFollowing, false);
      assert.equal(anonymousProfile.isFollowing, false);
    } finally {
      prisma.user.findUnique = originalUserFindUnique;
      prisma.follow.findUnique = originalFollowFindUnique;
    }
  });
});
