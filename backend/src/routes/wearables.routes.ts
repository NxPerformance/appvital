import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../middleware/error-handler.js";
import { getRouteParam } from "../utils/params.js";
import { env } from "../config/env.js";
import {
  buildDemoReading,
  buildWearableSummary,
  createFitbitReading,
  decryptSecret,
  encryptSecret,
  exchangeFitbitCode,
  fetchFitbitProfile,
  generatePkce,
  PROVIDER_LABELS,
  refreshFitbitToken,
} from "../services/wearables.service.js";
import type { WearableProvider } from "@prisma/client";

export const wearablesRouter = Router();

const PROVIDER_TO_DB: Record<string, WearableProvider> = {
  apple_health: "APPLE_HEALTH",
  google_fit: "GOOGLE_FIT",
  garmin: "GARMIN",
  fitbit: "FITBIT",
};

wearablesRouter.get(
  "/fitbit/callback",
  asyncHandler(async (req, res) => {
    const { code, state, error } = req.query as { code?: string; state?: string; error?: string };

    const finish = (query: Record<string, string>) => {
      const params = new URLSearchParams(query);
      res.redirect(`${env.APP_URL}/wearables?${params.toString()}`);
    };

    if (error || !code || !state) {
      finish({ fitbit: "denied", error: error ?? "missing_code" });
      return;
    }

    const oauthState = await prisma.wearableOAuthState.findUnique({ where: { state } });
    if (!oauthState || oauthState.provider !== "FITBIT" || oauthState.usedAt || oauthState.expiresAt < new Date()) {
      finish({ fitbit: "error", error: "invalid_state" });
      return;
    }

    try {
      const redirectUri = env.FITBIT_REDIRECT_URI ?? `${env.APP_URL}/api/wearables/fitbit/callback`;
      const tokens = await exchangeFitbitCode(code, oauthState.codeVerifier, redirectUri);
      const profile = await fetchFitbitProfile(tokens.accessToken);

      await prisma.wearableOAuthState.update({ where: { id: oauthState.id }, data: { usedAt: new Date() } });

      await prisma.wearableConnection.upsert({
        where: { userId_provider: { userId: oauthState.userId, provider: "FITBIT" } },
        create: {
          userId: oauthState.userId,
          provider: "FITBIT",
          status: "CONNECTED",
          externalAccountLabel: profile.label,
          accessTokenEncrypted: encryptSecret(tokens.accessToken),
          refreshTokenEncrypted: encryptSecret(tokens.refreshToken),
          tokenExpiresAt: tokens.expiresAt,
        },
        update: {
          status: "CONNECTED",
          externalAccountLabel: profile.label,
          accessTokenEncrypted: encryptSecret(tokens.accessToken),
          refreshTokenEncrypted: encryptSecret(tokens.refreshToken),
          tokenExpiresAt: tokens.expiresAt,
          disconnectedAt: null,
        },
      });

      await prisma.wearableNotification.create({
        data: {
          userId: oauthState.userId,
          type: "CONSENT",
          severity: "SUCCESS",
          title: "Fitbit conectado",
          message: "Sua conta Fitbit foi conectada com sucesso.",
        },
      });

      finish({ fitbit: "connected", redirect_path: oauthState.redirectPath ?? "/wearables" });
    } catch (err) {
      console.error("Falha no callback Fitbit:", err);
      finish({ fitbit: "error", error: "exchange_failed" });
    }
  }),
);

wearablesRouter.use(requireAuth);

wearablesRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    res.json({ summary: await buildWearableSummary(req.auth!.userId) });
  }),
);

const connectSchema = z.object({
  provider: z.enum(["apple_health", "google_fit", "garmin", "fitbit"]),
  device_name: z.string().nullable().optional(),
  external_account_label: z.string().nullable().optional(),
});

wearablesRouter.post(
  "/connect",
  asyncHandler(async (req, res) => {
    const data = connectSchema.parse(req.body);
    const provider = PROVIDER_TO_DB[data.provider];
    const userId = req.auth!.userId;

    const connection = await prisma.wearableConnection.upsert({
      where: { userId_provider: { userId, provider } },
      create: {
        userId,
        provider,
        status: "CONNECTED",
        deviceName: data.device_name ?? null,
        externalAccountLabel: data.external_account_label ?? null,
      },
      update: {
        status: "CONNECTED",
        deviceName: data.device_name ?? undefined,
        externalAccountLabel: data.external_account_label ?? undefined,
        disconnectedAt: null,
      },
    });

    const demoReading = buildDemoReading(provider);
    await prisma.wearableReading.create({
      data: {
        userId,
        connectionId: connection.id,
        provider,
        recordedAt: new Date(),
        ...demoReading,
      },
    });

    await prisma.wearableNotification.createMany({
      data: [
        {
          userId,
          type: "CONSENT",
          severity: "INFO",
          title: `${PROVIDER_LABELS[provider]} conectado`,
          message: `Voce autorizou a Vitalissy a acessar dados do ${PROVIDER_LABELS[provider]}.`,
        },
        {
          userId,
          type: "SYNC",
          severity: "SUCCESS",
          title: "Primeira sincronizacao concluida",
          message: `Recebemos os primeiros dados do ${PROVIDER_LABELS[provider]}.`,
        },
      ],
    });

    res.json({ summary: await buildWearableSummary(userId) });
  }),
);

