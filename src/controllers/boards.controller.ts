import type { RequestHandler } from "express";
import type { AuthenticatedUser } from "../middleware/auth.middleware.js";
import type {
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
