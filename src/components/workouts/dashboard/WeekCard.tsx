import { Dumbbell, Clock, Flame, TrendingUp } from 'lucide-react';
import { formatDurationCompact } from '@/lib/formatDuration';
import type { WeekStats } from '@/lib/workoutDashboardUtils';

interface WeekCardProps {
  week: WeekStats;
}

export const WeekCard = ({ week }: WeekCardProps) => (
  <div className="bg-card rounded-xl p-4 min-w-[160px] flex-shrink-0 space-y-3 border border-border">
    <div className="text-center">
      <h3 className="font-semibold text-sm text-foreground">Semana {week.weekNumber}</h3>
      <p className="text-xs text-muted-foreground">
        {week.startDate} - {week.endDate}
      </p>
    </div>
    
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center">
          <Dumbbell className="w-3 h-3 text-accent" />
        </div>
        <span className="text-foreground">{week.workoutCount} Treinos</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center">
          <Clock className="w-3 h-3 text-accent" />
        </div>
        <span className="text-foreground">{formatDurationCompact(week.totalDuration) || '0m'}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center">
          <Flame className="w-3 h-3 text-accent" />
        </div>
        <span className="text-foreground">{week.totalCalories} kcal</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center">
          <TrendingUp className="w-3 h-3 text-accent" />
        </div>
        <span className="text-foreground">{formatDurationCompact(week.avgDuration) || '0m'}/treino</span>
      </div>
    </div>
  </div>
);
