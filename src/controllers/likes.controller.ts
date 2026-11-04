import type { RequestHandler } from "express";
import type { AuthenticatedUser } from "../middleware/auth.middleware.js";
import type { LikeListQuery } from "../schemas/likes.schema.js";
import {
  getPinLikes,
  likePin as likePinRecord,
  unlikePin as unlikePinRecord,
} from "../services/likes.service.js";

export const likePin: RequestHandler = async (_request, response) => {
  const user = response.locals.authenticatedUser as AuthenticatedUser;
  const { id: pinId } = response.locals.validatedParams as { id: string };
  const result = await likePinRecord(user.id, pinId);

  response.status(200).json({ success: true, data: result });
};

export const unlikePin: RequestHandler = async (_request, response) => {
  const user = response.locals.authenticatedUser as AuthenticatedUser;
  const { id: pinId } = response.locals.validatedParams as { id: string };
  const result = await unlikePinRecord(user.id, pinId);

  response.status(200).json({ success: true, data: result });
};

export const listPinLikes: RequestHandler = async (_request, response) => {
  const { id: pinId } = response.locals.validatedParams as { id: string };
  const query = response.locals.validatedQuery as LikeListQuery;
  const user = response.locals.authenticatedUser as
    AuthenticatedUser | undefined;
  const result = await getPinLikes(pinId, query, user?.id);

  response.status(200).json({ success: true, data: result });
};
