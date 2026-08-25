import { api } from '@/lib/api';
import { toDateOnlyString } from '@/lib/dateUtils';

export interface StrengthWorkoutApi {
  id: string;
  user_id?: string;
  date: string;
  objective: string;
  duration_min: number | null;
  calories: number | null;
  exercises: any[];
  created_at?: string;
  workout_type?: string;
}

export function normalizeStrengthWorkout(item: any): StrengthWorkoutApi {
  const date = toDateOnlyString(item.date);

  return {
    id: item.id,
    user_id: item.userId,
    date,
    objective: item.objective,
    duration_min: item.durationMin ?? null,
    calories: item.calories ?? null,
    exercises: Array.isArray(item.exercises) ? item.exercises : [],
    created_at: item.createdAt ?? date,
    workout_type: item.workoutType ?? 'academia',
  };
}

export async function fetchStrengthWorkouts() {
  const response = await api.get<{ workouts: any[] }>('/workouts/strength');
  return response.workouts.map(normalizeStrengthWorkout);
}

const DRAFT_KEY_PREFIX = 'workout-draft-';
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000;

export interface ActiveWorkoutDraft {
  type: string;
  savedAt: number;
}

export function findActiveWorkoutDraft(): ActiveWorkoutDraft | null {
  if (typeof window === 'undefined') return null;

  let latest: ActiveWorkoutDraft | null = null;

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key?.startsWith(DRAFT_KEY_PREFIX)) continue;

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw) as { savedAt?: number };
      if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > DRAFT_EXPIRY_MS) continue;

      const type = key.slice(DRAFT_KEY_PREFIX.length);
      if (!latest || parsed.savedAt > latest.savedAt) {
        latest = { type, savedAt: parsed.savedAt };
      }
    } catch {
      continue;
    }
  }

  return latest;
}
