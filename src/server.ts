import "dotenv/config";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.info(`Pincrest backend listening on port ${env.PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(async (error) => {
      if (error) {
        console.error(`HTTP server shutdown failed: ${error.name}`);
        process.exitCode = 1;
      }

      await prisma.$disconnect();
    });
  });
}
