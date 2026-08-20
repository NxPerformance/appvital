import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ShineBorder } from "@/components/ui/shine-border";
const doctorImage = "/optimized/hero-doctor.webp";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background pt-32 pb-24 lg:pt-48 lg:pb-32">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-6xl bg-[radial-gradient(circle_at_50%_0%,rgba(120,80,255,0.15)_0%,transparent_50%)] pointer-events-none" />
      
      <div className="container mx-auto px-4 md:px-12 max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col space-y-8 text-center lg:text-left items-center lg:items-start"
          >
            <h1 className="font-sans text-5xl font-medium leading-[1.1] tracking-tight text-white sm:text-7xl gradient-text">
              Sua melhor versão <span className="text-accent italic">começa agora</span>
            </h1>
            
            <p className="max-w-xl text-lg text-white/50 md:text-xl font-sans font-light leading-relaxed">
              Se você está buscando mais energia, equilíbrio, melhora na composição corporal e resultados que realmente duram, eu posso te ajudar.
              Através de um método estruturado, baseado em ciência, exames e acompanhamento próximo, desenvolvo um plano que se adapta à sua rotina.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <a
                href="https://wa.me/5562998549508?text=Ol%C3%A1%2C%20tudo%20bem%3F%20Gostaria%20de%20agendar%20uma%20consulta!"
                target="_blank"
                rel="noopener noreferrer"
              >
                {/* BOTÃO PREMIUM REESTILIZADO */}
                <Button 
                  size="xl" 
                  className="relative overflow-hidden rounded-full 
                  bg-gradient-to-r from-[#b8860b] via-[#ffd166] to-[#b8860b] bg-[length:200%_auto]
                  text-[#2c123b] font-sans font-bold tracking-widest
                  px-8 sm:px-12 h-14 sm:h-16
                  border border-[#ffd166]/50 
                  shadow-[0_0_20px_rgba(255,209,102,0.4)] 
                  hover:shadow-[0_0_40px_rgba(255,209,102,0.7)] hover:scale-[1.02] 
                  transition-all duration-500 group"
                >
                  {/* Efeito de Luz Passando (Idêntico ao conceito do Vital Method) */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-shine skew-x-12" />
                  
                  <div className="flex items-center gap-3 relative z-10">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.536 0 1.52 1.115 2.988 1.264 3.186.149.198 2.19 3.361 5.27 4.693 2.197.912 3.057.767 3.604.708.618-.066 1.76-.718 2.008-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.381a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.815 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    <span className="text-xs sm:text-sm font-bold">AGENDAR CONSULTA</span>
                  </div>
                </Button>
              </a>
            </div>
          </motion.div>

          {/* FOTO DA DOUTORA - Fundo limpo (sem mancha amarela) */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative lg:ml-auto group"
          >
            <div className="relative aspect-[4/5] w-full max-w-[500px] overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/50 p-1 mx-auto">
               <ShineBorder
                 className="rounded-[2.5rem] z-20"
                 shineColor={["#2c123b", "#ffd166"]}
                 borderWidth={2}
               />
               <div className="h-full w-full rounded-[2.3rem] overflow-hidden relative z-10">
                 <img
                   src={doctorImage}
                   alt="Dra. Gabriela"
                   width={600}
                   height={750}
                   fetchPriority="high"
                   className="h-full w-full object-cover opacity-90 transition-all duration-1000"
                 />
               </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}