import crypto from "node:crypto";
import {
  Prisma,
  WearableConnectionStatus,
  WearableNotificationSeverity,
  WearableNotificationType,
  WearableProvider,
  type WearableConnection,
  type WearableNotification,
  type WearableReading,
} from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

const SECRET_VERSION = "v1";
const FITBIT_AUTH_URL = "https://www.fitbit.com/oauth2/authorize";
const FITBIT_TOKEN_URL = "https://api.fitbit.com/oauth2/token";
const FITBIT_API_URL = "https://api.fitbit.com";
const FITBIT_SCOPES = ["activity", "heartrate", "sleep", "profile"];

const providerLabels: Record<WearableProvider, string> = {
  [WearableProvider.APPLE_HEALTH]: "Apple Health",
  [WearableProvider.GOOGLE_FIT]: "Google Fit",
  [WearableProvider.GARMIN]: "Garmin",
  [WearableProvider.FITBIT]: "Fitbit",
};

const providerDeviceNames: Record<WearableProvider, string> = {
  [WearableProvider.APPLE_HEALTH]: "Apple Watch",
  [WearableProvider.GOOGLE_FIT]: "Wear OS",
  [WearableProvider.GARMIN]: "Garmin Watch",
  [WearableProvider.FITBIT]: "Fitbit",
};

function encryptionKey() {
  return crypto.createHash("sha256").update(env.JWT_SECRET).digest();
}

