import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ptBR } from 'date-fns/locale';
import { BioimpedanceRecord } from '@/hooks/useBioimpedance';
import { formatDateSafe } from '@/lib/dateUtils';

interface EvolutionChartProps {
  records: BioimpedanceRecord[];
  selectedRecordId?: string | null;
}

type MetricKey = 'weight_kg' | 'body_fat_percent' | 'muscle_percent';

interface MetricConfig {
  key: MetricKey;
  label: string;
  color: string;
  unit: string;
}

const METRICS: MetricConfig[] = [
  { key: 'weight_kg', label: 'Peso', color: 'hsl(var(--accent))', unit: 'kg' },
  { key: 'body_fat_percent', label: 'Gordura', color: 'hsl(var(--destructive))', unit: '%' },
  { key: 'muscle_percent', label: 'Músculo', color: 'hsl(142, 76%, 36%)', unit: '%' },
];

const IDEAL_WEIGHT_COLOR = 'hsl(48, 96%, 53%)';

export function EvolutionChart({ records, selectedRecordId }: EvolutionChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('weight_kg');

  if (records.length === 0) {
    return (
      <div className="bg-muted h-52 rounded-2xl flex items-center justify-center">
        <p className="text-muted-foreground">Nenhum exame registrado</p>
      </div>
    );
  }

  // Prepare chart data (reverse to show oldest first)
  const chartData = [...records]
    .reverse()
    .map((record) => ({
      id: record.id,
      date: formatDateSafe(record.date, 'dd/MM', { locale: ptBR }),
      fullDate: formatDateSafe(record.date, 'dd/MM/yyyy', { locale: ptBR }),
      weight_kg: record.weight_kg,
      ideal_weight_kg: record.ideal_weight_kg,
      body_fat_percent: record.body_fat_percent,
      muscle_percent: record.muscle_percent,
    }));

  const currentMetric = METRICS.find((m) => m.key === selectedMetric)!;
  const showIdealWeight = selectedMetric === 'weight_kg' && chartData.some((d) => d.ideal_weight_kg !== null);

  return (
    <div className="space-y-3">
      {/* Metric Selector */}
      <div className="flex gap-2">
        {METRICS.map((metric) => (
          <button
            key={metric.key}
            type="button"
            onClick={() => setSelectedMetric(metric.key)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              selectedMetric === metric.key
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {metric.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-card rounded-2xl p-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
              formatter={(value: number, name: string) => [`${value}${currentMetric.unit}`, name]}
              labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
            />
            {showIdealWeight ? (
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span className="text-muted-foreground">{value}</span>} />
            ) : null}
            {showIdealWeight ? (
              <Line
                type="monotone"
                dataKey="ideal_weight_kg"
                name="Peso ideal"
                stroke={IDEAL_WEIGHT_COLOR}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                connectNulls
              />
            ) : null}
            <Line
              type="monotone"
              dataKey={selectedMetric}
              name={currentMetric.label}
              stroke={currentMetric.color}
              strokeWidth={2}
              dot={(props: { cx: number; cy: number; payload: { id: string } }) => {
                const isSelected = props.payload.id === selectedRecordId;
                return (
                  <circle
                    key={props.payload.id}
                    cx={props.cx}
                    cy={props.cy}
                    r={isSelected ? 7 : 4}
                    fill={currentMetric.color}
                    stroke={isSelected ? 'hsl(var(--background))' : 'none'}
                    strokeWidth={isSelected ? 2 : 0}
                  />
                );
              }}
              activeDot={{ r: 6, fill: currentMetric.color }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
