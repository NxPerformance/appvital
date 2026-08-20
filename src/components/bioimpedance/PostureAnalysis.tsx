import { BioimpedanceRecord } from '@/hooks/useBioimpedance';
import { cn } from '@/lib/utils';

interface PostureAnalysisProps {
  record: BioimpedanceRecord | null;
  previousRecord?: BioimpedanceRecord | null;
}

interface PostureMetric {
  label: string;
  value: number | null;
  unit: string;
  thresholds: { low: number; medium: number }; // below low = green, above medium = red
}

function getPostureLevel(value: number | null, thresholds: { low: number; medium: number }) {
  if (value === null) return { label: '--', color: 'text-muted-foreground' };
  
  const absValue = Math.abs(value);
  
  if (absValue <= thresholds.low) {
    return { label: 'Baixo', color: 'text-green-500' };
  } else if (absValue <= thresholds.medium) {
    return { label: 'Médio', color: 'text-yellow-500' };
  } else {
    return { label: 'Alto', color: 'text-red-500' };
  }
}

export function PostureAnalysis({ record }: PostureAnalysisProps) {
  if (!record) {
    return (
      <div className="bg-card rounded-2xl p-4">
        <p className="text-sm text-muted-foreground text-center">
          Nenhum dado postural disponível
        </p>
      </div>
    );
  }

  const metrics: PostureMetric[] = [
    { 
      label: 'Desnível dos Ombros', 
      value: record.shoulder_imbalance_cm, 
      unit: 'cm',
      thresholds: { low: 0.5, medium: 1.5 }
    },
    { 
      label: 'Curvatura da Coluna', 
      value: record.spine_curvature_cm, 
      unit: 'cm',
      thresholds: { low: 1, medium: 2 }
    },
    { 
      label: 'Inclinação da Cabeça', 
      value: record.head_tilt_degrees, 
      unit: '°',
      thresholds: { low: 2, medium: 5 }
    },
    { 
      label: 'Curvatura do Tronco', 
      value: record.trunk_curvature_degrees, 
      unit: '°',
      thresholds: { low: 3, medium: 7 }
    },
    { 
      label: 'Inclinação da Pelve', 
      value: record.pelvis_tilt_degrees, 
      unit: '°',
      thresholds: { low: 2, medium: 5 }
    },
    { 
      label: 'Projeção da Cabeça', 
      value: record.head_forward_degrees, 
      unit: '°',
      thresholds: { low: 5, medium: 15 }
    },
  ];

  return (
    <div className="bg-card rounded-2xl overflow-hidden">
      <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 border-b border-border">
        <span className="text-sm font-semibold text-foreground">Indicador</span>
        <span className="text-sm font-semibold text-foreground text-center">Valor</span>
        <span className="text-sm font-semibold text-foreground text-right">Nível</span>
      </div>
      
      <div className="divide-y divide-border">
        {metrics.map((metric, index) => {
          const level = getPostureLevel(metric.value, metric.thresholds);
          
          return (
            <div key={index} className="grid grid-cols-3 gap-2 p-3">
              <span className="text-sm text-muted-foreground">{metric.label}</span>
              <span className="text-sm font-medium text-foreground text-center">
                {metric.value !== null ? `${metric.value}${metric.unit}` : '--'}
              </span>
              <span className={cn("text-sm text-right font-medium", level.color)}>
                {level.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
