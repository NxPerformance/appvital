import { motion } from "framer-motion";
import { Zap, Activity, Microscope, Target } from "lucide-react";

export function Services() {
  const services = [
    {
      title: "Performance",
      desc: "Otimização de vias metabólicas para atletas.",
      icon: Zap
    },
    {
      title: "Hormônios",
      desc: "Modulação precisa e segura.",
      icon: Activity
    },
    {
      title: "Genética",
      desc: "Protocolos baseados no seu DNA.",
      icon: Microscope
    },
    {
      title: "Foco",
      desc: "Suporte neuro-endócrino avançado.",
      icon: Target
    }
  ];

  return (
    <section className="py-16 md:py-24 lg:py-28 bg-background border-t border-white/5">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="glass-card p-10 flex flex-col items-center text-center space-y-6 group hover:bg-white/5 transition-colors cursor-pointer glow-border"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                <s.icon className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-medium text-white">{s.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
