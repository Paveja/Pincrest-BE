import { Router, type RequestHandler } from "express";
import multer from "multer";
import { env } from "../config/env.js";
import { ApiError } from "../lib/api-error.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { storeImage } from "../services/image-storage.service.js";

const acceptedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const parseImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.IMAGE_MAX_FILE_SIZE_BYTES,
    files: 1,
    fields: 0,
    parts: 1,
  },
  fileFilter: (_request, file, callback) => {
    if (!acceptedMimeTypes.has(file.mimetype)) {
      return callback(
        new ApiError(
          415,
          "UNSUPPORTED_IMAGE_FORMAT",
          "Upload a JPEG, PNG, or WebP image.",
        ),
      );
    }

    return callback(null, true);
  },
}).single("image");

function imageUploadMiddleware(): RequestHandler {
  return (request, response, next) => {
    parseImageUpload(request, response, (error?: unknown) => {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return next(
            new ApiError(
              413,
              "IMAGE_TOO_LARGE",
              "Image exceeds the maximum allowed file size.",
            ),
          );
        }

        return next(
          new ApiError(
            400,
            "INVALID_IMAGE_UPLOAD",
            "Request must contain one image in the image field.",
          ),
        );
      }

      if (error instanceof ApiError) {
        return next(error);
      }

      if (error) {
        return next(
          new ApiError(
            400,
            "INVALID_MULTIPART_REQUEST",
            "Request must contain a valid image multipart form.",
          ),
        );
      }

      return next();
    });
  };
}

export type ImageStore = (file: Express.Multer.File) => Promise<string>;

export function createUploadsRouter(
  options: { authenticate?: RequestHandler; saveImage?: ImageStore } = {},
) {
  const router = Router();
  const authenticate = options.authenticate ?? requireAuth;
  const saveImage = options.saveImage ?? storeImage;

  router.post(
    "/images",
    authenticate,
    imageUploadMiddleware(),
    async (request, response, next) => {
      if (!request.file) {
        return next(
          new ApiError(400, "IMAGE_REQUIRED", "An image file is required."),
        );
      }

      try {
        const url = await saveImage(request.file);

        return response.status(201).json({
          success: true,
          data: { url },
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

export const uploadsRouter = createUploadsRouter();
