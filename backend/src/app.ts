import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "node:path";
import { env, corsOrigins } from "./config/env.js";
import { router } from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.js";

export const app = express();

// The app sits behind a single reverse proxy in production (Easypanel/
// Traefik). Without this, req.ip is always the proxy's own address, which
// would make IP-based rate limiting apply one shared limit across every
// real client instead of per-client. "1" trusts only the immediate
// upstream hop's X-Forwarded-For entry, not an arbitrary chain a client
// could spoof further back.
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
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
