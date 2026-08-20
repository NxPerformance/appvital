import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, Crown, Check, CreditCard, QrCode, Sparkles, Star, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';

const benefits = [
  {
    title: 'Estatísticas de Treino',
    description: 'Veja gráficos semanais, mensais e anuais de treinos, calorias, distância e minutos ativos.',
  },
  {
    title: 'Progresso Corporal Avançado',
    description: 'Acompanhe sua evolução com gráficos, histórico detalhado e comparativos.',
  },
  {
    title: 'Monitoramento de Injetáveis',
    description: 'Registre e acompanhe suas aplicações com lembretes inteligentes.',
  },
  {
    title: 'Comunidade Vital Prime',
    description: 'Suporte exclusivo, conteúdos especiais e interação com a equipe Vital.',
  },
  {
    title: 'Desafios Semanais com Selos de Conquista',
    description: 'Participe de desafios e ganhe selos ao completar suas metas.',
  },
  {
    title: 'Alertas Inteligentes',
    description: 'Receba insights automáticos sobre sua evolução e mantenha a consistência.',
  },
  {
    title: 'Suporte Prioritário',
    description: 'Tenha atendimento preferencial e respostas rápidas.',
  },
  {
    title: 'Lives Exclusivas',
    description: 'Acesso a transmissões especiais com especialistas e convidados.',
  },
  {
    title: 'Descontos em Consultas',
    description: 'Economize em consultas online ou presenciais.',
  },
  {
    title: 'Histórico Ilimitado',
    description: 'Acesso total e sem restrições às suas métricas e evoluções.',
  },
];

interface PaymentProduct {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  billing_cycle: string;
}

interface CheckoutResponse {
  checkout: {
    checkout_url: string | null;
    pix_qr_code: string | null;
    pix_copy_paste: string | null;
  };
}

interface CheckoutConfirmResponse {
  order: {
    status: string;
    payments: Array<{ status: string }>;
  };
}

const formatCurrency = (priceCents: number, currency: string) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(priceCents / 100);

function FeatureRow({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Check className="h-3.5 w-3.5" />
      </span>
      <span>{children}</span>
    </li>
  );
}

