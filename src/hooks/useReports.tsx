import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./useAuth";

export type ReportPeriod = "weekly" | "monthly" | "yearly";

export interface ReportTimelineItem {
  label: string;
  workouts: number;
  calories: number;
  minutes: number;
  distance_km: number;
}

export interface PremiumReport {
  period: ReportPeriod;
  start_date: string;
  end_date: string;
  totals: {
    workouts: number;
    strength_workouts: number;
    cardio_workouts: number;
    calories: number;
    active_minutes: number;
    distance_km: number;
    body_progress_photos: number;
  };
  timeline: ReportTimelineItem[];
  latest_body_metrics: {
    date: string;
    weight_kg: number | null;
    body_fat_percent: number | null;
    muscle_mass_kg: number | null;
  } | null;
}

export function useReports(period: ReportPeriod, enabled = true) {
  const { user } = useAuth();
  const [report, setReport] = useState<PremiumReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !enabled) {
      setReport(null);
      setLoading(false);
      setError(null);
      return;
    }

    let mounted = true;

    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<{ report: PremiumReport }>(`/reports/me?period=${period}`);
        if (mounted) {
          setReport(response.report);
        }
      } catch (err) {
        if (mounted) {
          setReport(null);
          setError(err instanceof Error ? err.message : "Erro ao carregar relatório");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void fetchReport();

    return () => {
      mounted = false;
    };
  }, [enabled, period, user]);

  return {
    report,
    loading,
    error,
  };
}
