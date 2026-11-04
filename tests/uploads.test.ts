import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { createServer, type Server } from "node:http";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import express, { type RequestHandler } from "express";
import { AddressInfo } from "node:net";

process.env.DATABASE_URL ??=
  "postgresql://uploads-test:uploads-test@127.0.0.1:5432/pincrest_test";
process.env.IMAGE_STORAGE_DRIVER = "filesystem";
process.env.IMAGE_MAX_FILE_SIZE_BYTES = "64";

const imageDirectory = path.join(
  process.cwd(),
  "uploads",
  `image-tests-${randomUUID()}`,
);
await mkdir(imageDirectory, { recursive: true });
process.env.IMAGE_STORAGE_DIR = imageDirectory;

const app = express();
let server: Server;

function listen(application: express.Express, port = 0): Promise<Server> {
  return new Promise((resolve, reject) => {
    const nextServer = createServer(application);
    nextServer.once("error", reject);
    nextServer.listen(port, "127.0.0.1", () => {
      nextServer.removeListener("error", reject);
      resolve(nextServer);
    });
  });
}

server = await listen(app);
const address = server.address() as AddressInfo;
const origin = `http://127.0.0.1:${address.port}`;
process.env.IMAGE_PUBLIC_BASE_URL = `${origin}/uploads`;

const [{ env }, { uploadsRouter, createUploadsRouter }, { errorMiddleware }] =
  await Promise.all([
    import("../src/config/env.js"),
    import("../src/routes/uploads.routes.js"),
    import("../src/middleware/error.middleware.js"),
  ]);

const allowAuthenticatedUser: RequestHandler = (_request, response, next) => {
  response.locals.authenticatedUser = { id: "test-user" };
  next();
};

app.use("/uploads", express.static(env.IMAGE_STORAGE_DIR, { index: false }));
app.use("/api/v1/uploads", uploadsRouter);
app.use(
  "/test/uploads",
  createUploadsRouter({
    authenticate: allowAuthenticatedUser,
  }),
);
app.use(
  "/test/storage-error",
  createUploadsRouter({
    authenticate: allowAuthenticatedUser,
    saveImage: async () => {
      throw new Error("storage credentials must not be returned");
    },
  }),
);
app.use(errorMiddleware);

async function upload(
  file: Buffer | undefined,
  mimeType = "image/png",
  fieldName = "image",
  route = "/test/uploads/images",
): Promise<Response> {
  const form = new FormData();

  if (file) {
    form.append(fieldName, new Blob([file], { type: mimeType }), "upload.bin");
  }

  return fetch(`${origin}${route}`, {
    method: "POST",
    body: form,
  });
}

async function close(serverToClose: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    serverToClose.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

after(async () => {
  if (server.listening) {
    await close(server);
  }
  await rm(imageDirectory, { recursive: true, force: true });
});

describe("image upload endpoint", () => {
  it("stores supported image formats and returns accessible unique URLs", async () => {
    const fixtures = [
      {
        mimeType: "image/jpeg",
        bytes: Buffer.from([0xff, 0xd8, 0xff]),
      },
      {
        mimeType: "image/png",
        bytes: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      },
      {
        mimeType: "image/webp",
        bytes: Buffer.from("RIFF0000WEBP"),
      },
    ];
    const urls: string[] = [];

    for (const fixture of fixtures) {
      const response = await upload(fixture.bytes, fixture.mimeType);
      const body = (await response.json()) as {
        data: { url: string };
      };

      assert.equal(response.status, 201);
      assert.match(body.data.url, new RegExp(`^${origin}/uploads/`));
      urls.push(body.data.url);

      const imageResponse = await fetch(body.data.url);
      assert.equal(imageResponse.status, 200);
      assert.deepEqual(
        Buffer.from(await imageResponse.arrayBuffer()),
        fixture.bytes,
      );
    }

    const repeatResponse = await upload(fixtures[1]!.bytes, "image/png");
    const repeatBody = (await repeatResponse.json()) as {
      data: { url: string };
    };

    assert.equal(repeatResponse.status, 201);
    assert.equal(new Set([...urls, repeatBody.data.url]).size, 4);
  });

  it("rejects unauthenticated uploads before processing the body", async () => {
    const response = await upload(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      "image/png",
      "image",
      "/api/v1/uploads/images",
    );
    const body = (await response.json()) as {
      error: { code: string };
    };

    assert.equal(response.status, 401);
    assert.equal(body.error.code, "UNAUTHENTICATED");
  });

  it("rejects unsupported media types and invalid image signatures", async () => {
    const unsupportedResponse = await upload(
      Buffer.from("not an image"),
      "text/plain",
    );
    const invalidSignatureResponse = await upload(
      Buffer.from("not a PNG"),
      "image/png",
    );

    assert.equal(unsupportedResponse.status, 415);
    assert.equal(invalidSignatureResponse.status, 415);
  });

  it("rejects oversized files and missing image fields", async () => {
    const oversizedResponse = await upload(
      Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        Buffer.alloc(57),
      ]),
    );
    const missingFileResponse = await upload(undefined);

    assert.equal(oversizedResponse.status, 413);
    assert.equal(missingFileResponse.status, 400);
  });

  it("returns a safe error response when storage fails", async () => {
    const response = await upload(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      "image/png",
      "image",
      "/test/storage-error/images",
    );
    const body = (await response.json()) as {
      error: { message: string };
    };

    assert.equal(response.status, 500);
    assert.equal(body.error.message, "An unexpected error occurred.");
  });

  it("keeps uploaded files available after the serving process restarts", async () => {
    const response = await upload(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      "image/png",
    );
    const body = (await response.json()) as {
      data: { url: string };
    };

    assert.equal(response.status, 201);
    await close(server);

    const restartedApp = express();
    restartedApp.use("/uploads", express.static(env.IMAGE_STORAGE_DIR));
    restartedApp.use(errorMiddleware);
    server = await listen(restartedApp, address.port);

    const persistedResponse = await fetch(body.data.url);
    assert.equal(persistedResponse.status, 200);
    assert.deepEqual(
      Buffer.from(await persistedResponse.arrayBuffer()),
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
  });
});
