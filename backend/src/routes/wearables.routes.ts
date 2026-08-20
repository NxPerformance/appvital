import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getRouteParam } from "../utils/params.js";
import { env } from "../config/env.js";
import {
  completeFitbitAuthorization,
  connectWearable,
  createFitbitAuthorizationUrl,
  disconnectWearable,
  getWearableSummary,
  markAllWearableNotificationsRead,
  markWearableNotificationRead,
  serializeWearableProvider,
  syncWearable,
} from "../services/wearables.service.js";

const router = Router();

const providerSchema = z.enum(["apple_health", "google_fit", "garmin", "fitbit"]);
const connectSchema = z.object({
  provider: providerSchema,
  device_name: z.string().trim().min(1).max(120).nullable().optional(),
  external_account_label: z.string().trim().max(160).nullable().optional(),
});
const fitbitAuthorizeSchema = z.object({
  redirect_path: z.string().optional(),
});
const fitbitCallbackSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

function appRedirect(path: string, params: Record<string, string>) {
  const url = new URL(path, env.APP_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

router.get(
  "/summary",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const summary = await getWearableSummary(req.auth!.userId);
    return res.json({ summary });
  }),
);

router.post(
  "/connect",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = connectSchema.parse(req.body);
    const summary = await connectWearable({
      userId: req.auth!.userId,
      provider: serializeWearableProvider(data.provider),
      deviceName: data.device_name,
      externalAccountLabel: data.external_account_label,
    });

    return res.status(201).json({ summary });
  }),
);

router.get(
  "/fitbit/authorize",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = fitbitAuthorizeSchema.parse(req.query);
    const authorizationUrl = await createFitbitAuthorizationUrl(req.auth!.userId, data.redirect_path);
    return res.json({ authorization_url: authorizationUrl });
  }),
);

router.get(
  "/fitbit/callback",
  asyncHandler(async (req, res) => {
    const data = fitbitCallbackSchema.parse(req.query);

    if (data.error) {
      return res.redirect(appRedirect("/wearables", { fitbit: "denied", error: data.error }));
    }

    if (!data.code || !data.state) {
      return res.redirect(appRedirect("/wearables", { fitbit: "error", error: "missing_code_or_state" }));
    }

    try {
      const redirectPath = await completeFitbitAuthorization({
        code: data.code,
        state: data.state,
      });

      return res.redirect(appRedirect(redirectPath, { fitbit: "connected" }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "fitbit_callback_error";
      return res.redirect(appRedirect("/wearables", { fitbit: "error", error: message }));
    }
  }),
);

router.post(
  "/sync",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const summary = await syncWearable(req.auth!.userId);

    if (!summary) {
      return res.status(404).json({ message: "Nenhum relogio conectado" });
    }

    return res.json({ summary });
  }),
);

router.delete(
  "/connection",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const summary = await disconnectWearable(req.auth!.userId);
    return res.json({ summary });
  }),
);

router.patch(
  "/notifications/:id/read",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const notificationId = getRouteParam(req.params.id, "id");
    const summary = await markWearableNotificationRead(req.auth!.userId, notificationId);
    return res.json({ summary });
  }),
);

router.post(
  "/notifications/read-all",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const summary = await markAllWearableNotificationsRead(req.auth!.userId);
    return res.json({ summary });
  }),
);

export { router as wearablesRouter };
