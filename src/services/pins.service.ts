import { prisma } from "../lib/prisma.js";
import { ApiError } from "../lib/api-error.js";
import type {
  CreatePinInput,
  PinListQuery,
  UpdatePinInput,
} from "../schemas/pins.schema.js";

function pinSelect(viewerId?: string) {
  return {
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
    _count: {
      select: { likes: true },
    },
    ...(viewerId
      ? {
          likes: {
            where: { userId: viewerId },
            select: { id: true },
          },
        }
      : {}),
  } as const;
}

type PinQueryResult = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  destinationUrl: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    name: string;
    username: string;
    profileImage: string | null;
  };
  _count: { likes: number };
  likes?: { id: string }[];
};

function toPin(pin: PinQueryResult) {
  const { owner, _count, likes, ...pinData } = pin;
  return {
    ...pinData,
    creator: owner,
    likeCount: _count.likes,
    isLiked: Boolean(likes?.length),
  };
}

function pinNotFound(): ApiError {
  return new ApiError(404, "PIN_NOT_FOUND", "Pin was not found.");
}

async function requirePin(pinId: string, viewerId?: string) {
  const pin = await prisma.pin.findUnique({
    where: { id: pinId },
    select: pinSelect(viewerId),
  });

  if (!pin) {
    throw pinNotFound();
  }

  return toPin(pin);
}

async function listPins(
  where: { ownerId?: string },
  query: PinListQuery,
  viewerId?: string,
) {
  const skip = (query.page - 1) * query.limit;
  const [pins, total] = await Promise.all([
    prisma.pin.findMany({
      where,
      select: pinSelect(viewerId),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: query.limit,
    }),
    prisma.pin.count({ where }),
  ]);
  const totalPages = Math.ceil(total / query.limit);

  return {
    pins: pins.map(toPin),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasNextPage: query.page < totalPages,
    },
  };
}

export function getPin(pinId: string, viewerId?: string) {
  return requirePin(pinId, viewerId);
}

export function getPins(query: PinListQuery, viewerId?: string) {
  return listPins({}, query, viewerId);
}

export function getMyPins(
  ownerId: string,
  query: PinListQuery,
  viewerId?: string,
) {
  return listPins({ ownerId }, query, viewerId);
}

export async function createPin(ownerId: string, input: CreatePinInput) {
  const pin = await prisma.pin.create({
    data: {
      title: input.title,
      description: input.description,
      imageUrl: input.imageUrl,
      ownerId,
      ...(input.destinationUrl === undefined
        ? {}
        : { destinationUrl: input.destinationUrl }),
    },
    select: pinSelect(),
  });

  return toPin(pin);
}

export async function updateOwnedPin(
  ownerId: string,
  pinId: string,
  input: UpdatePinInput,
) {
  const data = {
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.description === undefined
      ? {}
      : { description: input.description }),
    ...(input.imageUrl === undefined ? {} : { imageUrl: input.imageUrl }),
    ...(input.destinationUrl === undefined
      ? {}
      : { destinationUrl: input.destinationUrl }),
  };
  const result = await prisma.pin.updateMany({
    where: { id: pinId, ownerId },
    data,
  });

  if (result.count === 0) {
    throw pinNotFound();
  }

  return requirePin(pinId);
}

export async function deleteOwnedPin(ownerId: string, pinId: string) {
  const result = await prisma.pin.deleteMany({
    where: { id: pinId, ownerId },
  });

  if (result.count === 0) {
    throw pinNotFound();
  }
}
