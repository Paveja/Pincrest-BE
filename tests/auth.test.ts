import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request, Response } from "express";
import { ApiError } from "../src/lib/api-error.js";
import { hashPassword, verifyPassword } from "../src/lib/auth.js";
import {
  createAuthMiddleware,
  type AuthenticatedUser,
} from "../src/middleware/auth.middleware.js";
import { loginSchema, registerSchema } from "../src/schemas/auth.schema.js";

const testUser: AuthenticatedUser = {
  id: "user_1",
  name: "Jane Doe",
  username: "janedoe",
  email: "jane@example.com",
  profileImage: null,
  bio: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

test("registration validates required fields and normalizes identifiers", () => {
  const result = registerSchema.safeParse({
    name: " Jane Doe ",
    username: "JaneDoe",
    email: "JANE@example.com",
    password: "Password123!",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.name, "Jane Doe");
    assert.equal(result.data.username, "janedoe");
    assert.equal(result.data.email, "jane@example.com");
  }

  assert.equal(
    registerSchema.safeParse({
      name: "Jane",
      username: "janedoe",
      email: "not-an-email",
      password: "Password123!",
    }).success,
    false,
  );
});

test("login rejects missing passwords and malformed emails", () => {
  assert.equal(
    loginSchema.safeParse({ email: "jane@example.com" }).success,
    false,
  );
  assert.equal(
    loginSchema.safeParse({ email: "not-an-email", password: "secret" })
      .success,
    false,
  );
});

test("password hashes verify without storing the plaintext password", async () => {
  const password = "Password123!";
  const passwordHash = await hashPassword(password);

  assert.notEqual(passwordHash, password);
  assert.equal(passwordHash.includes(password), false);
  assert.equal(await verifyPassword(password, passwordHash), true);
  assert.equal(await verifyPassword("wrong-password", passwordHash), false);
});

test("authentication middleware rejects a missing or invalid session", async () => {
  const middleware = createAuthMiddleware(async () => null);
  let receivedError: unknown;
  const request = { get: () => undefined } as unknown as Request;
  const response = { locals: {} } as Response;

  await middleware(request, response, (error) => {
    receivedError = error;
  });

  assert.ok(receivedError instanceof ApiError);
  assert.equal(receivedError.statusCode, 401);

  const invalidSessionMiddleware = createAuthMiddleware(async () => null);
  receivedError = undefined;
  const requestWithInvalidSession = {
    get: () => "pincrest_session=invalid-token",
  } as unknown as Request;

  await invalidSessionMiddleware(
    requestWithInvalidSession,
    response,
    (error) => {
      receivedError = error;
    },
  );

  assert.ok(receivedError instanceof ApiError);
  assert.equal(receivedError.statusCode, 401);
});

test("authentication middleware exposes the resolved current user", async () => {
  const middleware = createAuthMiddleware(async (token) =>
    token === "valid-token" ? testUser : null,
  );
  const request = {
    get: () => "pincrest_session=valid-token",
  } as unknown as Request;
  const response = { locals: {} } as Response;
  let nextCalled = false;

  await middleware(request, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(response.locals.authenticatedUser, testUser);
});
