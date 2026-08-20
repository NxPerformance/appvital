import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BioimpedanceSection() {
  return (
    <section id="bioimpedancia">
      <div className="container mx-auto px-4 md:px-12 max-w-7xl relative z-10">
        <div className="glass-card overflow-hidden bg-gradient-to-br from-primary/20 to-transparent">
          
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">

            {/* TEXTO */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="p-6 sm:p-8 lg:p-16 space-y-6 sm:space-y-8"
            >
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-[10px] font-mono tracking-[0.2em] text-accent uppercase">
                  Tecnologia de Ponta
                </div>

                <h2 className="text-4xl md:text-5xl font-sans font-medium text-white leading-tight">
                  Bioimpedância <br />
                  <span className="text-accent italic">Avançada</span>
                </h2>

                <p className="text-lg text-white/40 font-light leading-relaxed">
                  Não trabalhamos com estimativas. Utilizamos tecnologia de bioimpedância
                  de última geração para mapear com precisão milimétrica sua composição
                  corporal, taxa metabólica e níveis de hidratação celular.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  "Massa Muscular Segmentada",
                  "Percentual de Gordura Visceral",
                  "Água Corporal Total",
                  "Análise Evolutiva Comparativa",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-white/60">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <span className="text-[10px] font-sans tracking-wide uppercase">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 sm:pt-4">
                <a
                  href="https://wa.me/5562998549508?text=Ol%C3%A1%2C%20tudo%20bem%3F%20Gostaria%20de%20agendar%20uma%20bioimpedância!"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    size="xl"
                    className="w-full relative overflow-hidden rounded-full 
                    bg-gradient-to-r from-[#b8860b] via-[#ffd166] to-[#b8860b] bg-[length:200%_auto]
                    text-[#2c123b] font-sans font-bold tracking-widest
                    py-4 px-2 sm:px-12
                    border border-[#ffd166]/50 
                    shadow-[0_0_20px_rgba(255,209,102,0.4)] 
                    hover:shadow-[0_0_40px_rgba(255,209,102,0.7)] hover:scale-[1.01] 
                    transition-all duration-500 group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-shine skew-x-12" />
                    <div className="flex items-center justify-center gap-2 relative z-10">
                      <span className="text-[10px] sm:text-sm font-bold tracking-widest">
                        AGENDAR BIOIMPEDÂNCIA
                      </span>
                      <ChevronRight className="hidden sm:block h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Button>
                </a>
              </div>
            </motion.div>

            {/* VÍDEO */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
              className="relative h-full min-h-[400px] overflow-hidden order-first lg:order-last"
            >
              <video
                src="/anovator_1768355184387.mp4"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className="absolute inset-0 w-full h-full object-cover object-[center_top] opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-background/40" />
            </motion.div>

          </div>
        </div>
      </div>
    </section>
  );
}
