import type { RequestHandler } from "express";
import type { AuthenticatedUser } from "../middleware/auth.middleware.js";
import type {
  CreatePinInput,
  PinListQuery,
  UpdatePinInput,
} from "../schemas/pins.schema.js";
import {
  createPin as createPinRecord,
  deleteOwnedPin,
  getMyPins,
  getPin,
  getPins,
  updateOwnedPin,
} from "../services/pins.service.js";

export const listPins: RequestHandler = async (_request, response) => {
  const query = response.locals.validatedRequest as PinListQuery;
  const user = response.locals.authenticatedUser as
    AuthenticatedUser | undefined;
  const result = await getPins(query, user?.id);

  response.status(200).json({ success: true, data: result });
};

export const listMyPins: RequestHandler = async (_request, response) => {
  const user = response.locals.authenticatedUser as AuthenticatedUser;
  const query = response.locals.validatedRequest as PinListQuery;
  const result = await getMyPins(user.id, query, user.id);

  response.status(200).json({ success: true, data: result });
};

export const getPinById: RequestHandler = async (_request, response) => {
  const { id } = response.locals.validatedRequest as { id: string };
  const user = response.locals.authenticatedUser as
    AuthenticatedUser | undefined;
  const pin = await getPin(id, user?.id);

  response.status(200).json({ success: true, data: { pin } });
};

export const createPin: RequestHandler = async (_request, response) => {
  const user = response.locals.authenticatedUser as AuthenticatedUser;
  const input = response.locals.validatedRequest as CreatePinInput;
  const pin = await createPinRecord(user.id, input);

  response.status(201).json({ success: true, data: { pin } });
};

export const patchPin: RequestHandler = async (_request, response) => {
  const user = response.locals.authenticatedUser as AuthenticatedUser;
  const { id } = response.locals.validatedParams as { id: string };
  const input = response.locals.validatedRequest as UpdatePinInput;
  const pin = await updateOwnedPin(user.id, id, input);

  response.status(200).json({ success: true, data: { pin } });
};

export const removePin: RequestHandler = async (_request, response) => {
  const user = response.locals.authenticatedUser as AuthenticatedUser;
  const { id } = response.locals.validatedParams as { id: string };
  await deleteOwnedPin(user.id, id);

  response.status(200).json({ success: true, data: { id } });
};
