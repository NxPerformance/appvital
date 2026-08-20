import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./useAuth";

export type WearableProvider = "apple_health" | "google_fit" | "garmin" | "fitbit";

export interface WearableConnection {
  id: string;
  provider: WearableProvider;
  provider_label: string;
  status: "connected" | "disconnected" | "needs_reauth";
  device_name: string | null;
  external_account_label: string | null;
  consent_version: string;
  connected_at: string;
  last_sync_at: string | null;
  disconnected_at: string | null;
}

export interface WearableReading {
  id: string;
  provider: WearableProvider;
  recorded_at: string;
  heart_rate_bpm: number | null;
  resting_heart_rate_bpm: number | null;
  hrv_ms: number | null;
  spo2_percent: number | null;
  active_calories: number | null;
  steps: number | null;
  sleep_minutes: number | null;
  recovery_score: number | null;
  stress_score: number | null;
  battery_percent: number | null;
}

export interface WearableNotification {
  id: string;
  type: "heart_rate" | "recovery" | "sleep" | "sync" | "consent";
  severity: "info" | "success" | "warning" | "critical";
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  metadata: unknown;
}

export interface WearableSummary {
  connection: WearableConnection | null;
  latest_reading: WearableReading | null;
  notifications: WearableNotification[];
  unread_count: number;
}

const emptySummary: WearableSummary = {
  connection: null,
  latest_reading: null,
  notifications: [],
  unread_count: 0,
};

export async function fetchWearableSummary() {
  const response = await api.get<{ summary: WearableSummary }>("/wearables/summary");
  return response.summary;
}

export async function fetchFitbitAuthorizationUrl(redirectPath = "/wearables") {
  const query = new URLSearchParams({ redirect_path: redirectPath });
  const response = await api.get<{ authorization_url: string }>(`/wearables/fitbit/authorize?${query.toString()}`);
  return response.authorization_url;
}

export function useWearables() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<WearableSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setSummary(emptySummary);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSummary(await fetchWearableSummary());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar relogio");
      setSummary(emptySummary);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connect = async (input: {
    provider: WearableProvider;
    device_name?: string | null;
    external_account_label?: string | null;
  }) => {
    if (!user) return { error: "Not authenticated" };

    try {
      setSaving(true);
      const response = await api.post<{ summary: WearableSummary }>("/wearables/connect", input);
      setSummary(response.summary);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro ao conectar relogio" };
    } finally {
      setSaving(false);
    }
  };

  const connectFitbit = async () => {
    if (!user) return { error: "Not authenticated" };

    try {
      setSaving(true);
      const authorizationUrl = await fetchFitbitAuthorizationUrl("/wearables");
      window.location.assign(authorizationUrl);
      return { error: null };
    } catch (err) {
      setSaving(false);
      return { error: err instanceof Error ? err.message : "Erro ao iniciar Fitbit" };
    }
  };

  const sync = async () => {
    if (!user) return { error: "Not authenticated" };

    try {
      setSyncing(true);
      const response = await api.post<{ summary: WearableSummary }>("/wearables/sync");
      setSummary(response.summary);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro ao sincronizar relogio" };
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = async () => {
    if (!user) return { error: "Not authenticated" };

    try {
      setSaving(true);
      const response = await api.delete<{ summary: WearableSummary }>("/wearables/connection");
      setSummary(response.summary);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro ao remover conexao" };
    } finally {
      setSaving(false);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const response = await api.patch<{ summary: WearableSummary }>(`/wearables/notifications/${notificationId}/read`);
      setSummary(response.summary);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro ao ler notificacao" };
    }
  };

  const markAllNotificationsRead = async () => {
    if (!user) return { error: "Not authenticated" };

    try {
      const response = await api.post<{ summary: WearableSummary }>("/wearables/notifications/read-all");
      setSummary(response.summary);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro ao limpar notificacoes" };
    }
  };

  return {
    summary,
    connection: summary.connection,
    latestReading: summary.latest_reading,
    notifications: summary.notifications,
    unreadCount: summary.unread_count,
    loading,
    syncing,
    saving,
    error,
    refresh,
    connect,
    connectFitbit,
    sync,
    disconnect,
    markNotificationRead,
    markAllNotificationsRead,
  };
}