wearablesRouter.post(
  "/sync",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;

    const connection = await prisma.wearableConnection.findFirst({
      where: { userId, status: "CONNECTED" },
      orderBy: { connectedAt: "desc" },
    });

    if (!connection) {
      throw new HttpError(400, "Nenhum dispositivo conectado");
    }

    let readingData;
    let partialFailure = false;

    if (connection.provider === "FITBIT" && connection.accessTokenEncrypted && connection.refreshTokenEncrypted) {
      try {
        let accessToken = decryptSecret(connection.accessTokenEncrypted);

        const expiresSoon = connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() - Date.now() < 5 * 60 * 1000;
        if (expiresSoon) {
          const refreshed = await refreshFitbitToken(decryptSecret(connection.refreshTokenEncrypted));
          accessToken = refreshed.accessToken;
          await prisma.wearableConnection.update({
            where: { id: connection.id },
            data: {
              accessTokenEncrypted: encryptSecret(refreshed.accessToken),
              refreshTokenEncrypted: encryptSecret(refreshed.refreshToken),
              tokenExpiresAt: refreshed.expiresAt,
            },
          });
        }

        readingData = await createFitbitReading(accessToken);
      } catch (err) {
        console.error("Falha ao sincronizar com Fitbit, usando dados demo:", err);
        readingData = buildDemoReading(connection.provider);
        partialFailure = true;
      }
    } else {
      readingData = buildDemoReading(connection.provider);
    }

    await prisma.wearableReading.create({
      data: {
        userId,
        connectionId: connection.id,
        provider: connection.provider,
        recordedAt: new Date(),
        ...readingData,
      },
    });

    await prisma.wearableConnection.update({ where: { id: connection.id }, data: { lastSyncAt: new Date() } });

    const notifications: Array<{ userId: string; type: "SYNC" | "RECOVERY" | "HEART_RATE"; severity: "SUCCESS" | "WARNING"; title: string; message: string }> = [];

    if (partialFailure) {
      notifications.push({
        userId,
        type: "SYNC",
        severity: "WARNING",
        title: "Sincronizacao parcial",
        message: "Nao foi possivel obter todos os dados do provedor agora; usamos uma estimativa temporaria.",
      });
    } else {
      notifications.push({
        userId,
        type: "SYNC",
        severity: "SUCCESS",
        title: "Sincronizado com sucesso",
        message: "Seus dados do wearable foram atualizados.",
      });
    }

    if (readingData.recoveryScore !== null && readingData.recoveryScore !== undefined && readingData.recoveryScore < 70) {
      notifications.push({
        userId,
        type: "RECOVERY",
        severity: "WARNING",
        title: "Recuperacao baixa",
        message: "Seu score de recuperacao esta abaixo do ideal hoje.",
      });
    }

    if (
      readingData.restingHeartRateBpm !== null &&
      readingData.restingHeartRateBpm !== undefined &&
      readingData.restingHeartRateBpm >= 75
    ) {
      notifications.push({
        userId,
        type: "HEART_RATE",
        severity: "WARNING",
        title: "Batimento de repouso elevado",
        message: "Seu batimento cardiaco de repouso esta acima do habitual.",
      });
    }

    await prisma.wearableNotification.createMany({ data: notifications });

    res.json({ summary: await buildWearableSummary(userId) });
  }),
);

wearablesRouter.delete(
  "/connection",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;

    await prisma.wearableConnection.updateMany({
      where: { userId, status: { not: "DISCONNECTED" } },
      data: {
        status: "DISCONNECTED",
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        tokenExpiresAt: null,
        disconnectedAt: new Date(),
      },
    });

    await prisma.wearableNotification.create({
      data: {
        userId,
        type: "CONSENT",
        severity: "INFO",
        title: "Conexao removida",
        message: "Sua conexao com o wearable foi removida.",
      },
    });

    res.json({ summary: await buildWearableSummary(userId) });
  }),
);

wearablesRouter.patch(
  "/notifications/:id/read",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id, "id");
    const userId = req.auth!.userId;

    const notification = await prisma.wearableNotification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      throw new HttpError(404, "Notificacao nao encontrada");
    }

    await prisma.wearableNotification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({ summary: await buildWearableSummary(userId) });
  }),
);

wearablesRouter.post(
  "/notifications/read-all",
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;

    await prisma.wearableNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({ summary: await buildWearableSummary(userId) });
  }),
);

// Not currently consumed as an actual redirect target anywhere (the Fitbit
// callback always redirects to a hardcoded /wearables, and the frontend
// never reads this back out of the query string) - constrained here anyway
// so it can't quietly become an open redirect if either side starts using
// it without a second look. Must stay a same-app relative path: no
// protocol-relative ("//host"), absolute URL, or backslash trick.
const authorizeQuerySchema = z.object({
  redirect_path: z
    .string()
    .default("/wearables")
    .refine((value) => value.startsWith("/") && !value.startsWith("//") && !value.includes("\\"), {
      message: "redirect_path invalido",
    }),
});

wearablesRouter.get(
  "/fitbit/authorize",
  asyncHandler(async (req, res) => {
    const { redirect_path } = authorizeQuerySchema.parse(req.query);
    const { codeVerifier, codeChallenge } = generatePkce();
    const state = crypto.randomBytes(32).toString("base64url");

    await prisma.wearableOAuthState.create({
      data: {
        userId: req.auth!.userId,
        provider: "FITBIT",
        state,
        codeVerifier,
        redirectPath: redirect_path,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const redirectUri = env.FITBIT_REDIRECT_URI ?? `${env.APP_URL}/api/wearables/fitbit/callback`;
    const params = new URLSearchParams({
      client_id: env.FITBIT_CLIENT_ID ?? "",
      response_type: "code",
      scope: "activity heartrate sleep profile",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      redirect_uri: redirectUri,
      state,
    });

    res.json({ authorization_url: `https://www.fitbit.com/oauth2/authorize?${params.toString()}` });
  }),
);
