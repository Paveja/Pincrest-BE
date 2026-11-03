import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loginSchema, registerSchema } from "../services/auth.schemas.js";
import { hashPassword, verifyPassword } from "./password.js";

const validRegistration = {
  name: "John Doe",
  username: "johndoe",
  email: "john@example.com",
  password: "Password123!",
};

describe("registration validation", () => {
  it("normalizes email and username", () => {
    const result = registerSchema.parse({
      ...validRegistration,
      username: "JohnDoe",
      email: "JOHN@EXAMPLE.COM ",
    });

    assert.equal(result.username, "johndoe");
    assert.equal(result.email, "john@example.com");
  });

  it("rejects missing fields, malformed email, and short passwords", () => {
    assert.equal(registerSchema.safeParse({}).success, false);
    assert.equal(
      registerSchema.safeParse({ ...validRegistration, email: "not-an-email" })
        .success,
      false,
    );
    assert.equal(
      registerSchema.safeParse({ ...validRegistration, password: "short" })
        .success,
      false,
    );
  });
});

describe("login validation", () => {
  it("requires a valid email and non-empty password", () => {
    assert.equal(
      loginSchema.safeParse({ email: "invalid", password: "secret" }).success,
      false,
    );
    assert.equal(
      loginSchema.safeParse({ email: "john@example.com", password: "" })
        .success,
      false,
    );
  });
});

describe("password hashing", () => {
  it("stores a salted scrypt hash and verifies only the correct password", async () => {
    const encodedHash = await hashPassword("Password123!");

    assert.notEqual(encodedHash, "Password123!");
    assert.notEqual(encodedHash, await hashPassword("Password123!"));
    assert.equal(await verifyPassword("Password123!", encodedHash), true);
    assert.equal(await verifyPassword("WrongPassword123!", encodedHash), false);
  });

  it("rejects malformed stored hashes", async () => {
    assert.equal(await verifyPassword("Password123!", "not-a-hash"), false);
  });
});
