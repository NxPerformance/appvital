import { motion } from "framer-motion";
const doctorImage = "/optimized/bio-doctor.webp";
import { Button } from "@/components/ui/button";
import { ShineBorder } from "@/components/ui/shine-border";

export function Bio() {
  return (
    <section className="py-16 md:py-24 lg:py-28 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-12 max-w-7xl relative z-10">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-12 lg:gap-16 items-stretch lg:items-start">

          {/* ===================== */}
          {/* IMAGE COLUMN */}
          {/* ===================== */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            className="relative w-full flex items-start justify-center lg:justify-start"
          >
            <div className="relative w-full">
              <div className="relative aspect-auto rounded-[2.5rem] overflow-hidden border border-white/10 p-1 bg-black/50">
                <ShineBorder
                  className="rounded-[2.5rem] z-20"
                  shineColor={["#2c123b", "#ffd166"]}
                  borderWidth={2}
                />
                <div className="relative h-full w-full rounded-[2.3rem] overflow-hidden z-10">
                  <img
                    src={doctorImage}
                    alt="Dra. Gabriela Zinhani Issy"
                    width={400}
                    height={600}
                    loading="lazy"
                    className="w-full h-auto object-contain transition-all duration-1000"
                  />
                </div>
              </div>

              {/* CRM CARD */}
              <div
                id="crm-card"
                className="
                  absolute -bottom-6 right-0 md:-right-6
                  glass-card p-6 border-accent/20 z-30
                  w-[90%] md:w-auto
                  mx-auto left-0 md:left-auto
                  text-center md:text-left
                  shadow-lg shadow-accent/5
                  max-md:left-1/2 max-md:-translate-x-1/2
                "
              >
                <p className="text-accent font-serif text-2xl font-bold leading-tight">
                  CRM/GO 33159
                </p>
                <p className="text-accent/60 font-serif text-sm font-medium leading-tight">
                  SP 254121
                </p>
                <p className="text-white/40 text-[10px] uppercase tracking-widest mt-1">
                  Registro Profissional
                </p>
              </div>
            </div>
          </motion.div>

          {/* ===================== */}
          {/* TEXT COLUMN */}
          {/* ===================== */}
          <motion.div
  initial={{ opacity: 0, x: 30 }}
  whileInView={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.8 }}
  viewport={{ once: true }}
  className="flex flex-col justify-start h-full space-y-8 pt-6 lg:pt-10"
>
            {/* HEADER */}
            <div className="space-y-4">
              {/* Eyebrow */}
              <span className="text-accent/80 text-xs font-bold uppercase tracking-[0.3em] block">
                Quem sou eu
              </span>

             {/* Nome (protagonista) */}
<h2 className="text-2xl md:text-4xl font-sans font-medium text-white leading-tight">
  Dra. Gabriela{" "}
  <span className="text-accent italic font-normal">
    Zinhani Issy
  </span>
</h2>

              {/* Linha decorativa */}
              <div className="h-1 w-20 bg-accent" />
            </div>

            {/* TEXTO */}
            <div className="space-y-6 text-white/60 font-sans font-light leading-relaxed">
              <p>
                Médica com foco em Saúde, Estética e Performance. Pós-graduanda em
                Endocrinologia (HIAE) • Nutrologia (USP) • Nutrição Funcional Integrativa.
              </p>

              <p>
                E eu já estive do outro lado. Sei como é se olhar no espelho e não se
                reconhecer. Sei o que é tentar de tudo — dietas, treinos, restrições e o
                mesmo sentimento de frustração.
              </p>

              <p>
                Por muito tempo, vivi esse ciclo. Até entender que não era falta de força
                de vontade: era o meu corpo pedindo equilíbrio. Com acompanhamento,
                ciência e paciência, consegui emagrecer de forma saudável e recuperar
                minha energia, minha autoestima e minha confiança.
              </p>

              <p>
                Foi assim que descobri minha paixão pela Endocrinologia e Nutrologia.
                Hoje, sou médica formada pela Faculdade São Leopoldo Mandic
                (Campinas-SP), pós-graduanda em Endocrinologia (HIAE), Nutrologia (USP)
                e Nutrição Funcional Integrativa.
              </p>

              <p className="text-white/80 font-medium italic">
                Meu propósito é ajudar outras pessoas a viverem essa mesma transformação,
                com ciência, estratégia e cuidado de verdade. Porque eu sei: quando o
                corpo reencontra o equilíbrio, a vida inteira muda.
              </p>
            </div>

            {/* CTA */}
            <div className="pt-6 hidden md:block">
              <a
                href="https://wa.me/5562998549508?text=Ol%C3%A1%2C%20tudo%20bem%3F%20Gostaria%20de%20agendar%20uma%20consulta!"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="xl"
                  className="
                    w-full sm:w-auto relative overflow-hidden rounded-full
                    bg-gradient-to-r from-[#b8860b] via-[#ffd166] to-[#b8860b]
                    bg-[length:200%_auto]
                    text-[#2c123b] font-sans font-bold tracking-widest
                    h-auto py-4 px-8 sm:px-12
                    border border-[#ffd166]/50
                    shadow-[0_0_20px_rgba(255,209,102,0.4)]
                    hover:shadow-[0_0_40px_rgba(255,209,102,0.7)]
                    hover:scale-[1.02]
                    transition-all duration-500 group
                  "
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-shine skew-x-12" />

                  <div className="flex items-center justify-center gap-3 relative z-10">
                    <span className="tracking-widest text-sm font-bold">
                      AGENDAR CONSULTA AGORA!
                    </span>
                  </div>
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}