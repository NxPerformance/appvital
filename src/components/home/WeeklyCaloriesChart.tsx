import { useMemo, useState } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeeklyCaloriesChartProps {
  entries: Array<{ date: string; calories: number | null }>;
}

type Period = "week" | "month";

const DAY_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];

// Referência fixa de "sessão cheia", não o maior valor do próprio histórico —
// senão o primeiro registro que existir sempre bate 100% só por ser único,
// o que não significa nada. É o mesmo princípio de meta fixa que apps como
// Apple Fitness/Fitbit usam: a barra enche em relação a um alvo, não a um
// recorde pessoal. 500 kcal é uma sessão de musculação de intensidade
// razoável para a maioria dos pacientes. Esse valor é apenas o PISO da escala
// (Math.max com o maior total real da semana) — dias acima do alvo continuam
// escalando corretamente, em vez de terem a barra cortada em 500.
const DAILY_CALORIE_TARGET = 500;
const WEEKLY_CALORIE_TARGET = DAILY_CALORIE_TARGET * 3;

// Altura mínima da barra em % — mesmo um dia com 0 kcal precisa de um
// "coto" visível, senão o dia some da linha do gráfico.
const MIN_BAR_HEIGHT_PERCENT = 6;

// Teto da barra em % (não 100%) — sobra espaço pro badge flutuante do dia
// selecionado não colidir com o cabeçalho do card, já que a área do
// gráfico é baixa (card mobile fixado em 130px de altura, igual ao Figma).
const MAX_BAR_HEIGHT_PERCENT = 72;

interface ChartBar {
  id: string;
  xLabel: string;
  calories: number;
  isSelected: (selectedDate: Date) => boolean;
  representativeDate: Date;
}

export function WeeklyCaloriesChart({ entries }: WeeklyCaloriesChartProps) {
  const today = useMemo(() => new Date(), []);
  const [period, setPeriod] = useState<Period>("week");
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const weekBars = useMemo<ChartBar[]>(() => {
    const start = startOfWeek(today, { weekStartsOn: 0 });
    const end = endOfWeek(today, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end }).map((day) => {
      const total = entries.reduce((sum, entry) => {
        const entryDate = new Date(`${entry.date}T12:00:00`);
        if (!isSameDay(entryDate, day)) return sum;
        return sum + (entry.calories ?? 0);
      }, 0);
      return {
        id: day.toISOString(),
        xLabel: DAY_LETTERS[day.getDay()],
        calories: total,
        isSelected: (selected) => isSameDay(day, selected),
        representativeDate: day,
      };
    });
  }, [entries, today]);

  const monthBars = useMemo<ChartBar[]>(() => {
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    // Sempre 4 semanas por mês (dias 1-7, 8-14, 15-21, 22-fim), em vez de
    // semanas civis (dom-sáb): alinhar por semana civil rende de 5 a 6
    // barras por mês, com as pontas cortadas em pedaços de 1-2 dias — mais
    // confuso do que as "4 semanas" que as pessoas esperam ver.
    const bucketStarts = [1, 8, 15, 22];

    return bucketStarts.map((startDay, index) => {
      const rangeStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), startDay);
      const nextStartDay = bucketStarts[index + 1];
      const rangeEnd = nextStartDay
        ? new Date(monthStart.getFullYear(), monthStart.getMonth(), nextStartDay - 1, 23, 59, 59, 999)
        : monthEnd;

      const total = entries.reduce((sum, entry) => {
        const entryDate = new Date(`${entry.date}T12:00:00`);
        if (entryDate < rangeStart || entryDate > rangeEnd) return sum;
        return sum + (entry.calories ?? 0);
      }, 0);

      return {
        id: `S${index + 1}`,
        xLabel: `S${index + 1}`,
        calories: total,
        isSelected: (selected) => selected >= rangeStart && selected <= rangeEnd,
        representativeDate: rangeStart,
      };
    });
  }, [entries, today]);

  const bars = period === "week" ? weekBars : monthBars;

  const chartMax = useMemo(
    () => Math.max(period === "week" ? DAILY_CALORIE_TARGET : WEEKLY_CALORIE_TARGET, ...bars.map((bar) => bar.calories)),
    [bars, period],
  );

  const monthLabel = useMemo(() => {
    const label = format(today, "MMMM", { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [today]);

  const togglePeriod = () => {
    setPeriod((current) => (current === "week" ? "month" : "week"));
    setSelectedDate(today);
  };

  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-card p-3.5 shadow-elegant md:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary md:h-9 md:w-9">
            <Flame className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </span>
          <p className="text-sm font-extrabold text-foreground">Calorias</p>
        </div>
        <button
          type="button"
          onClick={togglePeriod}
          className="flex shrink-0 items-center gap-1 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          {period === "week" ? "Semana" : "Mês"}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {period === "month" ? (
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground md:mt-3">
          {monthLabel}
        </p>
      ) : null}

      <div className="mt-4 flex h-14 items-end justify-between gap-2 md:mt-8 md:h-32">
        {bars.map((bar) => {
          const isSelected = bar.isSelected(selectedDate);
          const heightPercent = Math.min(
            MAX_BAR_HEIGHT_PERCENT,
            Math.max(MIN_BAR_HEIGHT_PERCENT, Math.round((bar.calories / chartMax) * 100)),
          );

          return (
            <button
              key={bar.id}
              type="button"
              onClick={() => setSelectedDate(bar.representativeDate)}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5 md:gap-2"
            >
              <div className="relative flex w-full flex-1 items-end justify-center">
                {isSelected ? (
                  <span
                    className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-background px-2 py-1 text-[11px] font-extrabold text-primary shadow-elegant"
                    style={{ bottom: `calc(${heightPercent}% + 8px)` }}
                  >
                    {bar.calories} kcal
                  </span>
                ) : null}
                <div
                  className={cn(
                    "w-full max-w-[32px] rounded-md transition-all",
                    isSelected ? "bg-gradient-primary" : "bg-secondary",
                  )}
                  style={{ height: `${heightPercent}%` }}
                />
              </div>
              <span
                className={cn(
                  "text-[11px] font-bold",
                  isSelected ? "text-primary" : "text-muted-foreground",
                )}
              >
                {bar.xLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
