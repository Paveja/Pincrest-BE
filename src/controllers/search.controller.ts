import type { RequestHandler } from "express";
import type { SearchQuery } from "../schemas/search.schema.js";
import { searchPins, searchUsers } from "../services/search.service.js";

export const searchPinsHandler: RequestHandler = async (_request, response) => {
  const query = response.locals.validatedRequest as SearchQuery;
  const result = await searchPins(query);

  response.status(200).json({ success: true, data: result });
};

export const searchUsersHandler: RequestHandler = async (
  _request,
  response,
) => {
  const query = response.locals.validatedRequest as SearchQuery;
  const result = await searchUsers(query);

  response.status(200).json({ success: true, data: result });
};
