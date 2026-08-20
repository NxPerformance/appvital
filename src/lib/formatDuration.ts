/**
 * Formata minutos (com decimais) para formato legível com horas, minutos e segundos.
 * Ex: 92.98 → "1h 32min 59s"
 */
export const formatDuration = (totalMinutes: number | null): string => {
  if (!totalMinutes) return '';
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  const seconds = Math.round((totalMinutes % 1) * 60);
  
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}min`);
  if (seconds > 0) parts.push(`${seconds}s`);
  
  return parts.length > 0 ? parts.join(' ') : '0min';
};

/**
 * Versão compacta para dashboards: "1h 32m" (sem segundos)
 */
export const formatDurationCompact = (totalMinutes: number | null): string => {
  if (!totalMinutes) return '0m';
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }
  return `${minutes}m`;
};
