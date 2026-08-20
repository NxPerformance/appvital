import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { fetchCardioWorkouts, fetchStrengthWorkouts } from '@/lib/workoutApi';

interface WeeklyProgress {
  completed: number;
  goal: number;
  loading: boolean;
}

export function useWeeklyProgress(): WeeklyProgress {
  const { user } = useAuth();
  const [workoutDates, setWorkoutDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setWorkoutDates([]);
      setLoading(false);
      return;
    }

    const fetchWeeklyWorkouts = async () => {
      setLoading(true);

      try {
        // Get start and end of current week (Sunday to Saturday)
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

        const startDate = format(weekStart, 'yyyy-MM-dd');
        const endDate = format(weekEnd, 'yyyy-MM-dd');

        const [workouts, cardioWorkouts] = await Promise.all([
          fetchStrengthWorkouts(),
          fetchCardioWorkouts(),
        ]);

        // Combine and get unique dates
        const allDates = [
          ...(workouts || []).map(w => w.date),
          ...(cardioWorkouts || []).map(w => w.date),
        ].filter((date) => date >= startDate && date <= endDate);

        const uniqueDates = [...new Set(allDates)];
        setWorkoutDates(uniqueDates);
      } catch {
        setWorkoutDates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyWorkouts();
  }, [user]);

  return {
    completed: workoutDates.length,
    goal: 7,
    loading,
  };
}

export function getMotivationalMessage(completed: number, goal: number): string {
  const ratio = completed / goal;
  
  if (completed === 0) return "Comece sua semana com energia! 🚀";
  if (ratio < 0.3) return "Bom começo! Continue assim! 💪";
  if (ratio < 0.6) return "Você está na metade! 🔥";
  if (ratio < 1) return "Quase lá! Só mais um pouco! ⚡";
  return "Semana completa! Parabéns! 🎉";
}
