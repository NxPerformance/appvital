import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { eachDayOfInterval, endOfWeek, format, isSameDay, isToday, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Flame } from "lucide-react";

interface WeeklyCaloriesChartProps {
  entries: Array<{ date: string; calories: number | null }>;
}

const DAY_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];

// Referência fixa de "sessão cheia", não o maior valor do próprio histórico —
// senão o primeiro registro que existir sempre bate 100% só por ser único,
// o que não significa nada. É o mesmo princípio de meta fixa que apps como
// Apple Fitness/Fitbit usam: a barra enche em relação a um alvo, não a um
// recorde pessoal. 500 kcal é uma sessão de musculação de intensidade
// razoável para a maioria dos pacientes; dias acima disso só mostram a
// barra cheia (o valor real continua certo no texto).
const DAILY_CALORIE_TARGET = 500;

interface CalloutProps {
  x: number;
  y: number;
  width: number;
  index: number;
}

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
      return { day, dayLabel: DAY_LETTERS[day.getDay()], calories: total };
    });
  }, [entries, today]);

  const selected = week.find((d) => isSameDay(d.day, selectedDate)) ?? week[week.length - 1];

  const renderSelectedCallout = (props: CalloutProps) => {
    const { x, y, width, index } = props;
    const entry = week[index];
    if (!entry || !isSameDay(entry.day, selectedDate)) return <g key={`callout-${index}`} />;

    const label = `${entry.calories} kcal`;
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
              {isToday(selected.day) ? "Calorias hoje" : format(selected.day, "EEEE", { locale: ptBR })}
            </p>
            <p className="text-lg font-extrabold leading-none text-foreground">{selected.calories} kcal</p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-secondary/40 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          Calorias na semana
        </span>
      </div>

      <div className="mt-4 h-32 md:h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={week} margin={{ top: 34, right: 4, left: -20, bottom: 0 }} barCategoryGap="18%" barSize={36}>
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
              domain={[0, DAILY_CALORIE_TARGET]}
              allowDataOverflow
              tickCount={6}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              width={32}
            />
            <XAxis
              dataKey="dayLabel"
              axisLine={false}
              tickLine={false}
              height={20}
              tick={(props: { x: number; y: number; payload: { index: number; value: string } }) => {
                const dayData = week[props.payload.index];
                const isSelected = dayData && isSameDay(dayData.day, selectedDate);
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
              onClick={(data: { day: Date }) => setSelectedDate(data.day)}
              cursor="pointer"
              isAnimationActive={false}
              label={renderSelectedCallout}
            >
              {week.map((entry) => {
                const isSelected = isSameDay(entry.day, selectedDate);
                return (
                  <Cell
                    key={entry.day.toISOString()}
                    fill={isSelected ? "url(#calorieBarSelected)" : "url(#calorieBarDefault)"}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
