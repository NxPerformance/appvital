import { Dumbbell, Clock, Flame, TrendingUp } from 'lucide-react';
import { formatDurationCompact } from '@/lib/formatDuration';
import type { MonthStats } from '@/lib/workoutDashboardUtils';

interface MonthCardProps {
  month: MonthStats;
}

export const MonthCard = ({ month }: MonthCardProps) => {
  const hasData = month.workoutCount > 0;
  
  return (
    <div className="bg-card rounded-xl p-4 min-w-[160px] flex-shrink-0 space-y-3 border border-border">
      <div className="text-center">
        <h3 className="font-semibold text-sm text-foreground uppercase">
          {month.monthName}
        </h3>
      </div>
      
      {hasData ? (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center">
              <Dumbbell className="w-3 h-3 text-accent" />
            </div>
            <span className="text-foreground">{month.workoutCount} Treinos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center">
              <Clock className="w-3 h-3 text-accent" />
            </div>
            <span className="text-foreground">{formatDurationCompact(month.totalDuration) || '0m'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center">
              <Flame className="w-3 h-3 text-accent" />
            </div>
            <span className="text-foreground">{month.totalCalories} kcal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-accent" />
            </div>
            <span className="text-foreground">{formatDurationCompact(month.avgDuration) || '0m'}/treino</span>
          </div>
        </div>
      ) : (
        <div className="text-center text-muted-foreground text-sm py-4">
          --
        </div>
      )}
    </div>
  );
};
