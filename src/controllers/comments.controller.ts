import type { RequestHandler } from "express";
import type { AuthenticatedUser } from "../middleware/auth.middleware.js";
import type {
  CommentListQuery,
  CreateCommentInput,
  UpdateCommentInput,
} from "../schemas/comments.schema.js";
import {
  createComment,
  deleteOwnedComment,
  getPinComments,
  updateOwnedComment,
} from "../services/comments.service.js";

export const listPinComments: RequestHandler = async (_request, response) => {
  const { pinId } = response.locals.validatedParams as { pinId: string };
  const query = response.locals.validatedQuery as CommentListQuery;
  const result = await getPinComments(pinId, query);

  response.status(200).json({ success: true, data: result });
};

export const postPinComment: RequestHandler = async (_request, response) => {
  const { pinId } = response.locals.validatedParams as { pinId: string };
  const user = response.locals.authenticatedUser as AuthenticatedUser;
  const input = response.locals.validatedRequest as CreateCommentInput;
  const comment = await createComment(user.id, pinId, input);

  response.status(201).json({ success: true, data: { comment } });
};

export const patchComment: RequestHandler = async (_request, response) => {
  const { commentId } = response.locals.validatedParams as {
    commentId: string;
  };
  const user = response.locals.authenticatedUser as AuthenticatedUser;
  const input = response.locals.validatedRequest as UpdateCommentInput;
  const comment = await updateOwnedComment(user.id, commentId, input);

  response.status(200).json({ success: true, data: { comment } });
};

export const removeComment: RequestHandler = async (_request, response) => {
  const { commentId } = response.locals.validatedParams as {
    commentId: string;
  };
  const user = response.locals.authenticatedUser as AuthenticatedUser;
  await deleteOwnedComment(user.id, commentId);

  response.status(200).json({ success: true, data: { id: commentId } });
};
