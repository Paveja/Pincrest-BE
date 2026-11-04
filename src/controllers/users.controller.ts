import type { RequestHandler } from "express";
import type { AuthenticatedUser } from "../middleware/auth.middleware.js";
import type { PinListQuery } from "../schemas/pins.schema.js";
import type { UpdateProfileInput } from "../schemas/users.schema.js";
import {
  getCurrentProfile,
  getPublicProfile,
  getPublicUserPins as getPublicUserPinsRecord,
  updateCurrentProfile,
} from "../services/users.service.js";

export const getPublicUserProfile: RequestHandler = async (
  _request,
  response,
) => {
  const { username } = response.locals.validatedParams as { username: string };
  const viewer = response.locals.authenticatedUser as
    AuthenticatedUser | undefined;
  const user = await getPublicProfile(username, viewer?.id);

  response.status(200).json({
    success: true,
    data: { user },
  });
};

export const listPublicUserPins: RequestHandler = async (
  _request,
  response,
) => {
  const { username } = response.locals.validatedParams as { username: string };
  const query = response.locals.validatedQuery as PinListQuery;
  const viewer = response.locals.authenticatedUser as
    AuthenticatedUser | undefined;
  const result = await getPublicUserPinsRecord(username, query, viewer?.id);

  response.status(200).json({ success: true, data: result });
};

export const getMyProfile: RequestHandler = async (_request, response) => {
  const authenticatedUser = response.locals
    .authenticatedUser as AuthenticatedUser;
  const user = await getCurrentProfile(authenticatedUser.id);

  response.status(200).json({
    success: true,
    data: { user },
  });
};

export const patchMyProfile: RequestHandler = async (_request, response) => {
  const authenticatedUser = response.locals
    .authenticatedUser as AuthenticatedUser;
  const input = response.locals.validatedRequest as UpdateProfileInput;
  const user = await updateCurrentProfile(authenticatedUser.id, input);

  response.status(200).json({
    success: true,
    data: { user },
  });
};
