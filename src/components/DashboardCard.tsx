import { Link } from 'react-router-dom';
import { Crown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  to: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  isPremium?: boolean;
  isUserPremium?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export function DashboardCard({
  to,
  icon: Icon,
  title,
  subtitle,
  isPremium = false,
  isUserPremium = false,
  onClick,
}: DashboardCardProps) {
  const showLocked = isPremium && !isUserPremium;

  return (
    <Link
      to={showLocked ? "/premium" : to}
      onClick={onClick}
      className={cn(
        "bg-card hover:bg-card/80 rounded-2xl p-4 sm:p-5 transition-colors relative flex flex-col items-center justify-center text-center min-h-[120px] sm:min-h-[140px] overflow-hidden",
        showLocked && "border border-primary/25 bg-card/70"
      )}
    >
      {showLocked && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/35 to-background/80 backdrop-blur-[1px]" />
          <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
            <Lock className="h-3.5 w-3.5" />
          </div>
          <div className="absolute bottom-3 left-3 right-3 inline-flex items-center justify-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-[10px] font-bold text-primary">
            <Crown className="h-3 w-3" />
            Ver Premium
          </div>
        </>
      )}
      <Icon className={cn("w-8 h-8 sm:w-10 sm:h-10 text-accent mb-2", showLocked && "opacity-55")} />
      <h3 className={cn("font-semibold text-xs sm:text-sm leading-tight break-words px-1 mb-1", showLocked && "opacity-70")}>{title}</h3>
      <p className={cn("text-[10px] sm:text-xs text-muted-foreground", showLocked && "opacity-70")}>{showLocked ? "Prévia liberada no plano" : subtitle || 'Gratuito'}</p>
    </Link>
  );
}
