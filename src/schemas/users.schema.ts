import { z } from "zod";

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9_]+$/);

export const publicProfileParamsSchema = z.object({
  username: usernameSchema,
});

export const followUserParamsSchema = publicProfileParamsSchema;

export const relationshipListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    username: usernameSchema.optional(),
    bio: z.string().trim().max(500).nullable().optional(),
    profileImage: z.string().trim().max(2048).nullable().optional(),
  })
  .strict()
  .refine(
    (profile) => Object.values(profile).some((value) => value !== undefined),
    {
      message: "At least one profile field must be provided.",
    },
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type FollowUserParams = z.infer<typeof followUserParamsSchema>;
export type RelationshipListQuery = z.infer<typeof relationshipListQuerySchema>;
