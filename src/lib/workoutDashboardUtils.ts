import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateValue } from '@/lib/dateUtils';

export interface Workout {
  id: string;
  date: string;
  objective?: string;
  duration_min: number | null;
  calories: number | null;
}

export interface WeekStats {
  weekNumber: number;
  startDate: string;
  endDate: string;
  startDateFull: Date;
  endDateFull: Date;
  workoutCount: number;
  totalDuration: number;
  totalCalories: number;
  avgDuration: number;
}

export interface MonthStats {
  month: number;
  year: number;
  monthName: string;
  workoutCount: number;
  totalDuration: number;
  totalCalories: number;
  avgDuration: number;
}

export interface YearStats {
  year: number;
  workoutCount: number;
  totalDuration: number;
  totalCalories: number;
  avgDuration: number;
}

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril',
  'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const getWorkoutDate = (date: string) => parseDateValue(date, { noon: true });

/**
 * Get all weeks of a given month with workout stats
 */
export const getWeeksOfMonth = (year: number, month: number, workouts: Workout[]): WeekStats[] => {
  const weeks: WeekStats[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Start from the first day of the month
  const weekStart = new Date(firstDay);
  // Adjust to start from Sunday
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  
  let weekNum = 1;
  
  while (weekStart <= lastDay || weekNum === 1) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    // Filter workouts for this week
    const weekWorkouts = workouts.filter(w => {
      const wDate = getWorkoutDate(w.date);
      if (!wDate) return false;
      return wDate >= weekStart && wDate <= weekEnd;
    });
    
    const totalDuration = weekWorkouts.reduce((s, w) => s + (w.duration_min || 0), 0);
    
    weeks.push({
      weekNumber: weekNum,
      startDate: format(weekStart, 'dd/MM'),
      endDate: format(weekEnd, 'dd/MM'),
      startDateFull: new Date(weekStart),
      endDateFull: new Date(weekEnd),
      workoutCount: weekWorkouts.length,
      totalDuration,
      totalCalories: weekWorkouts.reduce((s, w) => s + (w.calories || 0), 0),
      avgDuration: weekWorkouts.length > 0 
        ? Math.round(totalDuration / weekWorkouts.length)
        : 0,
    });
    
    weekStart.setDate(weekStart.getDate() + 7);
    weekNum++;
    
    // Stop if we've gone past the month
    if (weekStart.getMonth() !== month && weekStart > lastDay) break;
  }
  
  return weeks;
};

/**
 * Get monthly stats for a given year
 */
export const getMonthsOfYear = (year: number, workouts: Workout[]): MonthStats[] => {
  const months: MonthStats[] = [];
  
  for (let month = 0; month < 12; month++) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    
    const monthWorkouts = workouts.filter(w => {
      const wDate = getWorkoutDate(w.date);
      if (!wDate) return false;
      return wDate >= monthStart && wDate <= monthEnd;
    });
    
    const totalDuration = monthWorkouts.reduce((s, w) => s + (w.duration_min || 0), 0);
    
    months.push({
      month,
      year,
      monthName: MONTH_NAMES[month],
      workoutCount: monthWorkouts.length,
      totalDuration,
      totalCalories: monthWorkouts.reduce((s, w) => s + (w.calories || 0), 0),
      avgDuration: monthWorkouts.length > 0 
        ? Math.round(totalDuration / monthWorkouts.length)
        : 0,
    });
  }
  
  return months;
};

/**
 * Get yearly stats for all years with data
 */
export const getYearlyStats = (workouts: Workout[]): YearStats[] => {
  if (workouts.length === 0) return [];
  
  // Get unique years from workouts
  const years = [
    ...new Set(
      workouts
        .map((w) => getWorkoutDate(w.date)?.getFullYear())
        .filter((year): year is number => typeof year === 'number'),
    ),
  ];
  years.sort((a, b) => b - a); // Most recent first
  
  return years.map(year => {
    const yearWorkouts = workouts.filter(w => {
      const wDate = getWorkoutDate(w.date);
      if (!wDate) return false;
      return wDate.getFullYear() === year;
    });
    
    const totalDuration = yearWorkouts.reduce((s, w) => s + (w.duration_min || 0), 0);
    
    return {
      year,
      workoutCount: yearWorkouts.length,
      totalDuration,
      totalCalories: yearWorkouts.reduce((s, w) => s + (w.calories || 0), 0),
      avgDuration: yearWorkouts.length > 0 
        ? Math.round(totalDuration / yearWorkouts.length)
        : 0,
    };
  });
};

/**
 * Get daily workout counts for chart
 */
export const getDailyChartData = (year: number, month: number, workouts: Workout[]) => {
  const dayMap = new Map<number, number>();
  
  // Initialize all days to 0
  for (let i = 0; i < 7; i++) {
    dayMap.set(i, 0);
  }
  
  // Filter workouts for the month
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  
  workouts.forEach(w => {
    const wDate = getWorkoutDate(w.date);
    if (!wDate) return;
    if (wDate >= monthStart && wDate <= monthEnd) {
      const dayOfWeek = wDate.getDay();
      dayMap.set(dayOfWeek, (dayMap.get(dayOfWeek) || 0) + 1);
    }
  });
  
  return DAY_NAMES.map((day, index) => ({
    day,
    count: dayMap.get(index) || 0,
  }));
};

/**
 * Get monthly workout counts for chart
 */
export const getMonthlyChartData = (year: number, workouts: Workout[]) => {
  const monthMap = new Map<number, number>();
  
  // Initialize all months to 0
  for (let i = 0; i < 12; i++) {
    monthMap.set(i, 0);
  }
  
  workouts.forEach(w => {
    const wDate = getWorkoutDate(w.date);
    if (!wDate) return;
    if (wDate.getFullYear() === year) {
      const month = wDate.getMonth();
      monthMap.set(month, (monthMap.get(month) || 0) + 1);
    }
  });
  
  return MONTH_NAMES.map((name, index) => ({
    month: name.substring(0, 3),
    count: monthMap.get(index) || 0,
  }));
};

/**
 * Calculate month summary totals
 */
export const getMonthSummary = (year: number, month: number, workouts: Workout[]) => {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  
  const monthWorkouts = workouts.filter(w => {
    const wDate = getWorkoutDate(w.date);
    if (!wDate) return false;
    return wDate >= monthStart && wDate <= monthEnd;
  });
  
  const totalDuration = monthWorkouts.reduce((s, w) => s + (w.duration_min || 0), 0);
  
  return {
    workoutCount: monthWorkouts.length,
    totalDuration,
    totalCalories: monthWorkouts.reduce((s, w) => s + (w.calories || 0), 0),
    avgDuration: monthWorkouts.length > 0 
      ? Math.round(totalDuration / monthWorkouts.length)
      : 0,
  };
};
