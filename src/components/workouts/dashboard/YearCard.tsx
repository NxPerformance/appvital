import { Dumbbell, Clock, Flame, TrendingUp } from 'lucide-react';
import { formatDurationCompact } from '@/lib/formatDuration';
import type { YearStats } from '@/lib/workoutDashboardUtils';

interface YearCardProps {
  year: YearStats;
  isCurrentYear?: boolean;
}

export const YearCard = ({ year, isCurrentYear }: YearCardProps) => (
  <div className="bg-card rounded-xl p-5 min-w-[180px] flex-shrink-0 space-y-3 border border-border">
    <div className="text-center">
      <h3 className="font-bold text-lg text-foreground">{year.year}</h3>
      {isCurrentYear && (
        <p className="text-xs text-muted-foreground">(até agora)</p>
      )}
    </div>
    
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center">
          <Dumbbell className="w-3 h-3 text-accent" />
        </div>
        <span className="text-foreground">{year.workoutCount} Treinos</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center">
          <Clock className="w-3 h-3 text-accent" />
        </div>
        <span className="text-foreground">{formatDurationCompact(year.totalDuration) || '0m'} total</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center">
          <Flame className="w-3 h-3 text-accent" />
        </div>
        <span className="text-foreground">{year.totalCalories.toLocaleString('pt-BR')} kcal</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center">
          <TrendingUp className="w-3 h-3 text-accent" />
        </div>
        <span className="text-foreground">{formatDurationCompact(year.avgDuration) || '0m'}/treino</span>
      </div>
    </div>
  </div>
);
