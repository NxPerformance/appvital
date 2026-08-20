import { Hero } from "@/components/sections/hero";
import { Bio } from "@/components/sections/bio";
import { VitalMethod } from "@/components/sections/vital-method";
import { PerformanceSection } from "@/components/sections/performance";
import { BioimpedanceSection } from "@/components/sections/bioimpedance";
import { Testimonials } from "@/components/sections/testimonials";
import { CaseStudies } from "@/components/sections/case-studies";
import { Location } from "@/components/sections/location";
import { FAQ } from "@/components/sections/faq";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { ShineBorder } from "@/components/ui/shine-border";

const logo = "/optimized/logogziamarela.webp";

export default function LandingPage() {
  const navLinks = [
    { href: "#metodo-vital", label: "VITAL" },
    { href: "#performance", label: "Performance" },
    { href: "#bioimpedancia", label: "Tecnologia" },
    { href: "#localizacao", label: "Localização" },
  ];

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-accent selection:text-accent-foreground text-foreground antialiased overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-7xl px-4">
        <div className="glass-card h-16 w-full px-4 sm:px-8 flex items-center justify-between border-white/10 rounded-full bg-[#2c123b]/40 backdrop-blur-lg border border-white/10 shadow-2xl">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              onClick={() =>
                window.scrollTo({ top: 0, behavior: "smooth" })
              }
              className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center group cursor-pointer transition-transform active:scale-95"
            >
              <ShineBorder
                className="absolute inset-0 w-full h-full rounded-full"
                borderWidth={2}
                duration={10}
                shineColor={["#2c123b", "#ffd166"]}
              >
                <div className="w-full h-full rounded-full bg-transparent" />
              </ShineBorder>

              <img
                src={logo}
                alt="Logo Dra. Gabriela Zinhani"
                className="relative z-30 w-7 h-7 sm:w-9 sm:h-9 object-contain brightness-110"
              />
            </div>

            <span className="text-white font-medium uppercase tracking-widest text-[10px] sm:text-xs leading-none">
              Dra. Gabriela Zinhani Issy
            </span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex gap-10 items-center">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="group relative text-[11px] font-sans font-medium uppercase tracking-[0.2em] text-white/70 hover:text-white transition-colors"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#ffd166] transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>

          {/* Mobile menu */}
          <div className="flex md:hidden items-center gap-2 sm:gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/5 rounded-full"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="bg-background/95 backdrop-blur-xl border-l border-white/10 w-[300px] sm:max-w-sm p-8"
              >
                <SheetHeader>
                  <SheetTitle className="text-left text-accent font-sans uppercase tracking-[0.2em] text-xs mb-8 border-b border-white/10 pb-4">
                    Navegação
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6">
                  {navLinks.map((link) => (
                    <SheetClose asChild key={link.label}>
                      <a
                        href={link.href}
                        className="text-xl font-sans font-light text-white hover:text-accent transition-all duration-300 flex items-center justify-between group"
                      >
                        {link.label}
                        <span className="h-px w-0 bg-accent group-hover:w-4 transition-all duration-300" />
                      </a>
                    </SheetClose>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <main>
        <Hero />
        <VitalMethod />
        <PerformanceSection />
        <BioimpedanceSection />
        <CaseStudies />
        <Testimonials />
        <Location />
        <Bio />
        <FAQ />
      </main>

      {/* Footer */}
      <footer className="bg-background pt-16 pb-8 relative overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="mt-8 pt-4 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-sans uppercase tracking-[0.2em] text-white/20">
            <div className="flex flex-col gap-2 md:text-left text-center">
              <p>
                &copy; {new Date().getFullYear()} Dra. Gabriela Zinhani Issy —
                Clínica Vitalissy
              </p>

              {/* Desktop */}
              <a
                href="https://nxperformance.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:block hover:text-white/40 transition-colors"
              >
                Desenvolvido por Nx Performance
              </a>
            </div>

            {/* Mobile */}
            <a
              href="https://nxperformance.com"
              target="_blank"
              rel="noopener noreferrer"
              className="md:hidden hover:text-white/40 transition-colors"
            >
              Desenvolvido por Nx Performance
            </a>

            <div className="flex gap-8">
              <a href="#" className="hover:text-white transition-colors">
                Privacidade
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Termos
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
