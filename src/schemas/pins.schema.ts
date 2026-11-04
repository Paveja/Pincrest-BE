import { z } from "zod";

const pinTextSchema = (max: number) => z.string().trim().min(1).max(max);

const httpUrlSchema = z
  .url()
  .max(2048)
  .refine((value) => /^https?:\/\//i.test(value), {
    message: "URL must use HTTP or HTTPS.",
  });

export const pinIdParamsSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^c[a-z0-9]{24}$/),
});

export const pinListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const createPinSchema = z
  .object({
    title: pinTextSchema(150),
    description: pinTextSchema(5000),
    imageUrl: httpUrlSchema,
    destinationUrl: httpUrlSchema.optional(),
  })
  .strict();

export const updatePinSchema = z
  .object({
    title: pinTextSchema(150).optional(),
    description: pinTextSchema(5000).optional(),
    imageUrl: httpUrlSchema.optional(),
    destinationUrl: httpUrlSchema.nullable().optional(),
  })
  .strict()
  .refine((pin) => Object.values(pin).some((value) => value !== undefined), {
    message: "At least one Pin field must be provided.",
  });

export type CreatePinInput = z.infer<typeof createPinSchema>;
export type UpdatePinInput = z.infer<typeof updatePinSchema>;
export type PinListQuery = z.infer<typeof pinListQuerySchema>;
