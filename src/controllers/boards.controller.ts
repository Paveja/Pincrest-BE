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
  BoardListQuery,
  CreateBoardInput,
  UpdateBoardInput,
} from "../schemas/boards.schema.js";
import {
  createBoard,
  deleteBoard,
  getBoard,
  getMyBoards,
  getPublicUserBoards,
  updateBoard,
} from "../services/boards.service.js";

export const postBoard: RequestHandler = async (_request, response) => {
  const user = response.locals.authenticatedUser as AuthenticatedUser;
  const input = response.locals.validatedRequest as CreateBoardInput;
  const board = await createBoard(user.id, input);

  response.status(201).json({
    success: true,
    data: { board },
  });
};

export const getBoardDetails: RequestHandler = async (_request, response) => {
  const { boardId } = response.locals.validatedParams as { boardId: string };
  const user = response.locals.authenticatedUser as
    AuthenticatedUser | undefined;
  const board = await getBoard(boardId, user?.id ?? null);

  response.status(200).json({
    success: true,
    data: { board },
  });
};

export const getMyBoardsList: RequestHandler = async (_request, response) => {
  const user = response.locals.authenticatedUser as AuthenticatedUser;
  const pagination = response.locals.validatedQuery as BoardListQuery;
  const result = await getMyBoards(user.id, pagination);

  response.status(200).json({
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
export const getPublicBoardsForUser: RequestHandler = async (
  _request,
  response,
) => {
  const { username } = response.locals.validatedParams as { username: string };
  const pagination = response.locals.validatedQuery as BoardListQuery;
  const result = await getPublicUserBoards(username, pagination);

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
export const patchBoard: RequestHandler = async (_request, response) => {
  const user = response.locals.authenticatedUser as AuthenticatedUser;
  const { boardId } = response.locals.validatedParams as { boardId: string };
  const input = response.locals.validatedRequest as UpdateBoardInput;
  const board = await updateBoard(boardId, user.id, input);

  response.status(200).json({
    success: true,
    data: { board },
  });
};

export const deleteOwnedBoard: RequestHandler = async (_request, response) => {
  const user = response.locals.authenticatedUser as AuthenticatedUser;
  const { boardId } = response.locals.validatedParams as { boardId: string };
  await deleteBoard(boardId, user.id);

  response.status(200).json({
    success: true,
    data: { id: boardId },
  });
};
