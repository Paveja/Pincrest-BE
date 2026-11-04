import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import express from "express";
import { likeListQuerySchema } from "../src/schemas/likes.schema.js";
import { pinIdParamsSchema } from "../src/schemas/pins.schema.js";

process.env.DATABASE_URL ??=
  "postgresql://likes-test:likes-test@127.0.0.1:5432/pincrest_test?sslmode=disable";
const [{ pinsRouter }, { errorMiddleware }] = await Promise.all([
  import("../src/routes/pins.routes.js"),
  import("../src/middleware/error.middleware.js"),
]);

const app = express();
app.use("/api/v1/pins", pinsRouter);
app.use(errorMiddleware);
const server = createServer(app);

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

describe("Pin like request validation", () => {
  it("validates pin IDs and applies bounded pagination defaults", () => {
    assert.deepEqual(
      pinIdParamsSchema.parse({ id: "c123456789012345678901234" }),
      { id: "c123456789012345678901234" },
    );
    assert.deepEqual(likeListQuerySchema.parse({}), { page: 1, limit: 20 });
    assert.deepEqual(likeListQuerySchema.parse({ page: "2", limit: "50" }), {
      page: 2,
      limit: 50,
    });
  });

  it("rejects invalid IDs, excessive page sizes, and unknown query fields", () => {
    assert.equal(pinIdParamsSchema.safeParse({ id: "invalid" }).success, false);
    assert.equal(likeListQuerySchema.safeParse({ page: "0" }).success, false);
    assert.equal(
      likeListQuerySchema.safeParse({ limit: "101" }).success,
      false,
    );
    assert.equal(
      likeListQuerySchema.safeParse({ unknown: "value" }).success,
      false,
    );
  });
});

describe("Pin like routes", () => {
  it("rejects unauthenticated like and unlike requests", async () => {
    for (const method of ["POST", "PUT", "DELETE"] as const) {
      const response = await fetch(
        `${origin}/api/v1/pins/c123456789012345678901234/like`,
        { method },
      );
      const body = await response.json();

      assert.equal(response.status, 401);
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
