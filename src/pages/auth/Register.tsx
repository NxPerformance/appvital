import { useEffect, useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, CheckCircle2, Eye, EyeOff, Heart, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const acceptedProofTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxProofFileSize = 5 * 1024 * 1024;
const minPhoneDigits = 10;
const maxPhoneDigits = 11;
const validBrazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

function isValidCref(cref: string, state: string) {
  const normalizedCref = cref.trim().toUpperCase().replace(/\s+/g, '');
  const normalizedState = state.trim().toUpperCase();
  const match = normalizedCref.match(/^(\d{4,6})(?:-?[GP])?(?:\/([A-Z]{2}))?$/);

  return Boolean(
    match &&
      validBrazilianStates.includes(normalizedState) &&
      (!match[1] || !match[2] || match[2] === normalizedState),
  );
}

function validateProofFile(file: File | null) {
  return Boolean(file && acceptedProofTypes.includes(file.type) && file.size <= maxProofFileSize);
}

export default function Register() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    age: '',
    height_cm: '',
    weight_kg: '',
    password: '',
    confirmPassword: '',
    cref: '',
    cref_state: '',
    specialties: '',
    experience_years: '',
    instagram_handle: '',
    proof_notes: '',
  });
  const [accountType, setAccountType] = useState<'client' | 'personal'>('client');
  const [selectedPlan, setSelectedPlan] = useState<'essential' | 'premium'>('premium');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selfPhoto, setSelfPhoto] = useState<File | null>(null);
  const [documentPhoto, setDocumentPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading, register } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    document.documentElement.classList.add('auth-scroll-page');
    document.body.classList.add('auth-scroll-page');

    return () => {
      document.documentElement.classList.remove('auth-scroll-page');
      document.body.classList.remove('auth-scroll-page');
    };
  }, []);

  if (authLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-accent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleNumericInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string,
    maxValue?: number
  ) => {
    const numbersOnly = e.target.value.replace(/\D/g, '');
    let value = numbersOnly;

    if (maxValue && numbersOnly !== '') {
      const numValue = parseInt(numbersOnly, 10);
      value = Math.min(numValue, maxValue).toString();
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleWeightInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^0-9,]/g, '');
    const parts = sanitized.split(',');
    const formatted = parts.length > 2 ? parts[0] + ',' + parts.slice(1).join('') : sanitized;
    setFormData((prev) => ({ ...prev, weight_kg: formatted }));
  };

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, maxPhoneDigits);
    setFormData((prev) => ({ ...prev, phone: digitsOnly }));
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({ variant: 'destructive', title: 'Email inválido' });
      return false;
    }
    if (formData.password.length < 6) {
      toast({ variant: 'destructive', title: 'Senha deve ter pelo menos 6 caracteres' });
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({ variant: 'destructive', title: 'As senhas não coincidem' });
      return false;
    }
    if (!termsAccepted) {
      toast({ variant: 'destructive', title: 'Aceite os Termos de Uso para continuar' });
      return false;
    }
    if (
      formData.phone &&
      (formData.phone.length < minPhoneDigits || formData.phone.length > maxPhoneDigits)
    ) {
      toast({ variant: 'destructive', title: 'Telefone deve ter 10 ou 11 números com DDD' });
      return false;
    }
    if (accountType === 'personal') {
      if (!formData.cref.trim() || !formData.cref_state.trim()) {
        toast({ variant: 'destructive', title: 'Informe CREF e UF para solicitar acesso de personal' });
        return false;
      }
      if (!isValidCref(formData.cref, formData.cref_state)) {
        toast({ variant: 'destructive', title: 'Informe um CREF válido com UF correspondente' });
        return false;
      }
      if (!validateProofFile(selfPhoto)) {
        toast({ variant: 'destructive', title: 'Envie uma foto sua em JPG, PNG ou WebP até 5MB' });
        return false;
      }
      if (!validateProofFile(documentPhoto)) {
        toast({ variant: 'destructive', title: 'Envie uma foto do documento em JPG, PNG ou WebP até 5MB' });
        return false;
      }
      if (!formData.proof_notes.trim()) {
        toast({ variant: 'destructive', title: 'Explique sua comprovação profissional' });
        return false;
      }
    }
    if (Number(formData.age) <= 0) {
      toast({ variant: 'destructive', title: 'Idade inválida' });
      return false;
    }
    if (Number(formData.height_cm) <= 0) {
      toast({ variant: 'destructive', title: 'Altura inválida' });
      return false;
    }
    const weightValue = parseFloat(formData.weight_kg.replace(',', '.'));
    if (isNaN(weightValue) || weightValue <= 0) {
      toast({ variant: 'destructive', title: 'Peso inválido' });
      return false;
    }
    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      const weightValue = parseFloat(formData.weight_kg.replace(',', '.'));
      const trainerApplication =
        accountType === 'personal'
          ? {
              cref: formData.cref.trim(),
              cref_state: formData.cref_state.trim().toUpperCase(),
              specialties: formData.specialties.trim() || null,
              experience_years: formData.experience_years ? Number(formData.experience_years) : null,
              instagram_handle: formData.instagram_handle.trim() || null,
              proof_notes: formData.proof_notes.trim() || null,
            }
          : undefined;

      if (accountType === 'personal') {
        const payload = new FormData();
        payload.append('full_name', formData.full_name.trim());
        payload.append('email', formData.email.trim());
        payload.append('phone', formData.phone.trim() || '');
        payload.append('age', String(Number(formData.age)));
        payload.append('height_cm', String(Number(formData.height_cm)));
        payload.append('weight_kg', String(weightValue));
        payload.append('password', formData.password);
        payload.append('terms_accepted', String(termsAccepted));
        payload.append('account_type', accountType);
        payload.append('selected_plan', selectedPlan);
        if (selectedPlan === 'premium') {
          payload.append('initial_payment_method', paymentMethod);
        }
        payload.append('trainer_application', JSON.stringify(trainerApplication));
        payload.append('self_photo', selfPhoto!);
        payload.append('document_photo', documentPhoto!);
        await register(payload);
      } else {
        await register({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        age: Number(formData.age),
        height_cm: Number(formData.height_cm),
        weight_kg: weightValue,
        password: formData.password,
        terms_accepted: termsAccepted,
        account_type: accountType,
        selected_plan: selectedPlan,
        initial_payment_method: selectedPlan === 'premium' ? paymentMethod : null,
        trainer_application: trainerApplication,
        });
      }

      toast({
        title: accountType === 'personal' ? 'Solicitação enviada!' : 'Conta criada com sucesso!',
        description:
          accountType === 'personal'
            ? 'Seu cadastro de personal ficou pendente de aprovação pela administração.'
            : selectedPlan === 'premium'
              ? 'Agora vamos finalizar seu acesso premium.'
              : 'Bem-vindo(a)!',
      });

      navigate(
        accountType === 'personal' ? '/' : selectedPlan === 'premium' ? '/premium' : '/',
        accountType === 'personal'
          ? undefined
          : selectedPlan === 'premium'
            ? {
                state: {
                  autostartCheckout: true,
                  paymentMethod,
                  fromRegister: true,
                },
              }
            : undefined,
      );
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
    <div className="min-h-[100svh] bg-background px-6 pb-[calc(env(safe-area-inset-bottom,0px)+8rem)] pt-[calc(env(safe-area-inset-top,0px)+1rem)] text-foreground lg:px-10 lg:pb-8 lg:pt-8">
      <div className="mx-auto grid w-full max-w-[430px] gap-8 pb-16 lg:max-w-[1180px] lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <aside className="sticky top-8 hidden min-h-[calc(100svh-4rem)] overflow-hidden rounded-[2rem] border border-white/10 bg-card/70 p-8 shadow-elegant lg:flex lg:flex-col lg:justify-between">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: "url('/images/workout-examples-ai.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/75 to-background" />
          <div className="relative space-y-8">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
                <Heart className="h-7 w-7" />
              </span>
              <span className="text-3xl font-bold">Vitalissy</span>
            </div>
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-2 text-sm font-semibold text-primary">
                <Sparkles className="h-4 w-4" />
                Cadastro completo
              </div>
              <h1 className="text-5xl font-bold leading-tight tracking-normal">
                Crie sua conta com conforto no desktop.
              </h1>
              <p className="text-lg leading-relaxed text-muted-foreground">
                Preencha seus dados, escolha o tipo de acesso e siga para o plano ideal sem ficar preso ao formato mobile.
              </p>
            </div>
          </div>
          <div className="relative grid gap-3">
            {[
              { icon: CheckCircle2, label: 'Cadastro real via API' },
              { icon: BarChart3, label: 'Premium conectado ao checkout' },
              { icon: ShieldCheck, label: 'Personal com validação' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-background/45 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="font-semibold">{item.label}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-6 lg:rounded-[2rem] lg:border lg:border-white/5 lg:bg-card/70 lg:p-8 lg:shadow-elegant">
        <div className="sticky top-0 z-30 -mx-6 grid h-14 grid-cols-[44px_1fr_44px] items-center border-b border-white/5 bg-background/90 px-6 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
          <Link
            to="/onboarding"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-center text-base font-bold">Criar conta</h1>
          <span />
        </div>

        <div className="space-y-2 pt-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
            <Heart className="h-7 w-7" />
          </div>
          <h2 className="text-[2rem] font-bold leading-tight tracking-normal">Comece no Vitalissy</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Crie seu acesso para registrar treinos e acompanhar sua evolução.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome completo</Label>
            <Input
              id="full_name"
              name="full_name"
              placeholder="Seu nome"
              value={formData.full_name}
              onChange={handleChange}
              required
              className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={handleChange}
              required
              className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
            />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              name="phone"
              type="text"
              inputMode="numeric"
              maxLength={maxPhoneDigits}
              placeholder="62981710000"
              value={formData.phone}
              onChange={handlePhoneInput}
              className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 lg:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="age">Idade</Label>
              <Input
                id="age"
                name="age"
                type="text"
                inputMode="numeric"
                maxLength={3}
                placeholder="25"
                value={formData.age}
                onChange={(e) => handleNumericInput(e, 'age', 150)}
                required
                className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height_cm">Altura (cm)</Label>
              <Input
                id="height_cm"
                name="height_cm"
                type="text"
                inputMode="numeric"
                maxLength={3}
                placeholder="170"
                value={formData.height_cm}
                onChange={(e) => handleNumericInput(e, 'height_cm', 300)}
                required
                className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight_kg">Peso (kg)</Label>
              <Input
                id="weight_kg"
                name="weight_kg"
                type="text"
                inputMode="decimal"
                maxLength={6}
                placeholder="70,5"
                value={formData.weight_kg}
                onChange={handleWeightInput}
                required
                className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="h-14 rounded-xl border-white/5 bg-secondary/70 pr-10 text-base focus-visible:ring-offset-0"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
            />
          </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/5 bg-card/70 p-4 shadow-elegant">
            <div>
              <h2 className="font-semibold">Tipo de cadastro</h2>
              <p className="text-sm text-muted-foreground">
                Escolha se você está entrando como cliente ou solicitando acesso como personal trainer.
              </p>
            </div>

            <RadioGroup
              value={accountType}
              onValueChange={(value) => setAccountType(value as 'client' | 'personal')}
              className="gap-3"
            >
              <Label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-4 transition-colors hover:bg-secondary/50">
                <RadioGroupItem value="client" className="mt-1" />
                <div>
                  <p className="font-medium">Sou aluno / cliente</p>
                  <p className="text-sm text-muted-foreground">
                    Fluxo normal de cadastro com opção de plano Essencial ou Premium.
                  </p>
                </div>
              </Label>

              <Label className="flex cursor-pointer items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10">
                <RadioGroupItem value="personal" className="mt-1" />
                <div>
                  <p className="font-medium">Sou personal trainer</p>
                  <p className="text-sm text-muted-foreground">
                    O acesso do personal é gratuito após aprovação, para trazer e acompanhar alunos.
                  </p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {accountType === 'client' ? (
            <div className="space-y-3 rounded-2xl border border-white/5 bg-card/70 p-4 shadow-elegant">
              <div>
                <h2 className="font-semibold">Escolha seu plano ao criar a conta</h2>
                <p className="text-sm text-muted-foreground">
                  Você pode usar o caderno de treinos gratuito ou seguir direto para as estatísticas Premium.
                </p>
              </div>

              <RadioGroup
                value={selectedPlan}
                onValueChange={(value) => setSelectedPlan(value as 'essential' | 'premium')}
                className="gap-3"
              >
                <Label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-4 transition-colors hover:bg-secondary/50">
                  <RadioGroupItem value="essential" className="mt-1" />
                  <div>
                    <p className="font-medium">Caderno de treinos gratuito</p>
                    <p className="text-sm text-muted-foreground">Cria a conta sem cobrança para registrar e consultar seus treinos.</p>
                  </div>
                </Label>

                <Label className="flex cursor-pointer items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10">
                  <RadioGroupItem value="premium" className="mt-1" />
                  <div>
                    <p className="font-medium">Quero ser Premium agora</p>
                    <p className="text-sm text-muted-foreground">
                      A conta é criada e você segue direto para finalizar o pagamento das estatísticas.
                    </p>
                  </div>
                </Label>
              </RadioGroup>

              {selectedPlan === 'premium' && (
                <div className="space-y-3 rounded-xl border border-white/10 bg-background/30 p-3">
                  <p className="text-sm font-medium">Forma de pagamento inicial</p>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(value) => setPaymentMethod(value as 'pix' | 'credit_card')}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    <Label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 p-3 transition-colors hover:bg-secondary/50">
                      <RadioGroupItem value="pix" />
                      <span className="text-sm">PIX</span>
                    </Label>
                    <Label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 p-3 transition-colors hover:bg-secondary/50">
                      <RadioGroupItem value="credit_card" />
                      <span className="text-sm">Cartão de crédito</span>
                    </Label>
                  </RadioGroup>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-elegant">
              <div>
                <h2 className="font-semibold">Validação de personal trainer</h2>
                <p className="text-sm text-muted-foreground">
                  Seu cadastro ficará pendente até validação dos dados. Depois da aprovação, o acesso premium do personal será liberado gratuitamente.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="cref">CREF</Label>
                  <Input
                    id="cref"
                    name="cref"
                    value={formData.cref}
                    onChange={handleChange}
                    placeholder="Ex.: 123456-G"
                    className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cref_state">UF</Label>
                  <Input
                    id="cref_state"
                    name="cref_state"
                    value={formData.cref_state}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cref_state: e.target.value.toUpperCase().slice(0, 2) }))}
                    placeholder="SP"
                    className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="specialties">Especialidades</Label>
                  <Input
                    id="specialties"
                    name="specialties"
                    value={formData.specialties}
                    onChange={handleChange}
                    placeholder="Ex.: hipertrofia, emagrecimento"
                    className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience_years">Anos de experiência</Label>
                  <Input
                    id="experience_years"
                    name="experience_years"
                    type="text"
                    inputMode="numeric"
                    value={formData.experience_years}
                    onChange={(e) => handleNumericInput(e, 'experience_years', 80)}
                    placeholder="5"
                    className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram_handle">Instagram profissional</Label>
                <Input
                  id="instagram_handle"
                  name="instagram_handle"
                  value={formData.instagram_handle}
                  onChange={handleChange}
                  placeholder="@seuusuario"
                  className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proof_notes">Comprovação e apresentação</Label>
                <Input
                  id="proof_notes"
                  name="proof_notes"
                  value={formData.proof_notes}
                  onChange={handleChange}
                  placeholder="Explique sua atuação, nicho e dados para validação"
                  className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="self_photo">Foto sua</Label>
                  <Input
                    id="self_photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => setSelfPhoto(event.target.files?.[0] ?? null)}
                    className="h-14 rounded-xl border-white/5 bg-secondary/70 text-sm focus-visible:ring-offset-0"
                  />
                  <p className="text-xs text-muted-foreground">Rosto visível, JPG/PNG/WebP até 5MB.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="document_photo">Foto do documento</Label>
                  <Input
                    id="document_photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => setDocumentPhoto(event.target.files?.[0] ?? null)}
                    className="h-14 rounded-xl border-white/5 bg-secondary/70 text-sm focus-visible:ring-offset-0"
                  />
                  <p className="text-xs text-muted-foreground">Documento/CREF legível, JPG/PNG/WebP até 5MB.</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-card/70 p-4 shadow-elegant">
            <Checkbox
              id="termsAccepted"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              className="mt-1"
            />
            <Label htmlFor="termsAccepted" className="cursor-pointer text-sm leading-relaxed text-muted-foreground">
              Li e aceito os{' '}
              <Link to="/termos-de-uso" target="_blank" className="font-medium text-primary hover:underline">
                Termos de Uso
              </Link>{' '}
              da Vitalissy.
            </Label>
          </div>

          <Button
            type="submit"
            className="h-14 w-full rounded-xl bg-gradient-primary text-base font-bold text-primary-foreground shadow-glow hover:opacity-95"
            disabled={loading}
          >
            {loading
              ? 'Criando...'
              : accountType === 'personal'
                ? 'Enviar cadastro para aprovação'
                : selectedPlan === 'premium'
                  ? 'Criar conta e ir para o pagamento'
                  : 'Criar conta'}
          </Button>
        </form>

        <p className="text-center text-base text-foreground">
          Já tem conta?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Entrar
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
}
