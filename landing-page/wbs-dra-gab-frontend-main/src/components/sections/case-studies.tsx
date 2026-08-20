import { motion, useInView, animate } from "framer-motion";
import { useRef, useEffect } from "react";
import { ImageComparison } from "@/components/ui/image-comparison";
import { ShineBorder } from "@/components/ui/shine-border";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

const beforeAn = "/optimized/case2-before.webp";
const depoisAn = "/optimized/case2-after.webp";
const beforeCase2 = "/optimized/case1-before.webp";
const depoisCase2 = "/optimized/case1-after.webp";
const beforeCase3 = "/optimized/Lriants.webp";
const depoisCase3 = "/optimized/Lridps.webp";

interface Case {
  id: string;
  title: string;
  description: string;
  before: string;
  after: string;
  stats: string;
  beforePosition?: string;
  afterPosition?: string;
  isFounder?: boolean;
}

const cases: Case[] = [
  {
    id: "01",
    title: "Alta Performance",
    description: "Foco em perda de gordura com preservação e ganho de massa magra, melhora da definição e força. Resultado de uma estratégia integrada de avaliação metabólica, treino e nutrição personalizada. e vitalidade.",
    before: beforeCase2,
    after: depoisCase2,
    stats: "-12kg",
    beforePosition: "center 90%",
    afterPosition: "center 100%",
    isFounder: true
  },
  {
    id: "02",
    title: "Equilíbrio Hormonal & Metabólico",
    description: "Transformação com redução expressiva de gordura corporal, associada ao ganho de massa magra e melhora da força, disposição e composição corporal. Resultado de reposição hormonal combinada com dieta, treino e suplementação individualizada.",
    before: beforeAn,
    after: depoisAn,
    stats: "-15kg",
    beforePosition: "center 10%",
    afterPosition: "center 100%"
  },
  {
    id: "03",
    title: "Performance Elite",
    description: "Foco em otimização hormonal e queima de gordura visceral para alta performance esportiva.",
    before: beforeCase3,
    after: depoisCase3,
    stats: "-8kg",
    beforePosition: "center",
    afterPosition: "center"
  }
];

function AnimatedStats({ value }: { value: string }) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(nodeRef, { margin: "-20px" });
  
  const match = value.match(/(-?)([\d,.]+)(.*)/);
  
  useEffect(() => {
    if (!isInView || !nodeRef.current || !match) return;
    
    const [, , numberStr] = match;
    const number = parseFloat(numberStr.replace(',', '.'));
    let controls: any;
    let timeoutId: NodeJS.Timeout;

    const runAnimation = () => {
      controls = animate(0, number, {
        duration: 3.5,
        ease: "easeOut",
        onUpdate: (v) => {
          if (nodeRef.current) {
            nodeRef.current.textContent = Math.round(v).toString();
          }
        },
        onComplete: () => {
          if (nodeRef.current) nodeRef.current.textContent = numberStr;
          timeoutId = setTimeout(() => {
            if (isInView) runAnimation();
          }, 15000);
        }
      });
    };

    runAnimation();
    
    return () => {
      if (controls) controls.stop();
      clearTimeout(timeoutId);
    };
  }, [isInView, match]);

  if (!match) return <span>{value}</span>;

  return (
    <span className="inline-flex items-baseline">
      <span>{match[1]}</span>
      <span ref={nodeRef}>0</span>
      <span>{match[3]}</span>
    </span>
  );
}

export function CaseStudies() {
  const autoplay = useRef(Autoplay({ delay: 5000, stopOnInteraction: false }));

  const [emblaRef] = useEmblaCarousel(
    { 
      align: "center",
      containScroll: "trimSnaps",
      loop: true,
      watchDrag: (emblaApi, event) => {
        const target = event.target as HTMLElement;
        if (target.closest(".cursor-ew-resize")) return false;
        return true;
      },
      breakpoints: {
        "(min-width: 768px)": { active: false }
      }
    },
    [autoplay.current]
  );

  const handleInteractionStart = () => {
    try {
      autoplay.current.stop();
    } catch {
      // Autoplay may already be stopped while Embla is settling.
    }
  };

  const handleInteractionEnd = () => {
    try {
      autoplay.current.play();
    } catch {
      // Autoplay may not be ready immediately after a drag interaction.
    }
  };

  return (
    <section className="pt-16 pb-8 md:pt-24 md:pb-12 lg:pt-28 lg:pb-16 bg-background overflow-hidden">
      <div className="container mx-auto px-4 md:px-12 max-w-7xl">
        <div className="flex flex-col items-center text-center space-y-3 mb-4 lg:mb-6">
          <div className="h-1 w-20 bg-accent" />
          <h2 className="text-4xl md:text-6xl font-sans font-medium text-white tracking-tight">
            RESULTADOS <span className="text-accent italic">REAIS</span>
          </h2>
          <p className="text-white/40 max-w-2xl font-light">
            Arraste o cursor sobre as imagens para ver a transformação completa.
          </p>
        </div>

        <div className="md:block" ref={emblaRef}>
          <div className="flex md:grid md:grid-cols-3 md:gap-12 max-w-[1400px] mx-auto items-stretch touch-pan-y">
            {cases.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                data-case-card={item.id}
                className="flex-[0_0_85%] min-w-0 pl-4 md:pl-0 md:flex-none flex flex-col gap-6 h-full"
              >
                <div className="relative rounded-2xl overflow-hidden p-0.5 shrink-0">
                  <ShineBorder
                    className="rounded-2xl z-20"
                    shineColor={["#2c123b", "#ffd166"]}
                    borderWidth={2}
                  />
                  <div className="relative z-10 rounded-2xl overflow-hidden">
                    <ImageComparison 
                      beforeImage={item.before} 
                      afterImage={item.after}
                      onInteractionStart={handleInteractionStart}
                      onInteractionEnd={handleInteractionEnd}
                      beforePosition={item.beforePosition || "center"}
                      afterPosition={item.afterPosition || "center"}
                    />
                    {item.isFounder && (
                      <div className="absolute z-30 bg-accent text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-accent/20 border border-white/20 left-4 bottom-4">
                        Dra. Gabriela Zinhani
                      </div>
                    )}
                  </div>
                </div>

                <div className="glass-card p-6 md:p-8 border-white/10 flex-1 flex flex-col bg-accent/5 border-accent/20 relative overflow-hidden min-h-[450px] md:min-h-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-50 pointer-events-none" />
                  <div className="flex justify-between items-start mb-6 relative z-10 gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent brightness-125">
                          Caso {item.id}
                        </span>
                        <div className="h-px w-8 bg-accent/30" />
                      </div>
                      <h3 className="text-2xl md:text-3xl font-sans font-medium leading-tight text-accent">
                        {item.title}
                      </h3>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl md:text-3xl font-bold text-white tabular-nums whitespace-nowrap">
                        <AnimatedStats value={item.stats} />
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-white/40">
                        Resultado
                      </p>
                    </div>
                  </div>
                  <p className="text-sm md:text-base text-white/60 leading-relaxed font-light">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
