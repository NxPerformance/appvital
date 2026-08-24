import crypto from "node:crypto";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import type { WearableConnection, WearableNotification, WearableProvider, WearableReading } from "@prisma/client";

const ENCRYPTION_KEY = crypto.createHash("sha256").update(env.JWT_SECRET).digest();

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptSecret(stored: string): string {
  const [, ivB64, tagB64, cipherB64] = stored.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(cipherB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export const PROVIDER_LABELS: Record<WearableProvider, string> = {
  APPLE_HEALTH: "Apple Health",
  GOOGLE_FIT: "Google Fit",
  GARMIN: "Garmin",
  FITBIT: "Fitbit",
};

const DEMO_OFFSETS: Record<WearableProvider, { hr: number; rhr: number; hrv: number; steps: number; sleep: number }> = {
  APPLE_HEALTH: { hr: 68, rhr: 58, hrv: 42, steps: 6400, sleep: 420 },
  GOOGLE_FIT: { hr: 72, rhr: 61, hrv: 38, steps: 7200, sleep: 400 },
  GARMIN: { hr: 65, rhr: 55, hrv: 48, steps: 8100, sleep: 440 },
  FITBIT: { hr: 70, rhr: 60, hrv: 40, steps: 7000, sleep: 410 },
};

export function buildDemoReading(provider: WearableProvider) {
  const offsets = DEMO_OFFSETS[provider];
  const minuteVariation = new Date().getMinutes();

  const restingHeartRateBpm = offsets.rhr + (minuteVariation % 5);
  const sleepMinutes = offsets.sleep + ((minuteVariation * 2) % 30);

  return {
    heartRateBpm: offsets.hr + (minuteVariation % 8),
    restingHeartRateBpm,
    hrvMs: offsets.hrv + (minuteVariation % 6),
    spo2Percent: 96 + (minuteVariation % 3),
    activeCalories: 250 + minuteVariation * 3,
    steps: offsets.steps + minuteVariation * 12,
    sleepMinutes,
    recoveryScore: computeRecoveryScore(sleepMinutes, restingHeartRateBpm),
    stressScore: computeStressScore(restingHeartRateBpm),
    batteryPercent: 60 + (minuteVariation % 40),
    rawSummary: { demo: true, note: "No raw OAuth token is exposed through API responses." },
  };
}

export function computeRecoveryScore(sleepMinutes: number, restingHeartRateBpm: number): number {
  const sleepComponent = Math.min(25, sleepMinutes / 18);
  const hrComponent = Math.max(0, 12 - Math.abs(restingHeartRateBpm - 62));
  return Math.max(0, Math.min(100, Math.round(55 + sleepComponent + hrComponent)));
}

export function computeStressScore(restingHeartRateBpm: number): number {
  return Math.max(0, Math.min(100, Math.round(30 + Math.max(0, restingHeartRateBpm - 60) * 1.5)));
}

interface FitbitTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export async function exchangeFitbitCode(code: string, codeVerifier: string, redirectUri: string): Promise<FitbitTokens> {
  const basicAuth = Buffer.from(`${env.FITBIT_CLIENT_ID}:${env.FITBIT_CLIENT_SECRET}`).toString("base64");
  const response = await fetch("https://api.fitbit.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: env.FITBIT_CLIENT_ID ?? "",
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao trocar codigo Fitbit: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string; refresh_token: string; expires_in: number };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function refreshFitbitToken(refreshToken: string): Promise<FitbitTokens> {
  const basicAuth = Buffer.from(`${env.FITBIT_CLIENT_ID}:${env.FITBIT_CLIENT_SECRET}`).toString("base64");
  const response = await fetch("https://api.fitbit.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao renovar token Fitbit: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string; refresh_token: string; expires_in: number };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function fetchFitbitProfile(accessToken: string): Promise<{ label: string | null }> {
  try {
    const response = await fetch("https://api.fitbit.com/1/user/-/profile.json", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return { label: null };
    const data = (await response.json()) as { user?: { fullName?: string; displayName?: string } };
    return { label: data.user?.fullName ?? data.user?.displayName ?? null };
  } catch {
    return { label: null };
  }
}

export async function createFitbitReading(accessToken: string) {
  const today = new Date().toISOString().split("T")[0];
  const headers = { Authorization: `Bearer ${accessToken}` };

  const [activities, sleep, heartIntraday] = await Promise.all([
    fetch(`https://api.fitbit.com/1/user/-/activities/date/${today}.json`, { headers }).then((r) => (r.ok ? r.json() : null)) as Promise<any>,
    fetch(`https://api.fitbit.com/1/user/-/sleep/date/${today}.json`, { headers }).then((r) => (r.ok ? r.json() : null)) as Promise<any>,
    fetch(`https://api.fitbit.com/1/user/-/activities/heart/date/${today}/1d/1min.json`, { headers }).then((r) => (r.ok ? r.json() : null)) as Promise<any>,
  ]);

  if (!activities) {
    throw new Error("Falha ao buscar dados de atividade na Fitbit");
  }

  const summary = activities.summary ?? {};
  const restingHeartRateBpm: number | null = summary.restingHeartRate ?? null;
  const steps: number | null = summary.steps ?? null;
  const activeCalories: number | null = summary.caloriesOut ?? null;

  const sleepMinutes: number | null = sleep?.summary?.totalMinutesAsleep ?? null;

  const intradayDataset = heartIntraday?.["activities-heart-intraday"]?.dataset as Array<{ value: number }> | undefined;
  const heartRateBpm = intradayDataset && intradayDataset.length > 0 ? intradayDataset[intradayDataset.length - 1].value : null;

  const recoveryScore = computeRecoveryScore(sleepMinutes ?? 420, restingHeartRateBpm ?? 62);
  const stressScore = computeStressScore(restingHeartRateBpm ?? 62);

  return {
    heartRateBpm,
    restingHeartRateBpm,
    hrvMs: null,
    spo2Percent: null,
    activeCalories,
    steps,
    sleepMinutes,
    recoveryScore,
    stressScore,
    batteryPercent: null,
    rawSummary: { source: "fitbit", note: "No raw OAuth token is exposed through API responses." },
  };
}

export function generatePkce() {
  const codeVerifier = crypto.randomBytes(48).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}

function serializeConnection(connection: WearableConnection) {
  return {
    id: connection.id,
    provider: connection.provider.toLowerCase(),
    provider_label: PROVIDER_LABELS[connection.provider],
    status: connection.status.toLowerCase(),
    device_name: connection.deviceName,
    external_account_label: connection.externalAccountLabel,
    consent_version: connection.consentVersion,
    connected_at: connection.connectedAt,
    last_sync_at: connection.lastSyncAt,
    disconnected_at: connection.disconnectedAt,
  };
}

function serializeReading(reading: WearableReading) {
  return {
    id: reading.id,
    provider: reading.provider.toLowerCase(),
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

export async function buildWearableSummary(userId: string) {
  const [connection, latestReading, notifications, unreadCount] = await Promise.all([
    prisma.wearableConnection.findFirst({
      where: { userId, status: { not: "DISCONNECTED" } },
      orderBy: { connectedAt: "desc" },
    }),
    prisma.wearableReading.findFirst({ where: { userId }, orderBy: { recordedAt: "desc" } }),
    prisma.wearableNotification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.wearableNotification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    connection: connection ? serializeConnection(connection) : null,
    latest_reading: latestReading ? serializeReading(latestReading) : null,
    notifications: notifications.map(serializeNotification),
    unread_count: unreadCount,
  };
}
