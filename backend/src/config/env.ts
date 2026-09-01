import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL e obrigatoria"),
  // 32+ chars keeps HMAC-SHA256 signing at its full intended strength - the
  // same secret is also used to derive the wearable-token encryption key.
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter ao menos 32 caracteres"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  UPLOAD_DIR: z.string().default("./uploads"),
  CORS_ORIGIN: z.string().default("http://localhost:8080"),
  APP_URL: z.string().url().default("http://localhost:8080"),
  // Only needed when the frontend and API live on different subdomains of
  // the same site (e.g. app.example.com / api.example.com) — without it,
  // both auth cookies are host-only to the API's own host and the readable
  // CSRF cookie is invisible to frontend JS running on the other subdomain,
  // which fails every mutating request. Leave unset for same-host deploys
  // (including local dev, where it must stay unset since "localhost" can't
  // take a leading-dot Domain attribute).
  COOKIE_DOMAIN: z.string().optional(),
  GOOGLE_FIT_CLIENT_ID: z.string().optional(),
  GOOGLE_FIT_CLIENT_SECRET: z.string().optional(),
  FITBIT_CLIENT_ID: z.string().optional(),
  FITBIT_CLIENT_SECRET: z.string().optional(),
  FITBIT_REDIRECT_URI: z.string().optional(),
  GARMIN_CLIENT_ID: z.string().optional(),
  GARMIN_CLIENT_SECRET: z.string().optional(),
  APPLE_HEALTH_TEAM_ID: z.string().optional(),
  APPLE_HEALTH_KEY_ID: z.string().optional(),
  ANOVATOR_API_KEY: z.string().optional(),
  ANOVATOR_GYM_ID: z.string().optional(),
  ANOVATOR_BASE_URL: z.string().default("https://www.anovator.com"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variaveis de ambiente invalidas:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