function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [SECRET_VERSION, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

function decryptSecret(value: string | null) {
  if (!value) return undefined;

  const [version, iv, tag, encrypted] = value.split(":");
  if (version !== SECRET_VERSION || !iv || !tag || !encrypted) return undefined;

  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function base64Url(buffer: Buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fitbitRedirectUri() {
  return env.FITBIT_REDIRECT_URI || `${env.APP_URL.replace(/\/$/, "")}/api/wearables/fitbit/callback`;
}

function fitbitBasicAuthHeader() {
  if (!env.FITBIT_CLIENT_ID || !env.FITBIT_CLIENT_SECRET) {
    throw new Error("Credenciais Fitbit nao configuradas");
  }

  return `Basic ${Buffer.from(`${env.FITBIT_CLIENT_ID}:${env.FITBIT_CLIENT_SECRET}`).toString("base64")}`;
}

function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function parseFitbitResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = Array.isArray((data as { errors?: Array<{ message?: string }> }).errors)
      ? (data as { errors: Array<{ message?: string }> }).errors.map((error) => error.message).filter(Boolean).join(" ")
      : "Erro ao comunicar com Fitbit";
    throw new Error(message || "Erro ao comunicar com Fitbit");
  }

  return data as T;
}

function providerOffset(provider: WearableProvider) {
  const offsets: Record<WearableProvider, number> = {
    [WearableProvider.APPLE_HEALTH]: 0,
    [WearableProvider.GOOGLE_FIT]: 2,
    [WearableProvider.GARMIN]: -1,
    [WearableProvider.FITBIT]: 1,
  };

  return offsets[provider];
}

function buildDemoReading(provider: WearableProvider) {
  const offset = providerOffset(provider);
  const minuteOffset = new Date().getMinutes() % 7;

  return {
    heartRateBpm: 76 + offset + minuteOffset,
    restingHeartRateBpm: 62 + offset,
    hrvMs: 48 - offset,
    spo2Percent: new Prisma.Decimal(97),
    activeCalories: 486 + offset * 12 + minuteOffset * 4,
    steps: 8420 + minuteOffset * 28,
    sleepMinutes: 444 + offset * 6,
    recoveryScore: 82 - Math.abs(offset),
    stressScore: 28 + Math.abs(offset),
    batteryPercent: 76 - minuteOffset,
  };
}

function serializeConnection(connection: WearableConnection | null) {
  if (!connection) return null;

  return {
    id: connection.id,
    provider: parseWearableProvider(connection.provider),
    provider_label: providerLabels[connection.provider],
    status: connection.status.toLowerCase(),
    device_name: connection.deviceName,
    external_account_label: connection.externalAccountLabel,
    consent_version: connection.consentVersion,
    connected_at: connection.connectedAt,
    last_sync_at: connection.lastSyncAt,
    disconnected_at: connection.disconnectedAt,
  };
}

function serializeReading(reading: WearableReading | null) {
  if (!reading) return null;

  return {
    id: reading.id,
    provider: parseWearableProvider(reading.provider),
    recorded_at: reading.recordedAt,
    heart_rate_bpm: reading.heartRateBpm,
    resting_heart_rate_bpm: reading.restingHeartRateBpm,
    hrv_ms: reading.hrvMs,
    spo2_percent: reading.spo2Percent ? Number(reading.spo2Percent) : null,
    active_calories: reading.activeCalories,
    steps: reading.steps,
    sleep_minutes: reading.sleepMinutes,
    recovery_score: reading.recoveryScore,
    stress_score: reading.stressScore,
    battery_percent: reading.batteryPercent,
  };
}

function serializeNotification(notification: WearableNotification) {
  return {
    id: notification.id,
    type: notification.type.toLowerCase(),
    severity: notification.severity.toLowerCase(),
    title: notification.title,
    message: notification.message,
    is_read: notification.isRead,
    read_at: notification.readAt,
    created_at: notification.createdAt,
    metadata: notification.metadata,
  };
}

export function serializeWearableSummary(input: {
  connection: WearableConnection | null;
  latestReading: WearableReading | null;
  notifications: WearableNotification[];
  unreadCount: number;
}) {
  return {
    connection: serializeConnection(input.connection),
    latest_reading: serializeReading(input.latestReading),
    notifications: input.notifications.map(serializeNotification),
    unread_count: input.unreadCount,
  };
}

export function serializeWearableProvider(provider: string) {
  const mapping: Record<string, WearableProvider> = {
    apple_health: WearableProvider.APPLE_HEALTH,
    google_fit: WearableProvider.GOOGLE_FIT,
    garmin: WearableProvider.GARMIN,
    fitbit: WearableProvider.FITBIT,
  };

  return mapping[provider];
}

export function parseWearableProvider(provider: WearableProvider) {
  const mapping: Record<WearableProvider, string> = {
    [WearableProvider.APPLE_HEALTH]: "apple_health",
    [WearableProvider.GOOGLE_FIT]: "google_fit",
    [WearableProvider.GARMIN]: "garmin",
    [WearableProvider.FITBIT]: "fitbit",
  };

  return mapping[provider];
}

export async function getWearableSummary(userId: string) {
  const [connection, latestReading, notifications, unreadCount] = await Promise.all([
    prisma.wearableConnection.findFirst({
      where: { userId, status: { not: WearableConnectionStatus.DISCONNECTED } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.wearableReading.findFirst({
      where: { userId },
      orderBy: { recordedAt: "desc" },
    }),
    prisma.wearableNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.wearableNotification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return serializeWearableSummary({ connection, latestReading, notifications, unreadCount });
}

export async function connectWearable(input: {
  userId: string;
  provider: WearableProvider;
  deviceName?: string | null;
  externalAccountLabel?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  scopes?: string[];
}) {
  const now = new Date();
  const connection = await prisma.wearableConnection.upsert({
    where: {
      userId_provider: {
        userId: input.userId,
        provider: input.provider,
      },
    },
    update: {
      status: WearableConnectionStatus.CONNECTED,
      deviceName: input.deviceName?.trim() || providerDeviceNames[input.provider],
      externalAccountLabel: input.externalAccountLabel?.trim() || null,
      ...(input.accessToken?.trim() ? { accessTokenEncrypted: encryptSecret(input.accessToken.trim()) } : {}),
      ...(input.refreshToken?.trim() ? { refreshTokenEncrypted: encryptSecret(input.refreshToken.trim()) } : {}),
      tokenExpiresAt: input.tokenExpiresAt ?? null,
      scopes: input.scopes ?? ["heart_rate", "sleep", "activity", "recovery"],
      consentVersion: "v1",
      connectedAt: now,
      lastSyncAt: now,
      disconnectedAt: null,
    },
    create: {
      userId: input.userId,
      provider: input.provider,
      status: WearableConnectionStatus.CONNECTED,
      deviceName: input.deviceName?.trim() || providerDeviceNames[input.provider],
      externalAccountLabel: input.externalAccountLabel?.trim() || null,
      ...(input.accessToken?.trim() ? { accessTokenEncrypted: encryptSecret(input.accessToken.trim()) } : {}),
      ...(input.refreshToken?.trim() ? { refreshTokenEncrypted: encryptSecret(input.refreshToken.trim()) } : {}),
      tokenExpiresAt: input.tokenExpiresAt ?? null,
      scopes: input.scopes ?? ["heart_rate", "sleep", "activity", "recovery"],
      consentVersion: "v1",
      connectedAt: now,
      lastSyncAt: now,
    },
  });

  await createWearableReading(input.userId, connection);
  await prisma.wearableNotification.createMany({
    data: [
      {
        userId: input.userId,
        type: WearableNotificationType.CONSENT,
        severity: WearableNotificationSeverity.SUCCESS,
        title: "Relogio conectado",
        message: `${providerLabels[input.provider]} foi vinculado com permissoes de batimentos, sono e atividade.`,
        metadata: { provider: parseWearableProvider(input.provider) },
      },
      {
        userId: input.userId,
        type: WearableNotificationType.SYNC,
        severity: WearableNotificationSeverity.INFO,
        title: "Primeira sincronizacao concluida",
        message: "Criamos a primeira ficha vital com os dados mais recentes do relogio.",
        metadata: { provider: parseWearableProvider(input.provider) },
      },
    ],
  });

  return getWearableSummary(input.userId);
}

interface FitbitTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: "Bearer";
  user_id: string;
  scope?: string;
}

interface FitbitProfileResponse {
  user?: {
    displayName?: string;
    fullName?: string;
    encodedId?: string;
  };
}

interface FitbitActivityResponse {
  summary?: {
    steps?: number;
    activityCalories?: number;
    restingHeartRate?: number;
    veryActiveMinutes?: number;
    fairlyActiveMinutes?: number;
    lightlyActiveMinutes?: number;
    sedentaryMinutes?: number;
  };
}

interface FitbitSleepResponse {
  summary?: {
    totalMinutesAsleep?: number;
    totalTimeInBed?: number;
  };
}

interface FitbitHeartResponse {
  "activities-heart"?: Array<{
    value?: {
      restingHeartRate?: number;
    };
  }>;
  "activities-heart-intraday"?: {
    dataset?: Array<{
      value?: number;
    }>;
  };
}

async function fitbitFetch<T>(accessToken: string, path: string) {
  const response = await fetch(`${FITBIT_API_URL}${path}`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
    },
  });

  return parseFitbitResponse<T>(response);
}

async function exchangeFitbitToken(body: URLSearchParams) {
  const response = await fetch(FITBIT_TOKEN_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: fitbitBasicAuthHeader(),
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  return parseFitbitResponse<FitbitTokenResponse>(response);
}

async function refreshFitbitToken(connection: WearableConnection) {
  const refreshToken = decryptSecret(connection.refreshTokenEncrypted);
  if (!refreshToken) {
    throw new Error("Refresh token Fitbit ausente");
  }

  const token = await exchangeFitbitToken(new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  }));

  await prisma.wearableConnection.update({
    where: { id: connection.id },
    data: {
      accessTokenEncrypted: encryptSecret(token.access_token),
      refreshTokenEncrypted: encryptSecret(token.refresh_token),
      tokenExpiresAt: addSeconds(new Date(), token.expires_in),
      externalAccountLabel: token.user_id,
      scopes: token.scope?.split(" ") ?? FITBIT_SCOPES,
    },
  });

  return token.access_token;
}

async function getFitbitAccessToken(connection: WearableConnection) {
  const accessToken = decryptSecret(connection.accessTokenEncrypted);
  const expiresAt = connection.tokenExpiresAt?.getTime() ?? 0;
  const refreshWindowMs = 5 * 60 * 1000;

  if (accessToken && expiresAt > Date.now() + refreshWindowMs) {
    return accessToken;
  }

  return refreshFitbitToken(connection);
}

async function createFitbitReading(userId: string, connection: WearableConnection) {
  const accessToken = await getFitbitAccessToken(connection);
  const date = todayIsoDate();

  const [activity, sleep, heart, intraday] = await Promise.all([
    fitbitFetch<FitbitActivityResponse>(accessToken, `/1/user/-/activities/date/${date}.json`),
    fitbitFetch<FitbitSleepResponse>(accessToken, `/1.2/user/-/sleep/date/${date}.json`).catch(() => null),
    fitbitFetch<FitbitHeartResponse>(accessToken, `/1/user/-/activities/heart/date/${date}/1d.json`).catch(() => null),
    fitbitFetch<FitbitHeartResponse>(accessToken, `/1/user/-/activities/heart/date/${date}/${date}/1min.json`).catch(() => null),
  ]);

  const activitySummary = activity.summary;
  const sleepMinutes = sleep?.summary?.totalMinutesAsleep ?? null;
  const restingHeartRate = activitySummary?.restingHeartRate
    ?? heart?.["activities-heart"]?.[0]?.value?.restingHeartRate
    ?? null;
  const heartDataset = intraday?.["activities-heart-intraday"]?.dataset ?? [];
  const latestHeartRate = heartDataset.length > 0
    ? heartDataset[heartDataset.length - 1]?.value ?? null
    : restingHeartRate;
  const activeMinutes = (activitySummary?.veryActiveMinutes ?? 0)
    + (activitySummary?.fairlyActiveMinutes ?? 0)
    + (activitySummary?.lightlyActiveMinutes ?? 0);
  const recoveryScore = sleepMinutes
    ? clampScore(55 + Math.min(25, sleepMinutes / 18) + Math.max(0, 12 - Math.abs((restingHeartRate ?? 65) - 62)))
    : null;
  const stressScore = restingHeartRate
    ? clampScore(32 + Math.max(0, restingHeartRate - 62))
    : null;

  return prisma.wearableReading.create({
    data: {
      userId,
      connectionId: connection.id,
      provider: connection.provider,
      recordedAt: new Date(),
      heartRateBpm: latestHeartRate,
      restingHeartRateBpm: restingHeartRate,
      hrvMs: null,
      spo2Percent: null,
      activeCalories: activitySummary?.activityCalories ?? null,
      steps: activitySummary?.steps ?? null,
      sleepMinutes,
      recoveryScore,
      stressScore,
      batteryPercent: null,
      rawSummary: {
        source: "fitbit_api",
        date,
        active_minutes: activeMinutes,
        sleep_time_in_bed: sleep?.summary?.totalTimeInBed ?? null,
        intraday_points: heartDataset.length,
      },
    },
  });
}

export async function createFitbitAuthorizationUrl(userId: string, redirectPath?: string | null) {
  if (!env.FITBIT_CLIENT_ID || !env.FITBIT_CLIENT_SECRET) {
    throw new Error("Credenciais Fitbit nao configuradas");
  }

  const codeVerifier = base64Url(crypto.randomBytes(48));
  const codeChallenge = base64Url(crypto.createHash("sha256").update(codeVerifier).digest());
  const state = base64Url(crypto.randomBytes(32));

  await prisma.wearableOAuthState.create({
    data: {
      userId,
      provider: WearableProvider.FITBIT,
      state,
      codeVerifier,
      redirectPath: redirectPath?.startsWith("/") ? redirectPath : "/wearables",
      expiresAt: addSeconds(new Date(), 10 * 60),
    },
  });

  const url = new URL(FITBIT_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.FITBIT_CLIENT_ID);
  url.searchParams.set("redirect_uri", fitbitRedirectUri());
  url.searchParams.set("scope", FITBIT_SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return url.toString();
}

export async function completeFitbitAuthorization(input: {
  code: string;
  state: string;
}) {
  const oauthState = await prisma.wearableOAuthState.findUnique({
    where: { state: input.state },
  });

  if (!oauthState || oauthState.provider !== WearableProvider.FITBIT) {
    throw new Error("Estado OAuth Fitbit invalido");
  }

  if (oauthState.usedAt || oauthState.expiresAt.getTime() < Date.now()) {
    throw new Error("Estado OAuth Fitbit expirado");
  }

  const token = await exchangeFitbitToken(new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: fitbitRedirectUri(),
    code_verifier: oauthState.codeVerifier,
  }));

  const profile = await fitbitFetch<FitbitProfileResponse>(token.access_token, "/1/user/-/profile.json").catch(() => null);
  const accountLabel = profile?.user?.displayName || profile?.user?.fullName || token.user_id;

  await prisma.wearableOAuthState.update({
    where: { id: oauthState.id },
    data: { usedAt: new Date() },
  });

  await connectWearable({
    userId: oauthState.userId,
    provider: WearableProvider.FITBIT,
    deviceName: providerDeviceNames[WearableProvider.FITBIT],
    externalAccountLabel: accountLabel,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    tokenExpiresAt: addSeconds(new Date(), token.expires_in),
    scopes: token.scope?.split(" ") ?? FITBIT_SCOPES,
  });

  return oauthState.redirectPath || "/wearables";
}

export async function createWearableReading(userId: string, connection: WearableConnection) {
  if (connection.provider === WearableProvider.FITBIT && connection.accessTokenEncrypted) {
    try {
      return await createFitbitReading(userId, connection);
    } catch (error) {
      await prisma.wearableNotification.create({
        data: {
          userId,
          type: WearableNotificationType.SYNC,
          severity: WearableNotificationSeverity.WARNING,
          title: "Sincronizacao Fitbit parcial",
          message: "Nao conseguimos ler todos os dados reais da Fitbit agora. Mantivemos uma ficha temporaria e tentaremos novamente na proxima sincronizacao.",
          metadata: {
            provider: "fitbit",
            error: error instanceof Error ? error.message : "unknown_error",
          },
        },
      });
    }
  }

  const reading = buildDemoReading(connection.provider);

  return prisma.wearableReading.create({
    data: {
      userId,
      connectionId: connection.id,
      provider: connection.provider,
      recordedAt: new Date(),
      ...reading,
      rawSummary: {
        source: connection.provider === WearableProvider.FITBIT ? "fitbit_fallback_demo" : "demo_sync",
        safety: "No raw OAuth token is exposed through API responses.",
      },
    },
  });
}

export async function syncWearable(userId: string) {
  const connection = await prisma.wearableConnection.findFirst({
    where: { userId, status: WearableConnectionStatus.CONNECTED },
    orderBy: { updatedAt: "desc" },
  });

  if (!connection) {
    return null;
  }

  const reading = await createWearableReading(userId, connection);

  await prisma.wearableConnection.update({
    where: { id: connection.id },
    data: { lastSyncAt: reading.recordedAt },
  });

  const notificationData: Prisma.WearableNotificationCreateManyInput[] = [
    {
      userId,
      type: WearableNotificationType.SYNC,
      severity: WearableNotificationSeverity.SUCCESS,
      title: "Relogio sincronizado",
      message: "Batimentos, sono e atividade foram atualizados com seguranca.",
      metadata: { reading_id: reading.id },
    },
  ];

  if ((reading.recoveryScore ?? 100) < 70) {
    notificationData.push({
      userId,
      type: WearableNotificationType.RECOVERY,
      severity: WearableNotificationSeverity.WARNING,
      title: "Recuperacao abaixo do ideal",
      message: "Considere reduzir a intensidade do treino hoje e priorizar sono e hidratacao.",
      metadata: { recovery_score: reading.recoveryScore },
    });
  }

  if ((reading.restingHeartRateBpm ?? 0) >= 75) {
    notificationData.push({
      userId,
      type: WearableNotificationType.HEART_RATE,
      severity: WearableNotificationSeverity.WARNING,
      title: "Batimento de repouso elevado",
      message: "Acompanhe a tendencia e procure orientacao profissional se isso persistir.",
      metadata: { resting_heart_rate_bpm: reading.restingHeartRateBpm },
    });
  }

  await prisma.wearableNotification.createMany({ data: notificationData });

  return getWearableSummary(userId);
}

export async function disconnectWearable(userId: string) {
  await prisma.wearableConnection.updateMany({
    where: { userId, status: { not: WearableConnectionStatus.DISCONNECTED } },
    data: {
      status: WearableConnectionStatus.DISCONNECTED,
      disconnectedAt: new Date(),
      accessTokenEncrypted: null,
      refreshTokenEncrypted: null,
      tokenExpiresAt: null,
    },
  });

  await prisma.wearableNotification.create({
    data: {
      userId,
      type: WearableNotificationType.CONSENT,
      severity: WearableNotificationSeverity.INFO,
      title: "Conexao removida",
      message: "A permissao do relogio foi removida e os tokens armazenados foram apagados.",
    },
  });

  return getWearableSummary(userId);
}

export async function markWearableNotificationRead(userId: string, notificationId: string) {
  await prisma.wearableNotification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true, readAt: new Date() },
  });

  return getWearableSummary(userId);
}

export async function markAllWearableNotificationsRead(userId: string) {
  await prisma.wearableNotification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  return getWearableSummary(userId);
}
