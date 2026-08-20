import type { ReactNode } from "react";
import { Crown, Lock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PremiumPreviewGateProps {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}

export function PremiumPreviewGate({ title, description, children, className }: PremiumPreviewGateProps) {
  return (
    <section className={cn("relative overflow-hidden rounded-[2rem] border border-primary/20 bg-card/90 shadow-elegant", className)}>
      <div className="pointer-events-none select-none opacity-45 blur-[2px] saturate-75" aria-hidden="true">
        {children}
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background/95" />

      <div className="absolute inset-0 flex items-center justify-center p-5">
        <div className="w-full max-w-xl rounded-[2rem] border border-primary/25 bg-background/78 p-6 text-center shadow-glow backdrop-blur-xl md:p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
            <Crown className="h-8 w-8" />
          </div>
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            Prévia Premium
          </div>
          <h2 className="text-2xl font-bold leading-tight md:text-3xl">{title}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">{description}</p>
          <Link
            to="/premium"
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 text-sm font-bold text-primary-foreground shadow-glow transition-opacity hover:opacity-95"
          >
            <Lock className="h-4 w-4" />
            Desbloquear Premium
          </Link>
        </div>
      </div>
    </section>
  );
}
