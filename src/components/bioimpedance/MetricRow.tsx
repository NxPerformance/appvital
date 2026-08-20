import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricRowProps {
  label: string;
  value: number | string | null;
  unit?: string;
  previousValue?: number | null;
  standard?: string;
  isLowerBetter?: boolean;
  showDifference?: boolean;
}

export function MetricRow({
  label,
  value,
  unit = '',
  previousValue,
  standard,
  isLowerBetter = false,
  showDifference = true,
}: MetricRowProps) {
  const displayValue = value !== null && value !== undefined
    ? `${value}${unit}`
    : '--';

  const difference = 
    showDifference && 
    typeof value === 'number' && 
    previousValue !== null && 
    previousValue !== undefined
      ? Number((value - previousValue).toFixed(2))
      : null;

  const getDifferenceColor = () => {
    if (difference === null || difference === 0) return 'text-muted-foreground';
    
    const isPositiveChange = difference > 0;
    const isGood = isLowerBetter ? !isPositiveChange : isPositiveChange;
    
    return isGood ? 'text-green-500' : 'text-red-500';
  };

  const getDifferenceIcon = () => {
    if (difference === null) return null;
    if (difference === 0) return <Minus className="w-3 h-3" />;
    return difference > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  return (
    <div className="grid grid-cols-3 gap-2 p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center justify-center gap-1">
        <span className="text-sm font-medium text-foreground">{displayValue}</span>
        {difference !== null && (
          <span className={cn("flex items-center text-xs", getDifferenceColor())}>
            {getDifferenceIcon()}
            {Math.abs(difference)}{unit}
          </span>
        )}
      </div>
      <span className="text-sm text-muted-foreground text-right">{standard || '--'}</span>
    </div>
  );
}
