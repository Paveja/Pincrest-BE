import type { RequestHandler } from "express";
import type { AuthenticatedUser } from "../middleware/auth.middleware.js";
import type {
  BoardParams,
  BoardPinParams,
  GetBoardPinsQuery,
  SaveBoardPinInput,
} from "../schemas/boards.schema.js";
import {
  getBoardPins,
  removePinFromBoard,
  savePinToBoard,
} from "../services/boards.service.js";

export const saveBoardPin: RequestHandler = async (_request, response) => {
  const { boardId } = response.locals.validatedParams as BoardParams;
  const { pinId } = response.locals.validatedRequest as SaveBoardPinInput;
  const user = response.locals.authenticatedUser as AuthenticatedUser;
  const result = await savePinToBoard(boardId, pinId, user.id);

  response.status(result.created ? 201 : 200).json({
    success: true,
    data: result,
  });
};

export const getBoardPinsHandler: RequestHandler = async (
  _request,
  response,
) => {
  const { boardId } = response.locals.validatedParams as BoardParams;
  const query = response.locals.validatedRequest as GetBoardPinsQuery;
  const user = response.locals.authenticatedUser as AuthenticatedUser;
  const result = await getBoardPins(boardId, user.id, query);

  response.status(200).json({
    success: true,
    data: result,
  });
};

export const deleteBoardPin: RequestHandler = async (_request, response) => {
  const { boardId, pinId } = response.locals.validatedRequest as BoardPinParams;
  const user = response.locals.authenticatedUser as AuthenticatedUser;
  const result = await removePinFromBoard(boardId, pinId, user.id);

  response.status(200).json({
    success: true,
    data: result,
  });
};
