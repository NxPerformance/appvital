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
