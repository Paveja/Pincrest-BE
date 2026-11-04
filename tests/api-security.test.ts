import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";
import type { Response } from "express";
import { after, describe, it } from "node:test";

process.env.DATABASE_URL ??=
  "postgresql://pincrest-test:pincrest-test@127.0.0.1:5432/pincrest_test?sslmode=disable";
process.env.FRONTEND_ORIGIN = "https://frontend.pincrest.test";
process.env.FRONTEND_ORIGINS =
  "https://frontend.pincrest.test,https://admin.pincrest.test";
process.env.NODE_ENV = "production";

const [{ app }, { clearSessionCookie, setSessionCookie }] = await Promise.all([
  import("../src/app.js"),
  import("../src/lib/auth-cookie.js"),
]);
const { prisma } = await import("../src/lib/prisma.js");

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

describe("protected API routes", () => {
  it("rejects unauthenticated requests across auth, user, Pin, comment, and upload APIs", async () => {
    const routes = [
      ["GET", "/api/v1/auth/me"],
      ["GET", "/api/v1/users/me"],
      ["PATCH", "/api/v1/users/me"],
      ["POST", "/api/v1/users/someone/follow"],
      ["DELETE", "/api/v1/users/someone/follow"],
      ["GET", "/api/v1/pins/mine"],
      ["POST", "/api/v1/pins"],
      ["PATCH", "/api/v1/pins/c123456789012345678901234"],
      ["DELETE", "/api/v1/pins/c123456789012345678901234"],
      ["POST", "/api/v1/pins/c123456789012345678901234/like"],
      ["PUT", "/api/v1/pins/c123456789012345678901234/like"],
      ["DELETE", "/api/v1/pins/c123456789012345678901234/like"],
      ["POST", "/api/v1/pins/c123456789012345678901234/comments"],
      ["PATCH", "/api/v1/comments/c123456789012345678901234"],
      ["DELETE", "/api/v1/comments/c123456789012345678901234"],
      ["POST", "/api/v1/uploads/images"],
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

describe("public user Pin route", () => {
  it("returns the requested user’s Pins in the standard Pin shape", async () => {
    const originalUserFindUnique = prisma.user.findUnique;
    const originalPinFindMany = prisma.pin.findMany;
    const originalPinCount = prisma.pin.count;
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const pinRecord = {
      id: "pin_ava_1",
      title: "Ava’s coastal garden",
      description: "A compact garden overlooking the coast.",
      imageUrl: "https://images.example.com/ava-garden.jpg",
      destinationUrl: null,
      ownerId: "ava_user_id",
      createdAt,
      updatedAt: createdAt,
      owner: {
        id: "ava_user_id",
        name: "Ava Green",
        username: "ava",
        profileImage: null,
      },
      _count: { likes: 2 },
    };

    prisma.user.findUnique = (async () => ({
      id: "ava_user_id",
    })) as typeof prisma.user.findUnique;
    prisma.pin.findMany = (async () => [
      pinRecord,
    ]) as typeof prisma.pin.findMany;
    prisma.pin.count = (async () => 1) as typeof prisma.pin.count;

    try {
      const response = await fetch(`${origin}/api/v1/users/ava/pins?page=1`);
      const body = await response.json();
      const [pin] = body.data.pins;

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.pins.length, 1);
      assert.equal(pin.title, "Ava’s coastal garden");
      assert.equal(pin.imageUrl, "https://images.example.com/ava-garden.jpg");
      assert.equal(pin.creator.username, "ava");
      assert.equal(pin.likeCount, 2);
      assert.equal(pin.isLiked, false);
    } finally {
      prisma.user.findUnique = originalUserFindUnique;
      prisma.pin.findMany = originalPinFindMany;
      prisma.pin.count = originalPinCount;
    }
  });
});

describe("CORS and security response headers", () => {
  it("allows credentialed preflight requests only from the configured frontend", async () => {
    const allowed = await fetch(`${origin}/api/v1/pins`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://frontend.pincrest.test",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    });

    assert.equal(allowed.status, 204);
    assert.equal(
      allowed.headers.get("access-control-allow-origin"),
      "https://frontend.pincrest.test",
    );
    assert.equal(
      allowed.headers.get("access-control-allow-credentials"),
      "true",
    );

    const rejected = await fetch(`${origin}/api/v1/pins`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://untrusted.pincrest.test",
        "Access-Control-Request-Method": "POST",
      },
    });

    assert.equal(rejected.headers.get("access-control-allow-origin"), null);

    const secondAllowedOrigin = await fetch(`${origin}/api/v1/pins`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://admin.pincrest.test",
        "Access-Control-Request-Method": "PATCH",
      },
    });

    assert.equal(secondAllowedOrigin.status, 204);
    assert.equal(
      secondAllowedOrigin.headers.get("access-control-allow-origin"),
      "https://admin.pincrest.test",
    );
    assert.notEqual(rejected.headers.get("access-control-allow-origin"), "*");
  });

  it("sets baseline security headers and production HSTS", async () => {
    const response = await fetch(`${origin}/api/v1/not-a-route`);

    assert.equal(response.status, 404);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), null);
    assert.equal(
      response.headers.get("content-security-policy"),
      "frame-ancestors 'self' https://revolte.ai https://*.revolte.ai",
    );
    assert.equal(
      response.headers.get("referrer-policy"),
      "strict-origin-when-cross-origin",
    );
    assert.equal(
      response.headers.get("strict-transport-security"),
      "max-age=31536000",
    );
  });
});

describe("production session-cookie options", () => {
  it("uses secure, HttpOnly, same-site cookies scoped to the API", () => {
    let cookie:
      | { name: string; value: string; options: Record<string, unknown> }
      | undefined;
    const response = {
      cookie: (
        name: string,
        value: string,
        options: Record<string, unknown>,
      ) => {
        cookie = { name, value, options };
      },
      clearCookie: (name: string, options: Record<string, unknown>) => {
        cookie = { name, value: "", options };
      },
    } as unknown as Response;

    setSessionCookie(response, "session-token");

    assert.equal(cookie?.name, "pincrest_session");
    assert.equal(cookie?.value, "session-token");
    assert.equal(cookie?.options.httpOnly, true);
    assert.equal(cookie?.options.secure, true);
    assert.equal(cookie?.options.sameSite, "none");
    assert.equal(cookie?.options.path, "/api/v1");
    assert.equal(typeof cookie?.options.maxAge, "number");

    clearSessionCookie(response);
    assert.equal(cookie?.value, "");
    assert.equal(cookie?.options.path, "/api/v1");
  });
});
