import path from "node:path";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.js";

export function createApp() {
  const app = express();
  const corsOrigins = env.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(
    express.json({
      limit: "2mb",
      verify: (req, _res, buffer) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buffer;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));
  app.use("/uploads", express.static(path.resolve(env.UPLOAD_DIR)));
  app.use("/api", apiRouter);
  app.use(errorHandler);

  return app;
}
