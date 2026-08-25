import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { eachDayOfInterval, endOfWeek, format, isSameDay, isToday, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Flame } from "lucide-react";

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
            <p className="text-lg font-extrabold leading-none text-foreground">{selected.calories} kcal</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">Calorias na semana</p>
      </div>

      <div className="mt-3 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={week} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap="18%">
            <YAxis hide domain={[0, DAILY_CALORIE_TARGET]} allowDataOverflow />
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
            <Tooltip
              cursor={false}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                padding: "6px 10px",
              }}
              labelStyle={{ display: "none" }}
              formatter={(value: number) => [`${value} kcal`, ""]}
            />
            <Bar
              dataKey="calories"
              radius={[8, 8, 8, 8]}
              background={{ fill: "hsl(var(--muted-foreground) / 0.08)", radius: 8 }}
              onClick={(data: { day: Date }) => setSelectedDate(data.day)}
              cursor="pointer"
              isAnimationActive={false}
            >
              {week.map((entry) => {
                const isSelected = isSameDay(entry.day, selectedDate);
                const fill = isSelected
                  ? "hsl(var(--primary))"
                  : isToday(entry.day)
                    ? "hsl(var(--primary) / 0.55)"
                    : "hsl(var(--muted-foreground) / 0.4)";
                return <Cell key={entry.day.toISOString()} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