export default function Premium() {
  const { toast } = useToast();
  const { profile, refetch: refetchProfile } = useProfile();
  const location = useLocation();
  const [product, setProduct] = useState<PaymentProduct | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'checking' | 'paid' | 'processing' | 'failed'>('idle');
  const autoCheckoutTriggeredRef = useRef(false);
  const checkoutConfirmationTriggeredRef = useRef(false);
  const refetchProfileRef = useRef(refetchProfile);
  const registerFlowState = location.state as
    | { autostartCheckout?: boolean; paymentMethod?: 'pix' | 'credit_card'; fromRegister?: boolean }
    | null;
  const isPremiumActive = Boolean(profile?.is_premium);

  useEffect(() => {
    refetchProfileRef.current = refetchProfile;
  }, [refetchProfile]);

  useEffect(() => {
    if (registerFlowState?.paymentMethod) {
      setPaymentMethod(registerFlowState.paymentMethod);
    }
  }, [registerFlowState?.paymentMethod]);

  useEffect(() => {
    const paymentStatus = new URLSearchParams(window.location.search).get('payment');
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const orderId = params.get('order_id');

    if (paymentStatus === 'success') {
      if (checkoutConfirmationTriggeredRef.current) return;
      checkoutConfirmationTriggeredRef.current = true;
      setCheckoutStatus('checking');

      void api
        .post<CheckoutConfirmResponse>('/payments/checkout/confirm', {
          session_id: sessionId || undefined,
          order_id: orderId || undefined,
        })
        .then(async ({ order }) => {
          const paymentStatus = order.payments[0]?.status;
          const paid = order.status === 'paid' || paymentStatus === 'paid';

          if (paid) {
            setCheckoutStatus('paid');
            await refetchProfileRef.current();
            toast({
              title: 'Premium liberado',
              description: 'Pagamento confirmado. Seu acesso Premium já está ativo.',
            });
            return;
          }

          setCheckoutStatus('processing');
          toast({
            title: 'Pagamento em processamento',
            description: 'Assim que o gateway confirmar, seu Premium será liberado automaticamente.',
          });
        })
        .catch((error) => {
          setCheckoutStatus('failed');
          toast({
            title: 'Não foi possível confirmar agora',
            description: error instanceof Error ? error.message : 'O webhook ainda pode liberar seu acesso em alguns instantes.',
            variant: 'destructive',
          });
        });

      return;
    }

    if (paymentStatus === 'pending') {
      setCheckoutStatus('processing');
      toast({
        title: 'Checkout criado',
        description: 'Conecte o gateway escolhido para finalizar pagamentos reais.',
      });
    }

    if (paymentStatus === 'cancelled') {
      setCheckoutStatus('failed');
      toast({
        title: 'Pagamento cancelado',
        description: 'Voce pode tentar novamente quando quiser.',
      });
    }
  }, [toast]);

  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      setIsLoading(true);

      try {
        const response = await api.get<{ products: PaymentProduct[] }>('/payments/products');
        const premiumProduct = response.products.find((item) => item.billing_cycle === 'monthly') ?? response.products[0];

        if (isMounted) {
          setProduct(premiumProduct ?? null);
        }
      } catch (error) {
        if (isMounted) {
          toast({
            title: 'Nao foi possivel carregar o plano',
            description: error instanceof Error ? error.message : 'Tente novamente em instantes.',
            variant: 'destructive',
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [toast]);

  const handleCheckout = useCallback(async () => {
    if (isPremiumActive) {
      toast({
        title: 'Premium ativo',
        description: 'Seu plano já está liberado na Vitalissy.',
      });
      return;
    }

    if (!product) {
      toast({
        title: 'Plano indisponivel',
        description: 'Nenhum plano ativo foi encontrado para compra.',
        variant: 'destructive',
      });
      return;
    }

    setIsCheckoutLoading(true);

    try {
      const response = await api.post<CheckoutResponse>('/payments/checkout', {
        product_id: product.id,
        payment_method: paymentMethod,
      });

      if (response.checkout.checkout_url) {
        window.location.href = response.checkout.checkout_url;
        return;
      }

      toast({
        title: 'Pedido criado',
        description: 'O gateway ainda precisa ser conectado para concluir o pagamento.',
      });
    } catch (error) {
      toast({
        title: 'Nao foi possivel iniciar o pagamento',
        description: error instanceof Error ? error.message : 'Revise os dados e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckoutLoading(false);
    }
  }, [isPremiumActive, paymentMethod, product, toast]);

  useEffect(() => {
    if (isPremiumActive) return;
    if (!registerFlowState?.autostartCheckout) return;
    if (autoCheckoutTriggeredRef.current) return;
    if (isLoading || !product || isCheckoutLoading) return;

    autoCheckoutTriggeredRef.current = true;
    toast({
      title: 'Conta criada',
      description: 'Estamos iniciando seu checkout premium.',
    });
    void handleCheckout();
  }, [handleCheckout, isCheckoutLoading, isLoading, isPremiumActive, product, registerFlowState?.autostartCheckout, toast]);

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background-strong))_100%)]">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 pb-28 pt-4 md:px-7 md:pb-8 md:pt-7">
        <header className="grid h-14 grid-cols-[44px_1fr_44px] items-center md:hidden">
          <Link
            to="/"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/70 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-center text-lg font-bold">Premium</h1>
        </header>

        <section className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-card/90 p-6 text-center shadow-elegant md:p-8">
          <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5">
            <Link
              to="/"
              className="hidden h-11 w-11 self-start items-center justify-center rounded-full bg-secondary/80 text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-primary/15 text-primary shadow-elegant">
              <Crown className="h-8 w-8" />
            </div>
            <div className="space-y-3">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                Vitalissy Premium
              </div>
              <h1 className="text-3xl font-bold leading-tight tracking-normal md:text-5xl">
                {isPremiumActive ? 'Seu Premium está ativo' : 'Desbloqueie sua evolução completa'}
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
                {isPremiumActive
                  ? 'Você já tem acesso aos recursos avançados, relatórios e acompanhamento completo da Vitalissy.'
                  : 'Estatísticas avançadas, conquistas, recursos inteligentes e acompanhamento mais profundo em um só plano.'}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative overflow-hidden rounded-[1.5rem] border border-primary/25 bg-primary p-1 shadow-glow">
            <div className="flex items-center justify-center gap-2 py-2 text-sm font-bold text-primary-foreground">
              <Star className="h-4 w-4 fill-current" />
              {isPremiumActive ? 'Plano ativo' : 'Melhor escolha'}
            </div>
            <div className="rounded-[1.25rem] bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Plano mensal</p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">
                      {isLoading ? '...' : product ? formatCurrency(product.price_cents, product.currency) : 'Indisponível'}
                    </span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isPremiumActive ? 'Recursos liberados para sua conta.' : 'Cancele quando quiser.'}
                  </p>
                </div>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <Crown className="h-6 w-6" />
                </span>
              </div>

              {registerFlowState?.fromRegister && (
                <p className="mt-5 rounded-2xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
                  Sua conta já foi criada. Falta só concluir o pagamento.
                </p>
              )}

              <ul className="mt-6 grid gap-3">
                <FeatureRow>Relatórios e gráficos premium liberados.</FeatureRow>
                <FeatureRow>Histórico completo de evolução, treinos e conquistas.</FeatureRow>
                <FeatureRow>Recursos de acompanhamento avançado no app.</FeatureRow>
              </ul>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/5 bg-card/85 p-5 shadow-elegant">
            <div className="mb-5 flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-xl font-bold">Incluso no Premium</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Um pacote pensado para manter constância e clareza na sua rotina.
                </p>
              </div>
            </div>
            <div className="grid gap-3">
              {benefits.slice(0, 5).map((benefit) => (
                <div key={benefit.title} className="flex items-center gap-3 rounded-2xl bg-secondary/55 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Check className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold">{benefit.title}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {benefits.slice(5).map((benefit) => (
            <div key={benefit.title} className="flex items-start gap-3 rounded-2xl border border-white/5 bg-card/85 p-4 shadow-elegant">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span className="font-semibold">{benefit.title}</span>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{benefit.description}</p>
              </div>
            </div>
          ))}
        </section>

        {isPremiumActive ? (
          <section className="rounded-[2rem] border border-primary/20 bg-primary/10 p-5 text-center shadow-elegant">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-semibold">Tudo certo por aqui</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Seu perfil já está marcado como Premium. Continue usando relatórios, conquistas e histórico completo normalmente.
            </p>
          </section>
        ) : (
          <section className="rounded-[2rem] border border-white/5 bg-card/85 p-5 shadow-elegant">
            {checkoutStatus !== 'idle' ? (
              <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary">
                {checkoutStatus === 'checking'
                  ? 'Confirmando seu pagamento com o gateway...'
                  : checkoutStatus === 'paid'
                    ? 'Pagamento confirmado. Atualizando seu acesso Premium.'
                    : checkoutStatus === 'processing'
                      ? 'Pagamento em processamento. O acesso será liberado após a confirmação.'
                      : 'Não foi possível confirmar o pagamento agora. Você pode tentar novamente.'}
              </div>
            ) : null}

            <div className="mb-4">
              <h3 className="text-xl font-semibold">Forma de pagamento</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                O pagamento será finalizado em ambiente seguro do gateway. Não salvamos dados de cartão.
              </p>
            </div>

            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as 'pix' | 'credit_card')}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              <Label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 p-4 transition-colors hover:bg-secondary/60">
                <RadioGroupItem value="pix" />
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <QrCode className="h-5 w-5" />
                </span>
                <span className="font-semibold">PIX</span>
              </Label>
              <Label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 p-4 transition-colors hover:bg-secondary/60">
                <RadioGroupItem value="credit_card" />
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <CreditCard className="h-5 w-5" />
                </span>
                <span className="font-semibold">Cartão de crédito</span>
              </Label>
            </RadioGroup>
          </section>
        )}

        <Button
          onClick={handleCheckout}
          disabled={isPremiumActive || !product || isLoading || isCheckoutLoading}
          className="h-14 w-full rounded-2xl bg-gradient-primary text-base font-bold text-primary-foreground shadow-glow hover:opacity-95"
        >
          {isPremiumActive ? 'Plano Premium ativo' : isCheckoutLoading ? 'Iniciando pagamento...' : 'Assinar agora'}
        </Button>
      </div>
    </div>
  );
}
