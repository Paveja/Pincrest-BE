import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";
import { ApiError } from "../lib/api-error.js";

const imageTypes = {
  "image/jpeg": {
    extension: "jpg",
    matches: (buffer: Buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  },
  "image/png": {
    extension: "png",
    matches: (buffer: Buffer) =>
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  "image/webp": {
    extension: "webp",
    matches: (buffer: Buffer) =>
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP",
  },
} as const;

let s3Client: S3Client | undefined;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.IMAGE_S3_REGION!,
      ...(env.IMAGE_S3_ENDPOINT ? { endpoint: env.IMAGE_S3_ENDPOINT } : {}),
      ...(env.IMAGE_S3_ACCESS_KEY_ID && env.IMAGE_S3_SECRET_ACCESS_KEY
        ? {
            credentials: {
              accessKeyId: env.IMAGE_S3_ACCESS_KEY_ID,
              secretAccessKey: env.IMAGE_S3_SECRET_ACCESS_KEY,
            },
          }
        : {}),
      forcePathStyle: env.IMAGE_S3_FORCE_PATH_STYLE,
    });
  }

  return s3Client;
}

export async function storeImage(file: Express.Multer.File): Promise<string> {
  const imageType = imageTypes[file.mimetype as keyof typeof imageTypes];

  if (!imageType || !imageType.matches(file.buffer)) {
    throw new ApiError(
      415,
      "UNSUPPORTED_IMAGE_FORMAT",
      "Upload a valid JPEG, PNG, or WebP image.",
    );
  }

  const key = `${randomUUID()}.${imageType.extension}`;

  if (env.IMAGE_STORAGE_DRIVER === "s3") {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: env.IMAGE_S3_BUCKET!,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } else {
    await mkdir(env.IMAGE_STORAGE_DIR, { recursive: true });
    await writeFile(path.join(env.IMAGE_STORAGE_DIR, key), file.buffer, {
      flag: "wx",
    });
  }

  return `${env.IMAGE_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
}
