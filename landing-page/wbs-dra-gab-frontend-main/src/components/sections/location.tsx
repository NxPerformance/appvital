import { motion } from "framer-motion";
import { MapPin, ExternalLink } from "lucide-react";
import { ShineBorder } from "@/components/ui/shine-border";

const clinicImg = "/optimized/clinic-location.webp";

export function Location() {
  return (
    <section
      id="localizacao"
      className="py-16 md:py-24 lg:py-28 bg-background relative overflow-hidden"
    >
      <div className="container mx-auto px-4 md:px-12 max-w-7xl relative z-10">
        
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-stretch">

          {/* LADO ESQUERDO — IMAGEM DESKTOP */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative hidden lg:flex h-full"
          >
            <div className="relative w-full h-full rounded-[2.5rem] border border-white/10 bg-black/50">
              <ShineBorder
                className="rounded-[2.5rem] z-20"
                shineColor={["#2c123b", "#ffd166"]}
                borderWidth={2}
              />

              <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden z-10">
                <img
                  src={clinicImg}
                  alt="Clínica Taia"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* CARD DE LOCALIZAÇÃO */}
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=Rua+1138+Quadra+250+Lote+01+St+Marista+Goiânia+GO"
              target="_blank"
              rel="noopener noreferrer"
              className="
                absolute
                left-1/2
                -translate-x-1/2
                bottom-0
                translate-y-1/2
                w-[calc(100%-4rem)]
                max-w-[520px]
                glass-card
                p-4
                border-accent/20
                flex
                items-center
                gap-4
                cursor-pointer
                group
                z-30
                backdrop-blur-md
                bg-background/80
                transition-all
                hover:scale-[1.03]
              "
            >
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                <MapPin className="text-accent w-6 h-6" />
              </div>

              <div className="flex-1">
                <p className="text-white text-xs font-bold font-mono uppercase tracking-widest">
                  Localização Privilegiada
                </p>
                <p className="text-white/60 text-[10px] font-sans group-hover:text-white/80 transition-colors">
                  Clínica Taia — Goiânia, GO | St. Marista
                </p>
              </div>

              <div className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 group-hover:bg-accent group-hover:text-black transition-all">
                <ExternalLink className="w-4 h-4" />
              </div>
            </a>
          </motion.div>

          {/* LADO DIREITO — TEXTO */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="flex flex-col justify-center space-y-8"
          >
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-[10px] font-mono tracking-[0.2em] text-accent uppercase">
                Onde Atendo
              </div>

              <h2 className="text-4xl md:text-5xl font-sans font-medium text-white leading-tight">
                Clínica Taia <br />
                <span className="text-accent italic font-normal text-3xl md:text-4xl">
                  Seu espaço de cuidados
                </span>
              </h2>
            </div>

            <div className="space-y-6 text-white/60 font-sans font-light leading-relaxed">
              <p>
                Situada em um ponto estratégico de Goiânia, no Setor Marista, a Clínica
                Taia é um centro de saúde e performance pensado para quem busca cuidado
                completo, integrado e exclusivo.
              </p>

              {/* IMAGEM MOBILE */}
              <div className="relative block lg:hidden my-12">
                <div className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden border border-white/10 p-1 bg-black/50">
                  <ShineBorder
                    className="rounded-[2.5rem] z-20"
                    shineColor={["#2c123b", "#ffd166"]}
                    borderWidth={2}
                  />
                  <div className="absolute inset-1 rounded-[2.3rem] overflow-hidden z-10">
                    <img
                      src={clinicImg}
                      alt="Clínica Taia"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=Rua+1138+Quadra+250+Lote+01+St+Marista+Goiânia+GO"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute -bottom-6 left-4 right-4 glass-card p-4 border-accent/20 flex items-center gap-4 bg-background/80 backdrop-blur-md z-30"
                >
                  <MapPin className="text-accent w-5 h-5" />
                  <p className="text-white text-[10px] font-bold uppercase tracking-widest flex-1">
                    Goiânia, GO - St. Marista
                  </p>
                  <ExternalLink className="w-4 h-4 text-white/40" />
                </a>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 pt-4">
                <div className="space-y-2">
                  <h4 className="text-white font-medium font-serif italic text-lg">
                    Tecnologia & Recovery
                  </h4>
                  <p className="text-xs leading-relaxed">
                    A clínica oferece um cuidado completo de recuperação e performance,
                    com suporte de fisioterapia, pilates, banheira de gelo e muito mais.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-white font-medium font-serif italic text-lg">
                    Alta Performance
                  </h4>
                  <p className="text-xs leading-relaxed">
                    Suporte integral à saúde com acompanhamento médico e estratégias
                    personalizadas de otimização metabólica para resultados seguros.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
