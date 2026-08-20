import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default("7d"),
  UPLOAD_DIR: z.string().default("./uploads"),
  CORS_ORIGIN: z.string().default("http://localhost:8080"),
  APP_URL: z.string().url().default("http://localhost:8080"),
  PAYMENT_PROVIDER: z
    .enum(["manual", "mercado_pago", "stripe", "pagarme", "asaas"])
    .default("manual"),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PAYMENT_SUCCESS_PATH: z.string().default("/premium?payment=success"),
  PAYMENT_CANCEL_PATH: z.string().default("/premium?payment=cancelled"),
  GOOGLE_FIT_CLIENT_ID: z.string().optional(),
  GOOGLE_FIT_CLIENT_SECRET: z.string().optional(),
  FITBIT_CLIENT_ID: z.string().optional(),
  FITBIT_CLIENT_SECRET: z.string().optional(),
  FITBIT_REDIRECT_URI: z.union([z.string().url(), z.literal("")]).optional(),
  GARMIN_CLIENT_ID: z.string().optional(),
  GARMIN_CLIENT_SECRET: z.string().optional(),
  APPLE_HEALTH_TEAM_ID: z.string().optional(),
  APPLE_HEALTH_KEY_ID: z.string().optional(),
  WORKOUTX_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
