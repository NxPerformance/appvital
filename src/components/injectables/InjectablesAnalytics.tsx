import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, differenceInDays, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, CheckCircle, Calendar, TrendingUp, Syringe } from 'lucide-react';
import { formatDateSafe, parseDateValue } from '@/lib/dateUtils';

interface Injectable {
  id: string;
  date: string;
  medication: string;
  dose: string;
  time: string;
  location: string;
  notes: string | null;
}

interface Props {
  injectables: Injectable[];
}

const getInjectableDate = (value: string) => parseDateValue(value, { noon: true });

export function InjectablesAnalytics({ injectables }: Props) {
  const analytics = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    // Filter injections for current month
    const thisMonthInjections = injectables.filter((inj) => {
      const injDate = getInjectableDate(inj.date);
      if (!injDate) return false;
      return !isBefore(injDate, monthStart) && !isAfter(injDate, monthEnd);
    });

    // Sort all injections by date
    const sortedInjections = [...injectables].sort(
      (a, b) => (getInjectableDate(a.date)?.getTime() ?? 0) - (getInjectableDate(b.date)?.getTime() ?? 0)
    );

    // Calculate average interval between injections
    let avgInterval = 7; // Default to weekly
    if (sortedInjections.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < sortedInjections.length; i++) {
        const currentDate = getInjectableDate(sortedInjections[i].date);
        const previousDate = getInjectableDate(sortedInjections[i - 1].date);
        if (!currentDate || !previousDate) continue;

        const diff = differenceInDays(currentDate, previousDate);
        if (diff > 0 && diff <= 30) {
          intervals.push(diff);
        }
      }
      if (intervals.length > 0) {
        avgInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
      }
    }

    // Calculate expected injections this month
    const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
    const expectedInjections = Math.max(1, Math.floor(daysInMonth / avgInterval));

    // Consistency percentage
    const consistency = Math.min(100, Math.round((thisMonthInjections.length / expectedInjections) * 100));

    // Find future injections
    const futureInjections = injectables
      .filter((inj) => {
        const injDate = getInjectableDate(inj.date);
        return injDate ? isAfter(injDate, today) : false;
      })
      .sort((a, b) => (getInjectableDate(a.date)?.getTime() ?? 0) - (getInjectableDate(b.date)?.getTime() ?? 0));

    const nextInjection = futureInjections[0] || null;
    const nextInjectionDate = nextInjection ? getInjectableDate(nextInjection.date) : null;
    const daysUntilNext = nextInjectionDate ? differenceInDays(nextInjectionDate, today) : null;

    // Check if missed injection
    const pastInjections = sortedInjections.filter((inj) => {
      const injDate = getInjectableDate(inj.date);
      return injDate ? !isAfter(injDate, today) : false;
    });
    const lastInjection = pastInjections[pastInjections.length - 1] || null;
    const lastInjectionDate = lastInjection ? getInjectableDate(lastInjection.date) : null;
    const daysSinceLast = lastInjectionDate ? differenceInDays(today, lastInjectionDate) : null;
    const missedInjection = daysSinceLast !== null && daysSinceLast > avgInterval + 2;

    // Chart data - group by day of month
    const chartData: { day: string; count: number }[] = [];
    const injectionsByDay: Record<string, number> = {};
    
    thisMonthInjections.forEach((inj) => {
      const day = formatDateSafe(inj.date, 'd', { noon: true, fallback: '' });
      if (!day) return;
      injectionsByDay[day] = (injectionsByDay[day] || 0) + 1;
    });

    // Create data for each day that has injections
    Object.keys(injectionsByDay)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach((day) => {
        chartData.push({ day, count: injectionsByDay[day] });
      });

    return {
      totalThisMonth: thisMonthInjections.length,
      consistency,
      avgInterval,
      nextInjection,
      daysUntilNext,
      missedInjection,
      daysSinceLast,
      chartData,
    };
  }, [injectables]);

  if (injectables.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Alert Card */}
      <div className={`rounded-2xl p-4 flex items-center gap-3 ${
        analytics.missedInjection 
          ? 'bg-destructive/10 border border-destructive/30' 
          : 'bg-green-500/10 border border-green-500/30'
      }`}>
        {analytics.missedInjection ? (
          <>
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-medium text-destructive">Você pode ter perdido uma aplicação</p>
              <p className="text-sm text-muted-foreground">
                Última aplicação há {analytics.daysSinceLast} dias (intervalo usual: ~{analytics.avgInterval} dias)
              </p>
            </div>
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-500">Todas as doses em dia</p>
              <p className="text-sm text-muted-foreground">
                Continue acompanhando suas aplicações
              </p>
            </div>
          </>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[2rem] border border-white/5 bg-card/85 p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Syringe className="w-4 h-4" />
            <span className="text-xs">Este mês</span>
          </div>
          <p className="text-2xl font-bold">{analytics.totalThisMonth}</p>
          <p className="text-xs text-muted-foreground">aplicações</p>
        </div>
        <div className="rounded-[2rem] border border-white/5 bg-card/85 p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Consistência</span>
          </div>
          <p className="text-2xl font-bold">{analytics.consistency}%</p>
          <p className="text-xs text-muted-foreground">do esperado</p>
        </div>
      </div>

      {/* Next Injection Countdown */}
      {analytics.nextInjection && analytics.daysUntilNext !== null && (
        <div className="rounded-[2rem] border border-white/5 bg-card/85 p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">Próxima aplicação agendada</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{analytics.nextInjection.medication}</p>
              <p className="text-sm text-muted-foreground">
                {formatDateSafe(analytics.nextInjection.date, "dd 'de' MMMM", { locale: ptBR, noon: true })}
              </p>
            </div>
            <div className="bg-primary/15 rounded-xl px-4 py-2 text-center">
              <p className="text-2xl font-bold text-primary">
                {analytics.daysUntilNext === 0 ? 'Hoje' : analytics.daysUntilNext}
              </p>
              {analytics.daysUntilNext > 0 && (
                <p className="text-xs text-muted-foreground">
                  {analytics.daysUntilNext === 1 ? 'dia' : 'dias'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Monthly Chart */}
      {analytics.chartData.length > 0 && (
        <div className="rounded-[2rem] border border-white/5 bg-card/85 p-4">
          <p className="text-sm font-medium text-muted-foreground mb-4">
            Aplicações em {format(new Date(), 'MMMM', { locale: ptBR })}
          </p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.chartData}>
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(label) => `Dia ${label}`}
                  formatter={(value) => [`${value} aplicação(ões)`, '']}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--accent))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
