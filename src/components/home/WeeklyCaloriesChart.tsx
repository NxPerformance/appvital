import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import {
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, Flame } from "lucide-react";

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

interface ChartBar {
  id: string;
  xLabel: string;
  calories: number;
  isSelected: (selectedDate: Date) => boolean;
  representativeDate: Date;
}

interface CalloutProps {
  x: number;
  y: number;
  width: number;
  index: number;
}

export function WeeklyCaloriesChart({ entries }: WeeklyCaloriesChartProps) {
  const today = useMemo(() => new Date(), []);
  const [period, setPeriod] = useState<Period>("week");
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

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
    const weekStarts = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 0 });

    return weekStarts.map((weekStart, index) => {
      const rangeStart = weekStart < monthStart ? monthStart : weekStart;
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      const rangeEnd = weekEnd > monthEnd ? monthEnd : weekEnd;

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
  const selected = bars.find((bar) => bar.isSelected(selectedDate)) ?? bars[bars.length - 1];
  const selectedIndex = bars.findIndex((bar) => bar.id === selected.id);

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
    setActiveIndex(null);
  };

  const renderSelectedCallout = (props: CalloutProps) => {
    const { x, y, width, index } = props;
    const bar = bars[index];
    if (!bar || index !== activeIndex) return <g key={`callout-${index}`} />;

    const label = `${bar.calories} kcal`;
    const boxWidth = Math.max(56, label.length * 7 + 20);
    const boxHeight = 26;
    const cx = x + width / 2;
    const boxY = y - boxHeight - 8;

    return (
      <g key={`callout-${index}`}>
        <rect
          x={cx - boxWidth / 2}
          y={boxY}
          width={boxWidth}
          height={boxHeight}
          rx={8}
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
        />
        <text
          x={cx}
          y={boxY + boxHeight / 2 + 4}
          textAnchor="middle"
          fontSize={12}
          fontWeight={700}
          fill="hsl(var(--primary))"
        >
          {label}
        </text>
      </g>
    );
  };

  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-card p-4 shadow-elegant">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Flame className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {period === "week"
                ? isToday(selected.representativeDate)
                  ? "Calorias hoje"
                  : format(selected.representativeDate, "EEEE", { locale: ptBR })
                : `${monthLabel} · Semana ${selectedIndex + 1}`}
            </p>
            <p className="text-lg font-extrabold leading-none text-foreground">{selected.calories} kcal</p>
          </div>
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

      <div className="mt-4 h-32 md:h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={bars}
            margin={{ top: 34, right: 4, left: 0, bottom: 0 }}
            barCategoryGap="18%"
            barSize={period === "week" ? 36 : 42}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <defs>
              <linearGradient id="calorieBarDefault" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(270, 45%, 62%)" />
                <stop offset="100%" stopColor="hsl(270, 40%, 42%)" />
              </linearGradient>
              <linearGradient id="calorieBarSelected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--primary-strong))" stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 4" />
            <YAxis
              domain={[0, chartMax]}
              tickCount={6}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              width={36}
            />
            <XAxis
              dataKey="xLabel"
              axisLine={false}
              tickLine={false}
              height={20}
              tick={(props: { x: number; y: number; payload: { index: number; value: string } }) => {
                const bar = bars[props.payload.index];
                const isSelected = bar && bar.isSelected(selectedDate);
                return (
                  <text
                    x={props.x}
                    y={props.y + 12}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={700}
                    fill={isSelected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                  >
                    {props.payload.value}
                  </text>
                );
              }}
            />
            <Bar
              dataKey="calories"
              radius={[8, 8, 8, 8]}
              onClick={(_data: unknown, index: number) => {
                const bar = bars[index];
                if (!bar) return;
                setSelectedDate(bar.representativeDate);
                setActiveIndex(index);
              }}
              cursor="pointer"
              isAnimationActive={false}
              label={renderSelectedCallout}
            >
              {bars.map((bar, index) => (
                <Cell
                  key={bar.id}
                  fill={bar.isSelected(selectedDate) ? "url(#calorieBarSelected)" : "url(#calorieBarDefault)"}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
