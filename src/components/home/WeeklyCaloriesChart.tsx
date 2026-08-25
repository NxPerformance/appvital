import { useMemo, useState } from "react";
import { eachDayOfInterval, endOfWeek, format, isSameDay, isToday, startOfWeek, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeeklyCaloriesChartProps {
  entries: Array<{ date: string; calories: number | null }>;
}

const DAY_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];
const BAR_TRACK_HEIGHT = 88;
const SCALING_WINDOW_DAYS = 56;

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

  // Escala as barras pelo maior valor das últimas 8 semanas, não só da semana
  // exibida — senão, com poucos registros, o único dia com dado sempre bate
  // 100% (ele é "o maior" só por ser o único), toda semana, mesmo sem
  // significar nada de especial.
  const scalingMax = useMemo(() => {
    const windowStart = subDays(today, SCALING_WINDOW_DAYS);
    const values = entries
      .filter((entry) => new Date(`${entry.date}T12:00:00`) >= windowStart)
      .map((entry) => entry.calories ?? 0);
    return Math.max(...values, 1);
  }, [entries, today]);

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

      <div className="mt-5 flex items-end justify-between gap-1.5">
        {week.map(({ day, total }) => {
          const isSelected = isSameDay(day, selectedDate);
          const fillHeight = total > 0 ? Math.max(10, Math.round((total / scalingMax) * BAR_TRACK_HEIGHT)) : 0;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => setSelectedDate(day)}
              className="flex flex-1 flex-col items-center gap-2"
              aria-label={`${format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}: ${total} kcal`}
            >
              <div
                className={cn(
                  "relative w-full overflow-hidden rounded-2xl",
                  isSelected ? "bg-primary/20" : "bg-white/[0.06]",
                )}
                style={{ height: BAR_TRACK_HEIGHT }}
              >
                <div
                  className={cn(
                    "absolute inset-x-0 bottom-0 rounded-2xl transition-all",
                    isSelected ? "bg-primary" : isToday(day) ? "bg-primary/55" : "bg-muted-foreground/40",
                  )}
                  style={{ height: fillHeight }}
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
