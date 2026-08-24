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
  thresholds?: { low: number; medium: number }; // below low = green, above medium = red
  // Para métricas de risco importadas automaticamente da Anovator: o nível
  // (1-5) já vem pronto, sem precisar calcular por threshold.
  riskLevel?: number | null;
  // Override do texto exibido na coluna "Valor" (ex: "O3" para legRiskType).
  displayValue?: string | null;
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

// Mapeia o nível de risco (1-5) já classificado pela Anovator: 1-2 = Baixo,
// 3 = Médio, 4-5 = Alto.
function getRiskLevel(level: number | null | undefined) {
  if (level === null || level === undefined) return { label: '--', color: 'text-muted-foreground' };

  if (level <= 2) {
    return { label: 'Baixo', color: 'text-green-500' };
  } else if (level === 3) {
    return { label: 'Médio', color: 'text-yellow-500' };
  } else {
    return { label: 'Alto', color: 'text-red-500' };
  }
}

// Extrai o último dígito de strings como "O3"/"X2" pra usar o mesmo mapeamento de nível.
function parseLegRiskLevel(legRiskType: string | null): number | null {
  if (!legRiskType) return null;
  const match = legRiskType.match(/(\d+)\s*$/);
  if (!match) return null;
  return Number(match[1]);
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
    // Classificação de risco postural importada automaticamente da Anovator
    // (nível 1-5, distinta das medidas precisas acima)
    {
      label: 'Risco de Ombro',
      value: record.shoulder_risk_level,
      unit: '',
      riskLevel: record.shoulder_risk_level,
    },
    {
      label: 'Risco de Cifose',
      value: record.humpback_risk_level,
      unit: '',
      riskLevel: record.humpback_risk_level,
    },
    {
      label: 'Tipo/Risco de Perna',
      value: parseLegRiskLevel(record.leg_risk_type),
      unit: '',
      riskLevel: parseLegRiskLevel(record.leg_risk_type),
      displayValue: record.leg_risk_type,
    },
    {
      label: 'Risco de Pelve',
      value: record.pelvis_risk_level,
      unit: '',
      riskLevel: record.pelvis_risk_level,
    },
    {
      label: 'Risco de Escoliose',
      value: record.spine_risk_level,
      unit: '',
      riskLevel: record.spine_risk_level,
    },
    {
      label: 'Risco de Inclinação de Cabeça',
      value: record.head_risk_level,
      unit: '',
      riskLevel: record.head_risk_level,
    },
    {
      label: 'Risco de Joelho',
      value: record.knee_risk_level,
      unit: '',
      riskLevel: record.knee_risk_level,
    },
    {
      label: 'Risco de Cabeça Projetada',
      value: record.front_head_risk_level,
      unit: '',
      riskLevel: record.front_head_risk_level,
    },
    {
      label: 'Risco de Forma Corporal',
      value: record.body_shape_risk_level,
      unit: '',
      riskLevel: record.body_shape_risk_level,
    },
    {
      label: 'Risco Postural Geral',
      value: record.posture_risk_level,
      unit: '',
      riskLevel: record.posture_risk_level,
    },
  ];

  const availableMetrics = metrics.filter((metric) =>
    metric.riskLevel !== undefined ? metric.riskLevel !== null : metric.value !== null,
  );

  if (availableMetrics.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-4">
        <p className="text-sm text-muted-foreground text-center">
          Nenhum dado postural disponível para este exame ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl overflow-hidden">
      <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 border-b border-border">
        <span className="text-sm font-semibold text-foreground">Indicador</span>
        <span className="text-sm font-semibold text-foreground text-center">Valor</span>
        <span className="text-sm font-semibold text-foreground text-right">Nível</span>
      </div>

      <div className="divide-y divide-border">
        {availableMetrics.map((metric, index) => {
          const level = metric.riskLevel !== undefined
            ? getRiskLevel(metric.riskLevel)
            : getPostureLevel(metric.value, metric.thresholds!);

          const displayText = metric.displayValue
            ?? (metric.value !== null ? `${metric.value}${metric.unit}` : '--');

          return (
            <div key={index} className="grid grid-cols-3 gap-2 p-3">
              <span className="text-sm text-muted-foreground">{metric.label}</span>
              <span className="text-sm font-medium text-foreground text-center">
                {displayText}
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
