import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function VitalMethod() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  const cardVariants = {
    hiddenDesktop: { opacity: 0, x: -50 },
    visibleDesktop: { opacity: 1, x: 0 },

    hiddenMobile: { opacity: 1, y: 0 },
    visibleMobile: { opacity: 1, y: 0 },
  };

  const pillars = [
    {
      letter: "V",
      title: "Vida Metabólica Ativa",
      desc: "Correção de inflamações silenciosas, resistência insulínica, causas intestinais e deficiências nutricionais.",
    },
    {
      letter: "I",
      title: "Inteligência Hormonal",
      desc: "Avaliação completa do seu terreno biológico, com possibilidade de reposição hormonal quando necessário.",
    },
    {
      letter: "T",
      title: "Treino com Propósito",
      desc: "Exercício com objetivo definido: hipertrofia, emagrecimento, saúde, performance ou vitalidade ao envelhecer.",
    },
    {
      letter: "A",
      title: "Alimentação Estratégica",
      desc: "Plano alimentar personalizado baseado em exames, rotina, preferências, intolerâncias e necessidade biológica.",
    },
    {
      letter: "L",
      title: "Longevidade com Estética",
      desc: "Resultados que se mantêm: menos peso, mais vitalidade, mais confiança e mais qualidade de vida.",
    },
  ];

  if (isMobile === null) return null;

  return (
    <section
      id="metodo-vital"
      className="py-16 md:py-24 lg:py-28 bg-background relative overflow-hidden"
    >
      <div className="container mx-auto px-4 md:px-12 max-w-7xl relative z-10">
        {/* Header da Seção */}
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-16 mb-16 items-center lg:items-start">
          <div className="space-y-6 text-center lg:text-left">
            <h2 className="text-4xl md:text-6xl font-sans font-medium text-white tracking-tight">
              MÉTODO <span className="text-[#ffd166] italic">VITAL</span>
            </h2>
            <p className="text-xl md:text-2xl text-white/80 font-sans">
              5 Pilares para alcançar um{" "}
              <span className="text-[#fab31b] font-bold italic">
                resultado real e permanente.
              </span>
            </p>
          </div>

          <div className="pt-2 flex justify-center lg:justify-start">
            <p
              className="text-base md:text-lg text-white/40 font-light leading-relaxed 
                         text-center lg:text-left
                         border-none lg:border-l lg:border-[#fab31b]/20 lg:pl-6 
                         max-w-[500px] lg:max-w-full"
            >
              Saúde de verdade não é sobre tentar de tudo, é sobre entender o que o
              seu corpo realmente precisa. A verdade é simples: Seu corpo não
              precisa de mais tentativas. Ele precisa de estratégia, avaliação e
              ajuste real.
            </p>
          </div>
        </div>

        {/* Grid de Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {pillars.map((p, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              initial={isMobile ? "visibleMobile" : "hiddenDesktop"}
              whileInView={!isMobile ? "visibleDesktop" : undefined}
              transition={{
                duration: 0.5,
                delay: isMobile ? 0 : i * 0.15,
                ease: "easeOut",
              }}
              viewport={!isMobile ? { once: true } : undefined}
              className="glass-card p-8 flex flex-col items-center text-center group 
                         bg-[#2c123b]/10 border border-white/5 hover:border-[#fab31b]/30 
                         transition-all duration-500 cursor-pointer h-[420px] 
                         relative overflow-hidden"
            >
              <div className="absolute -inset-1 bg-gradient-to-b from-[#fab31b]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="h-28 flex items-center justify-center mb-4 relative z-10">
                <span className="text-7xl md:text-8xl font-serif font-bold transition-all duration-500 select-none
                                 text-[#ffd166] opacity-90 group-hover:opacity-100">
                  {p.letter}
                </span>
              </div>

              <div className="h-16 flex items-center justify-center mb-4 relative z-10 w-full">
                <motion.h3
                  className="text-[13px] font-bold uppercase tracking-[0.2em] leading-tight
                             bg-gradient-to-r from-[#ffd166]/30 via-[#ffd166] to-[#ffd166]/30
                             bg-[length:200%_100%] bg-clip-text text-transparent
                             group-hover:opacity-100 transition-opacity duration-500"
                  animate={
                    !isMobile
                      ? { backgroundPosition: ["200% 0", "-200% 0"] }
                      : undefined
                  }
                  transition={
                    !isMobile
                      ? {
                          duration: 4,
                          repeat: Infinity,
                          ease: "linear",
                          delay: i * 0.8,
                        }
                      : undefined
                  }
                >
                  {p.title}
                </motion.h3>
              </div>

              <div className="relative z-10">
                <p className="text-[11px] md:text-xs text-white/50 leading-relaxed font-light group-hover:text-white/90 transition-colors px-2">
                  {p.desc}
                </p>
              </div>

              <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-gradient-to-r from-transparent via-[#fab31b] to-transparent group-hover:w-full transition-all duration-700" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
