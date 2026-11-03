import { prisma } from "../lib/prisma.js";
import { ApiError } from "../lib/api-error.js";

export async function checkDatabaseConnection(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "database_health_check_failed",
        errorName: error instanceof Error ? error.name : "UnknownError",
      }),
    );

    throw new ApiError(
      503,
      "DATABASE_UNAVAILABLE",
      "The database is unavailable.",
    );
  }
}

export function getHealthStatus(): { status: "ok"; database: "connected" } {
  return { status: "ok", database: "connected" };
}
