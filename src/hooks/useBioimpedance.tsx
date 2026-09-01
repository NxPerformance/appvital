import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';
import { mapBioimpedanceRecord, type BioimpedanceRecord } from '@/lib/bioimpedanceRecord';

// Re-exported so existing importers of the type keep working unchanged -
// the canonical definition now lives alongside the mapper it describes.
export type { BioimpedanceRecord };

export function useBioimpedance() {
  const { user } = useAuth();
  const [records, setRecords] = useState<BioimpedanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setRecords([]);
      setLoading(false);
      return;
    }

    const fetchRecords = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<{ records: any[] }>('/bioimpedance/mine');
        setRecords(response.records.map(mapBioimpedanceRecord));
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Erro ao carregar bioimpedância');
        setRecords([]);
      }

      setLoading(false);
    };

    fetchRecords();
  }, [user]);

  const latestRecord = records.length > 0 ? records[0] : null;
  const previousRecord = records.length > 1 ? records[1] : null;

  // Calculate difference between two values
  const getDifference = (current: number | null, previous: number | null): number | null => {
    if (current === null || previous === null) return null;
    return Number((current - previous).toFixed(2));
  };

  return {
    records,
    latestRecord,
    previousRecord,
    loading,
    error,
    getDifference,
    hasRecords: records.length > 0,
    hasComparison: records.length > 1,
  };
}
