import type { RequestHandler } from "express";
import type { AuthenticatedUser } from "../middleware/auth.middleware.js";
import type { RelationshipListQuery } from "../schemas/users.schema.js";
import {
  followUser,
  getFollowers,
  getFollowing,
  unfollowUser,
} from "../services/follows.service.js";

export const postFollowUser: RequestHandler = async (_request, response) => {
  const { username } = response.locals.validatedParams as { username: string };
  const user = response.locals.authenticatedUser as AuthenticatedUser;
  const result = await followUser(username, user.id);

  response.status(result.created ? 201 : 200).json({
    success: true,
    data: result,
  });
};

export const deleteFollowUser: RequestHandler = async (_request, response) => {
  const { username } = response.locals.validatedParams as { username: string };
  const user = response.locals.authenticatedUser as AuthenticatedUser;
  const result = await unfollowUser(username, user.id);

  response.status(200).json({
    success: true,
    data: result,
  });
};

export const getFollowersList: RequestHandler = async (_request, response) => {
  const { username } = response.locals.validatedParams as { username: string };
  const pagination = response.locals.validatedQuery as RelationshipListQuery;
  const result = await getFollowers(username, pagination);

  response.status(200).json({
    success: true,
    data: result,
  });
};

export const getFollowingList: RequestHandler = async (_request, response) => {
  const { username } = response.locals.validatedParams as { username: string };
  const pagination = response.locals.validatedQuery as RelationshipListQuery;
  const result = await getFollowing(username, pagination);

  response.status(200).json({
    success: true,
    data: result,
  });
};
