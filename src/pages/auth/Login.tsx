import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { BarChart3, Dumbbell, Eye, EyeOff, Heart, Lock, Mail, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn } = useAuth();
  const { toast } = useToast();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email.trim(), password);
      navigate('/');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Ocorreu um erro inesperado.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#1c0a26] p-10 lg:flex">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{ backgroundImage: "url('/images/workout-examples-ai.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/15 via-background/70 to-background" />
        <div className="relative z-10 flex w-full flex-col justify-between rounded-[2rem] border border-white/10 bg-background/35 p-8 shadow-elegant backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
              <Heart className="h-7 w-7" />
            </span>
            <span className="text-3xl font-bold">Vitalissy</span>
          </div>

          <div className="max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-2 text-sm font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" />
              Saúde, treino e evolução
            </div>
            <h1 className="text-5xl font-bold leading-tight tracking-normal">
              Entre e continue sua rotina de performance.
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Acesse treinos, métricas, consultas, Premium e notificações em uma experiência otimizada para desktop.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Dumbbell, label: 'Treinos' },
              { icon: BarChart3, label: 'Progresso' },
              { icon: Heart, label: 'Saúde' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-card/60 p-4">
                <item.icon className="mb-3 h-5 w-5 text-primary" />
                <p className="font-semibold">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-6 pb-7 pt-10 lg:max-w-[520px] lg:justify-center lg:px-10 lg:pt-7">
        <header className="flex h-14 items-center justify-between">
          <Link
            to="/onboarding"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Voltar"
          >
            <X className="h-5 w-5" />
          </Link>

          <div className="flex items-center gap-2 rounded-full border border-white/5 bg-card/80 px-3 py-2 shadow-elegant">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
              <Heart className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold">Vitalissy</span>
          </div>
        </header>

        <main className="flex flex-1 flex-col pt-12 lg:flex-none lg:rounded-[2rem] lg:border lg:border-white/5 lg:bg-card/70 lg:p-8 lg:shadow-elegant">
          <div className="space-y-2">
            <h1 className="text-[2rem] font-bold leading-tight tracking-normal">Entrar</h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Acesse sua rotina de saúde e performance.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-7 space-y-6">
            <div className="grid gap-3">
              <div className="relative">
                <Label htmlFor="email" className="sr-only">
                  Email
                </Label>
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-14 rounded-xl border-white/5 bg-secondary/70 pl-12 pr-4 text-base placeholder:text-muted-foreground focus-visible:ring-offset-0"
                />
              </div>

              <div className="relative">
                <Label htmlFor="password" className="sr-only">
                  Senha
                </Label>
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-14 rounded-xl border-white/5 bg-secondary/70 pl-12 pr-12 text-base placeholder:text-muted-foreground focus-visible:ring-offset-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="h-14 w-full rounded-xl bg-gradient-primary text-base font-bold text-primary-foreground shadow-glow hover:opacity-95"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <button
            type="button"
            onClick={() =>
              toast({
                title: 'Recuperação de senha em breve',
                description: 'Por enquanto, fale com o suporte para redefinir seu acesso.',
              })
            }
            className="mt-7 block text-center text-base font-semibold text-primary transition-colors hover:text-primary/85"
          >
            Esqueci minha senha
          </button>

          <div className="mt-auto space-y-3 pb-3 pt-12 text-center">
            <p className="text-xs leading-relaxed text-muted-foreground/75">
              Saúde & Performance<br />
              Dra. Gabriela Zinhani Issy<br />
              CRM GO 33159 / SP 254121
            </p>
            <p className="text-base text-foreground">
              Não tem conta?{' '}
              <Link to="/registro" className="font-semibold text-primary hover:underline">
                Criar conta
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
