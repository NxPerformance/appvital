import { motion } from "framer-motion";
const performanceImg = "/optimized/performance.webp";

export function PerformanceSection() {
  return (
    <section
      id="performance"
      className="py-16 md:py-24 lg:py-28 bg-background overflow-hidden"
    >
      <div className="container mx-auto px-4 md:px-12 max-w-7xl">
        <div className="glass-card overflow-hidden p-8 lg:p-20 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h2 className="text-4xl md:text-6xl font-sans font-medium text-white leading-tight tracking-tight">
                  A camada de execução para sua saúde.
                </h2>
                <p className="text-lg text-white/40 font-light leading-relaxed max-w-lg">
                  Avaliação global do paciente que integra metabolismo, hormônios,
                  composição corporal, genética, estilo de vida e alimentação,
                  para criarmos protocolos individualizados que promovem qualidade
                  de vida, saúde, longevidade e performance.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-y-8 gap-x-12 lg:gap-x-20 pt-4">
                {[
                  { label: "Análise", value: "Metabólica & Hormonal" },
                  { label: "Precisão", value: "99.9%" },
                  { label: "Suporte", value: "Personalizado" },
                  { label: "Foco", value: "Resultados" },
                ].map((stat, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-sans">
                      {stat.label}
                    </p>
                    <p className="text-xl text-white font-medium lg:whitespace-nowrap">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
              className="relative aspect-square lg:aspect-video rounded-3xl overflow-hidden border border-white/5"
            >
              <img
                src={performanceImg}
                alt="Performance Flow"
                width={600}
                height={600}
                loading="lazy"
                className="h-full w-full object-cover grayscale opacity-40 transition-all duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />

              {/* Dynamic Wave Overlay */}
              <div className="absolute bottom-10 left-10 right-10 flex items-end gap-1 h-20">
                {[1,2,3,4,5,6,7,8,9,10].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [20, 60, 20] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                    className="flex-1 bg-accent/30 rounded-full"
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
