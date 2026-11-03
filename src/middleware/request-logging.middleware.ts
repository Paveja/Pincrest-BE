import type { RequestHandler } from "express";

export const requestLoggingMiddleware: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    console.info(
      JSON.stringify({
        level: "info",
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      }),
    );
  });

  next();
};
