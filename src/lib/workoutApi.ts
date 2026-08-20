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

export interface CardioWorkoutApi {
  id: string;
  user_id?: string;
  date: string;
  workout_type: string;
  duration_min: number | null;
  distance_km: number | null;
  calories: number | null;
  avg_pace?: string | null;
  avg_speed?: number | null;
  notes?: string | null;
  created_at?: string;
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

export function normalizeCardioWorkout(item: any): CardioWorkoutApi {
  const date = toDateOnlyString(item.date);

  return {
    id: item.id,
    user_id: item.userId,
    date,
    workout_type: item.workoutType,
    duration_min: item.durationMin ? Number(item.durationMin) : null,
    distance_km: item.distanceKm ? Number(item.distanceKm) : null,
    calories: item.calories ?? null,
    avg_pace: item.avgPace ?? null,
    avg_speed: item.avgSpeed ? Number(item.avgSpeed) : null,
    notes: item.notes ?? null,
    created_at: item.createdAt ?? date,
  };
}

export async function fetchStrengthWorkouts() {
  const response = await api.get<{ workouts: any[] }>('/workouts/strength');
  return response.workouts.map(normalizeStrengthWorkout);
}

export async function fetchCardioWorkouts() {
  const response = await api.get<{ cardio_workouts: any[] }>('/workouts/cardio');
  return response.cardio_workouts.map(normalizeCardioWorkout);
}
