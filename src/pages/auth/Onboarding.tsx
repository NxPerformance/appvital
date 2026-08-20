import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const onboardingSlides = [
  {
    title: 'Treinos que evoluem com você',
    description: 'Registre sua rotina, acompanhe progresso e mantenha constância dentro ou fora da academia.',
    imagePosition: 'left top',
  },
  {
    title: 'Acesso completo ao seu desempenho',
    description: 'Conecte treino, métricas corporais, consultas e conquistas em uma jornada simples de acompanhar.',
    imagePosition: 'right top',
  },
];

const mosaicTiles = [
  'left top',
  'center top',
  'right top',
  'left center',
  'center center',
  'right center',
  'left bottom',
  'center bottom',
  'right bottom',
];

function VitalHeartIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
    >
      <path
        d="M24 38.5S10.5 30 10.5 19.75C10.5 14.25 14.2 11 18.45 11c2.35 0 4.35 1.1 5.55 2.95C25.2 12.1 27.2 11 29.55 11c4.25 0 7.95 3.25 7.95 8.75C37.5 30 24 38.5 24 38.5Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-accent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const showGetStarted = step >= onboardingSlides.length;
  const currentSlide = onboardingSlides[Math.min(step, onboardingSlides.length - 1)];

  if (showGetStarted) {
    return (
      <div className="min-h-[100svh] overflow-y-auto bg-background text-foreground">
        <div className="mx-auto flex min-h-[100svh] w-full max-w-[430px] flex-col px-6 pb-8 lg:grid lg:max-w-none lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:p-10">
          <div className="relative -mx-6 h-[38svh] min-h-[260px] max-h-[340px] overflow-hidden bg-background lg:mx-0 lg:h-auto lg:max-h-none lg:rounded-[2rem] lg:border lg:border-white/10 lg:shadow-elegant">
            <div className="grid h-full grid-cols-3 gap-2 px-2">
              {mosaicTiles.map((position, index) => (
                <div
                  key={`${position}-${index}`}
                  className={cn(
                    'h-32 rounded-xl bg-cover bg-no-repeat shadow-elegant min-[390px]:h-36',
                    index % 3 === 1 ? 'translate-y-10' : index % 3 === 2 ? '-translate-y-5' : '',
                  )}
                  style={{
                    backgroundImage: "url('/images/workout-examples-ai.jpg')",
                    backgroundPosition: position,
                    backgroundSize: '285% auto',
                  }}
                />
              ))}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-b from-background/0 via-background/75 to-background" />
          </div>

          <main className="flex flex-1 flex-col pt-5 text-center lg:justify-center lg:rounded-[2rem] lg:border lg:border-white/5 lg:bg-card/70 lg:px-12 lg:py-10 lg:shadow-elegant">
            <div className="space-y-2">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow lg:h-20 lg:w-20">
                <VitalHeartIcon className="h-9 w-9" />
              </div>
              <h1 className="text-3xl font-bold leading-tight tracking-normal min-[390px]:text-[2rem] lg:text-5xl">
                Bem-vindo ao Vitalissy<span className="text-primary">.</span>
              </h1>
              <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground lg:text-lg">
                Um app para cuidar de treinos, saúde e evolução.
              </p>
            </div>

            <div className="mt-7 grid gap-3 lg:mx-auto lg:w-full lg:max-w-md">
              <Button
                className="h-14 rounded-xl bg-gradient-primary text-base font-bold text-primary-foreground shadow-glow hover:opacity-95"
                onClick={() => navigate('/registro')}
              >
                Criar conta com email
              </Button>
            </div>

            <p className="mt-auto pb-2 pt-8 text-base text-foreground lg:mt-8">
              Já tem conta?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] overflow-hidden bg-background text-white">
      <div className="relative mx-auto min-h-[100svh] w-full max-w-[430px] overflow-hidden lg:max-w-none">
        <div
          className="absolute inset-0 bg-cover bg-no-repeat transition-all duration-500 lg:inset-y-10 lg:left-10 lg:right-[48%] lg:rounded-[2rem] lg:border lg:border-white/10 lg:shadow-elegant"
          style={{
            backgroundImage: "url('/images/workout-examples-ai.jpg')",
            backgroundPosition: currentSlide.imagePosition,
            backgroundSize: '230% auto',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/5 via-background/65 to-background lg:bg-gradient-to-r lg:from-background/5 lg:via-background/55 lg:to-background" />

        <div className="relative flex min-h-[100svh] flex-col px-6 pb-8 pt-10 lg:ml-auto lg:w-[46%] lg:px-10">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2 rounded-full bg-black/20 px-3 py-2 backdrop-blur">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
                <VitalHeartIcon className="h-[18px] w-[18px]" />
              </span>
              <span className="text-sm font-semibold">Vitalissy</span>
            </div>
            <button
              type="button"
              onClick={() => setStep(onboardingSlides.length)}
              className="rounded-full bg-black/20 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur transition-colors hover:text-white"
            >
              Pular
            </button>
          </header>

          <main className="mt-auto text-center lg:mb-auto lg:mt-auto lg:rounded-[2rem] lg:border lg:border-white/5 lg:bg-card/70 lg:p-10 lg:shadow-elegant">
            <div className="space-y-3">
              <h1 className="text-[2rem] font-bold leading-tight tracking-normal lg:text-5xl">{currentSlide.title}</h1>
              <p className="text-base leading-relaxed text-white/68 lg:text-lg">{currentSlide.description}</p>
            </div>

            <div className="mt-7 flex items-center justify-center gap-1">
              {[0, 1, 2].map((item) => (
                <span
                  key={item}
                  className={cn(
                    'h-1.5 rounded-full bg-white transition-all',
                    item === step ? 'w-8 opacity-100' : 'w-1.5 opacity-25',
                  )}
                />
              ))}
            </div>

            <Button
              className="mt-10 h-14 w-full rounded-xl bg-gradient-primary text-base font-bold text-primary-foreground shadow-glow hover:opacity-95"
              onClick={() => setStep((value) => value + 1)}
            >
              {step === onboardingSlides.length - 1 ? 'Começar' : 'Próximo'}
              <ArrowRight className="h-5 w-5" />
            </Button>

            <p className="pb-3 pt-7 text-sm text-white/85">
              Já tem conta?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </main>
        </div>
      </div>
    </div>
  );
}
