import { useMemo, useState } from "react";
import { eachDayOfInterval, endOfWeek, format, isSameDay, isToday, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeeklyCaloriesChartProps {
  entries: Array<{ date: string; calories: number | null }>;
}

const DAY_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];
const BAR_TRACK_HEIGHT = 64;

export function WeeklyCaloriesChart({ entries }: WeeklyCaloriesChartProps) {
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const week = useMemo(() => {
    const start = startOfWeek(today, { weekStartsOn: 0 });
    const end = endOfWeek(today, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end }).map((day) => {
      const total = entries.reduce((sum, entry) => {
        const entryDate = new Date(`${entry.date}T12:00:00`);
        if (!isSameDay(entryDate, day)) return sum;
        return sum + (entry.calories ?? 0);
      }, 0);
      return { day, total };
    });
  }, [entries, today]);

  const maxTotal = Math.max(...week.map((d) => d.total), 1);
  const selected = week.find((d) => isSameDay(d.day, selectedDate)) ?? week[week.length - 1];

  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-card p-4 shadow-elegant">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Flame className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {isToday(selected.day) ? "Hoje" : format(selected.day, "EEEE", { locale: ptBR })}
            </p>
            <p className="text-lg font-extrabold leading-none text-foreground">{selected.total} kcal</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">Calorias na semana</p>
      </div>

      <div className="mt-4 flex items-end justify-between gap-2">
        {week.map(({ day, total }) => {
          const isSelected = isSameDay(day, selectedDate);
          const barHeight = Math.max(4, Math.round((total / maxTotal) * BAR_TRACK_HEIGHT));

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => setSelectedDate(day)}
              className="flex flex-1 flex-col items-center gap-2"
              aria-label={`${format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}: ${total} kcal`}
            >
              <div
                className="flex w-full items-end justify-center rounded-full bg-secondary/60"
                style={{ height: BAR_TRACK_HEIGHT }}
              >
                <div
                  className={cn(
                    "w-full rounded-full transition-colors",
                    isSelected ? "bg-primary" : isToday(day) ? "bg-primary/60" : "bg-muted-foreground/30",
                  )}
                  style={{ height: barHeight }}
                />
              </div>
              <span
                className={cn(
                  "text-[11px] font-bold",
                  isSelected ? "text-primary" : "text-muted-foreground",
                )}
              >
                {DAY_LETTERS[day.getDay()]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
