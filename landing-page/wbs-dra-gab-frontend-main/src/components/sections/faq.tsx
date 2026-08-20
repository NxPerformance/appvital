import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    question: "Bioimpedância realmente faz diferença no tratamento?",
    answer: "Sim. A bioimpedância avalia como o corpo distribui gordura, músculo e água, permitindo ajustes muito mais precisos no tratamento. Além disso, a nossa balança também analisa risco postural, trazendo uma visão mais completa do corpo e ajudando a direcionar estratégias ainda mais eficazes e seguras."
  },
  {
    question: "Por que preciso fazer tantos exames antes de iniciar?",
    answer: "O tratamento precisa ser seguro e totalmente personalizado. Os exames mostram como está seu metabolismo, seus hormônios, níveis de vitaminas, riscos cardiovasculares e também ajudam a identificar precocemente possíveis alterações ou doenças, muitas vezes antes mesmo de surgirem sintomas. Eles revelam como seu corpo está funcionando por dentro. Assim, o protocolo é feito para você, com base em dados reais."
  },
  {
    question: "Hormônio engorda ou ajuda a emagrecer?",
    answer: "Depende do hormônio, da dose e da indicação correta. Hormônios fazem parte do tratamento de diversas condições e, quando usados de forma adequada, ajudam a restabelecer o equilíbrio do organismo, melhorar o metabolismo, preservar massa muscular e até facilitar o emagrecimento. Quando mal indicados ou sem acompanhamento, podem desregular o corpo. Por isso, avaliação e seguimento médico fazem toda a diferença."
  },
  {
    question: "Qual a diferença entre GLP-1, GIP e Glucagon?",
    answer: "São hormônios que atuam no controle do apetite, glicose e metabolismo. Cada um age por vias diferentes, e as novas medicações combinam esses mecanismos para potencializar resultados. A indicação ideal depende do perfil metabólico e dos objetivos de cada paciente."
  },
  {
    question: "Em quanto tempo vou começar a ver resultado?",
    answer: "Os primeiros sinais costumam aparecer nas primeiras semanas, com redução de inchaço, melhora do contorno corporal e mais disposição. Resultados mais visíveis e consistentes surgem com a continuidade do tratamento, ajustes personalizados e acompanhamento adequado. Cada corpo responde de um jeito, por isso o plano é sempre individual."
  }
];

export function FAQ() {
  return (
    <section className="py-16 md:py-24 lg:py-28 bg-background relative overflow-hidden border-t border-white/5">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,209,102,0.03),transparent_40%)]" />
      
      <div className="container mx-auto px-4 md:px-12 max-w-7xl relative z-10">
        <div className="grid gap-12 lg:gap-16 lg:grid-cols-2 lg:items-start">
          
          {/* Header & Contact */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <span className="text-accent text-[10px] font-bold uppercase tracking-[0.2em]">Dúvidas Comuns</span>
              <h2 className="font-sans text-4xl md:text-5xl font-medium text-white leading-tight">
                Perguntas <br />
                <span className="text-accent italic">Frequentes</span>
              </h2>
              <div className="h-1 w-20 bg-accent" />
            </div>
            
            <p className="text-white/60 text-lg font-light leading-relaxed">
              Entenda melhor como funciona o nosso protocolo e tire suas dúvidas sobre os tratamentos.
            </p>
            
             <div className="glass-card p-8 border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-3xl rounded-full group-hover:bg-accent/20 transition-colors" />
                
                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-accent" />
                  Ainda tem dúvidas?
                </h3>
                
                <div className="space-y-4">
                  <p className="text-white/40 text-xs font-sans uppercase tracking-widest">Fale conosco no WhatsApp</p>
                  <a 
                    href="https://wa.me/5562998549508?text=Ol%C3%A1%2C%20tudo%20bem%3F%20Gostaria%20de%20tirar%20uma%20duvida!" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <p className="text-2xl md:text-3xl font-sans font-medium text-white hover:text-accent transition-colors">
                      (62) 99854-9508
                    </p>
                  </a>
                  <a 
                    href="https://wa.me/5562998549508?text=Ol%C3%A1%2C%20tudo%20bem%3F%20Gostaria%20de%20tirar%20uma%20duvida!" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <Button variant="link" className="text-accent p-0 h-auto font-bold uppercase tracking-widest text-xs hover:text-white transition-colors">
                      Iniciar conversa &rarr;
                    </Button>
                  </a>
                </div>
             </div>
          </motion.div>

          {/* Accordion */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="w-full pt-2"
          >
            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqs.map((faq, index) => (
                <AccordionItem 
                    key={index} 
                    value={`item-${index}`} 
                    className="border border-white/5 rounded-2xl bg-white/[0.02] px-6 data-[state=open]:bg-white/[0.04] data-[state=open]:border-accent/20 transition-all duration-300"
                >
                  <AccordionTrigger className="text-white hover:text-accent hover:no-underline py-6 font-sans font-medium text-left text-base md:text-lg">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/60 text-base pb-6 font-light leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
