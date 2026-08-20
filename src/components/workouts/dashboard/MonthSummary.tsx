import { Dumbbell, Clock, Flame, TrendingUp } from 'lucide-react';
import { formatDurationCompact } from '@/lib/formatDuration';
import { MONTH_NAMES } from '@/lib/workoutDashboardUtils';

interface MonthSummaryProps {
  month: number;
  year: number;
  workoutCount: number;
  totalDuration: number;
  totalCalories: number;
  avgDuration: number;
}

export const MonthSummary = ({
  month,
  year,
  workoutCount,
  totalDuration,
  totalCalories,
  avgDuration,
}: MonthSummaryProps) => (
  <div className="bg-card rounded-xl p-4 border border-border">
    <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase">
      Resumo de {MONTH_NAMES[month]}
    </h3>
    
    <div className="grid grid-cols-2 gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
          <Dumbbell className="w-5 h-5 text-accent" />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">{workoutCount}</p>
          <p className="text-xs text-muted-foreground">Treinos</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
          <Clock className="w-5 h-5 text-accent" />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">{formatDurationCompact(totalDuration) || '0m'}</p>
          <p className="text-xs text-muted-foreground">Tempo total</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
          <Flame className="w-5 h-5 text-accent" />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">{totalCalories.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground">Calorias</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-accent" />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">{formatDurationCompact(avgDuration) || '0m'}</p>
          <p className="text-xs text-muted-foreground">Média/treino</p>
        </div>
      </div>
    </div>
  </div>
);
