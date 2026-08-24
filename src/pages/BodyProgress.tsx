import { useState } from "react";
import { ArrowLeft, Camera, Lock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PhotosTab } from "@/pages/evolucao/PhotosTab";
import { BioimpedanciaTab } from "@/pages/evolucao/BioimpedanciaTab";

type EvolucaoTab = "fotos" | "bioimpedancia";

const tabs: Array<{ id: EvolucaoTab; label: string }> = [
  { id: "fotos", label: "Fotos & Medidas" },
  { id: "bioimpedancia", label: "Bioimpedância" },
];

export default function BodyProgress() {
  const [activeTab, setActiveTab] = useState<EvolucaoTab>("fotos");

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background-strong))_100%)]">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 pb-28 pt-4 md:px-7 md:pb-8 md:pt-7">
        <header className="rounded-[2rem] border border-white/5 bg-card/90 p-6 shadow-elegant">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-3">
              <Link
                to="/"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                Acompanhamento clínico
              </div>
              <h1 className="text-3xl font-bold leading-tight tracking-normal md:text-5xl">Evolução</h1>
              <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
                Fotos de progresso e exames de bioimpedância em um só lugar.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary md:self-auto">
              <Lock className="h-4 w-4" />
              Visível apenas para você
            </div>
          </div>

          <nav className="mt-6 flex gap-2 rounded-xl border border-white/10 bg-secondary/50 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-bold transition-colors",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.id === "fotos" ? <Camera className="h-4 w-4" /> : null}
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        {activeTab === "fotos" ? <PhotosTab /> : <BioimpedanciaTab />}
      </div>
    </div>
  );
}
