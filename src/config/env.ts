import "dotenv/config";
import { z } from "zod";

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    FRONTEND_ORIGIN: z.url().default("http://localhost:3000"),
    FRONTEND_ORIGINS: z
      .string()
      .optional()
      .transform((value) =>
        value
          ?.split(",")
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      .pipe(
        z
          .array(
            z.url().refine((origin) => {
              const parsedOrigin = new URL(origin);
              return (
                (parsedOrigin.protocol === "http:" ||
                  parsedOrigin.protocol === "https:") &&
                parsedOrigin.origin === origin
              );
            }, "Frontend entries must be exact HTTP or HTTPS origins."),
          )
          .min(1)
          .optional(),
      ),
    IMAGE_STORAGE_DRIVER: z.enum(["filesystem", "s3"]).default("filesystem"),
    IMAGE_STORAGE_DIR: z.string().min(1).default("./uploads/images"),
    IMAGE_PUBLIC_BASE_URL: z.url().optional(),
    IMAGE_MAX_FILE_SIZE_BYTES: z.coerce
      .number()
      .int()
      .min(1)
      .max(20 * 1024 * 1024)
      .default(5 * 1024 * 1024),
    IMAGE_S3_BUCKET: z.string().min(1).optional(),
    IMAGE_S3_REGION: z.string().min(1).optional(),
    IMAGE_S3_ENDPOINT: z.url().optional(),
    IMAGE_S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    IMAGE_S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    IMAGE_S3_FORCE_PATH_STYLE: z.stringbool().default(false),
    DATABASE_URL: z
      .string()
      .url()
      .refine((value) => value.startsWith("postgresql://"), {
        message: "DATABASE_URL must use the postgresql:// protocol.",
      }),
  })
  .superRefine((config, context) => {
    if (config.IMAGE_STORAGE_DRIVER === "s3") {
      if (!config.IMAGE_S3_BUCKET) {
        context.addIssue({
          code: "custom",
          path: ["IMAGE_S3_BUCKET"],
          message:
            "IMAGE_S3_BUCKET is required when IMAGE_STORAGE_DRIVER is s3.",
        });
      }

      if (!config.IMAGE_S3_REGION) {
        context.addIssue({
          code: "custom",
          path: ["IMAGE_S3_REGION"],
          message:
            "IMAGE_S3_REGION is required when IMAGE_STORAGE_DRIVER is s3.",
        });
      }

      if (!config.IMAGE_PUBLIC_BASE_URL) {
        context.addIssue({
          code: "custom",
          path: ["IMAGE_PUBLIC_BASE_URL"],
          message:
            "IMAGE_PUBLIC_BASE_URL is required when IMAGE_STORAGE_DRIVER is s3.",
        });
      }
    }

    if (
      Boolean(config.IMAGE_S3_ACCESS_KEY_ID) !==
      Boolean(config.IMAGE_S3_SECRET_ACCESS_KEY)
    ) {
      context.addIssue({
        code: "custom",
        path: ["IMAGE_S3_ACCESS_KEY_ID"],
        message: "S3 access key and secret must be configured together.",
      });
    }
  });

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  const issues = parsedEnvironment.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${issues}`);
}

export const env = {
  ...parsedEnvironment.data,
  FRONTEND_ORIGINS: parsedEnvironment.data.FRONTEND_ORIGINS ?? [
    parsedEnvironment.data.FRONTEND_ORIGIN,
  ],
  IMAGE_PUBLIC_BASE_URL:
    parsedEnvironment.data.IMAGE_PUBLIC_BASE_URL ??
    `http://localhost:${parsedEnvironment.data.PORT}/uploads`,
};
