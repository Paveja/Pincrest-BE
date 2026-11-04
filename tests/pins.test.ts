import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createPinSchema,
  pinIdParamsSchema,
  pinListQuerySchema,
  updatePinSchema,
} from "../src/schemas/pins.schema.js";

const validPin = {
  title: "A quiet mountain overlook",
  description: "A scenic overlook above the valley.",
  imageUrl: "https://images.example.com/overlook.jpg",
  destinationUrl: "https://example.com/trail",
};

describe("Pin creation validation", () => {
  it("accepts required content and an optional destination", () => {
    assert.deepEqual(createPinSchema.parse(validPin), validPin);
    assert.deepEqual(
      createPinSchema.parse({
        title: validPin.title,
        description: validPin.description,
        imageUrl: validPin.imageUrl,
      }),
      {
        title: validPin.title,
        description: validPin.description,
        imageUrl: validPin.imageUrl,
      },
    );
  });

  it("rejects missing fields, empty text, unsafe URL schemes, and owner overrides", () => {
    assert.equal(
      createPinSchema.safeParse({ ...validPin, title: " " }).success,
      false,
    );
    assert.equal(
      createPinSchema.safeParse({
        ...validPin,
        imageUrl: "javascript:alert(1)",
      }).success,
      false,
    );
    assert.equal(
      createPinSchema.safeParse({ ...validPin, ownerId: "someone-else" })
        .success,
      false,
    );
    assert.equal(
      createPinSchema.safeParse({ title: validPin.title }).success,
      false,
    );
  });
});

describe("Pin update validation", () => {
  it("allows partial updates and clearing the destination URL", () => {
    assert.deepEqual(updatePinSchema.parse({ title: "Updated title" }), {
      title: "Updated title",
    });
    assert.deepEqual(updatePinSchema.parse({ destinationUrl: null }), {
      destinationUrl: null,
    });
  });

  it("rejects empty updates and fields outside the Pin", () => {
    assert.equal(updatePinSchema.safeParse({}).success, false);
    assert.equal(
      updatePinSchema.safeParse({ ownerId: "attacker" }).success,
      false,
    );
  });
});

describe("Pin request parameters", () => {
  it("validates Pin IDs and applies bounded pagination defaults", () => {
    assert.equal(
      pinIdParamsSchema.safeParse({ id: "c123456789012345678901234" }).success,
      true,
    );
    assert.equal(
      pinIdParamsSchema.safeParse({ id: "../private" }).success,
      false,
    );
    assert.equal(
      pinIdParamsSchema.safeParse({ id: "not-a-cuid" }).success,
      false,
    );
    assert.deepEqual(pinListQuerySchema.parse({}), { page: 1, limit: 20 });
    assert.deepEqual(pinListQuerySchema.parse({ page: "2", limit: "50" }), {
      page: 2,
      limit: 50,
    });
  });

  it("rejects out-of-range pagination values", () => {
    assert.equal(pinListQuerySchema.safeParse({ page: "0" }).success, false);
    assert.equal(
      pinListQuerySchema.safeParse({ page: "1000001" }).success,
      false,
    );
    assert.equal(pinListQuerySchema.safeParse({ limit: "101" }).success, false);
  });
});
