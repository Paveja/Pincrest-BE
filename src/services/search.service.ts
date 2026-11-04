import { prisma } from "../lib/prisma.js";
import type { SearchQuery } from "../schemas/search.schema.js";

const pinSearchSelect = {
  id: true,
  title: true,
  description: true,
  imageUrl: true,
  destinationUrl: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: {
      id: true,
      name: true,
      username: true,
      profileImage: true,
    },
  },
} as const;

const userSearchSelect = {
  id: true,
  name: true,
  username: true,
  profileImage: true,
  bio: true,
} as const;

function emptyResult(items: "pins" | "users", query: SearchQuery) {
  return {
    [items]: [],
    pagination: {
      page: query.page,
      limit: query.limit,
      total: 0,
      totalPages: 0,
    },
  };
}

export async function searchPins(query: SearchQuery) {
  if (!query.q) {
    return emptyResult("pins", query);
  }

  const where = {
    OR: [
      { title: { contains: query.q, mode: "insensitive" as const } },
      { description: { contains: query.q, mode: "insensitive" as const } },
    ],
  };
  const [pins, total] = await Promise.all([
    prisma.pin.findMany({
      where,
      select: pinSearchSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.pin.count({ where }),
  ]);

  return {
    pins: pins.map(({ owner, ...pin }) => ({ ...pin, creator: owner })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function searchUsers(query: SearchQuery) {
  if (!query.q) {
    return emptyResult("users", query);
  }

  const where = {
    OR: [
      { name: { contains: query.q, mode: "insensitive" as const } },
      { username: { contains: query.q, mode: "insensitive" as const } },
    ],
  };
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSearchSelect,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}
