import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "node:path";
import { env, corsOrigins } from "./config/env.js";
import { router } from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.js";

export const app = express();

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
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.resolve(env.UPLOAD_DIR)));

app.use("/api", router);

app.use(errorHandler);
