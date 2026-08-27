import { ArrowLeft, Calendar, CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

interface PlanTier {
  name: string;
  description: string;
  features: string[];
}

const tiers: PlanTier[] = [
  {
    name: "Vital 360° Essencial",
    description: "4 consultas ao longo de 12 meses, para acompanhar sua evolução e ajustar a estratégia conforme a necessidade.",
    features: ["4 consultas com a Dra. Gabriela em 12 meses", "Ajuste contínuo da estratégia", "Sem consulta de retorno"],
  },
  {
    name: "Vital 360° Completo",
    description: "4 consultas + 4 bioimpedâncias ao longo de 12 meses, permitindo acompanhar também a evolução da composição corporal de forma mais próxima.",
    features: [
      "4 consultas com a Dra. Gabriela em 12 meses",
      "4 bioimpedâncias ao longo do ano",
      "Acompanhamento próximo da composição corporal",
    ],
  },
];

export default function Vital360() {
  return (
    <div className="min-h-full bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background-strong))_100%)]">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 pb-28 pt-4 md:px-7 md:pb-8 md:pt-7">
        <header className="space-y-3">
          <Link
            to="/"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Acompanhamento anual
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-normal md:text-4xl">Vital 360°</h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Um plano de emagrecimento e consultas com acompanhamento anual direto com a Dra. Gabriela Zinhani Issy.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-card p-6 shadow-elegant"
            >
              <h2 className="text-xl font-black text-foreground">{tier.name}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{tier.description}</p>
              <ul className="space-y-2">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                to="/appointments"
                className="mt-auto flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5"
              >
                <Calendar className="h-4 w-4" />
                Quero este plano
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Ao escolher um plano, você será direcionado para agendar sua primeira consulta.
        </p>
      </div>
    </div>
  );
}
