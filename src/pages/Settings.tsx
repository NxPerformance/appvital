import { useState, useEffect, useRef } from 'react';
import type { ElementType } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Check,
  Edit,
  LogOut,
  Mail,
  MessageCircle,
  Moon,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Watch,
  X,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useBioimpedance } from '@/hooks/useBioimpedance';
import { useTheme, type AppTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { handleIntegerKeyDown, handleDecimalKeyDown, sanitizeInteger, sanitizeDecimal } from '@/lib/inputValidation';

type NotificationPreference = {
  key: 'updates' | 'reminders' | 'account' | 'wearables' | 'email' | 'whatsapp';
  label: string;
  description: string;
  icon: ElementType;
};

const themeOptions: Array<{ value: AppTheme; label: string; description: string; icon: ElementType }> = [
  { value: 'roxo', label: 'Roxo', description: 'Visual clássico da Vitalissy', icon: Sparkles },
  { value: 'preto', label: 'Preto', description: 'Fundo escuro, destaque roxo', icon: Moon },
];

const notificationPreferences: NotificationPreference[] = [
  { key: 'updates', label: 'Novidades', description: 'Conteúdos e melhorias do app', icon: Bell },
  { key: 'reminders', label: 'Lembretes', description: 'Treinos, saúde e rotina diária', icon: Smartphone },
  { key: 'account', label: 'Conta', description: 'Segurança, login e pagamentos', icon: ShieldCheck },
  { key: 'wearables', label: 'Relógio', description: 'Sincronização de saúde', icon: Watch },
  { key: 'email', label: 'Email', description: 'Resumo e avisos importantes', icon: Mail },
  { key: 'whatsapp', label: 'WhatsApp', description: 'Confirmação de consultas', icon: MessageCircle },
];

const defaultNotificationSettings = {
  updates: true,
  reminders: true,
  account: true,
  wearables: true,
  email: true,
  whatsapp: false,
};

const sanitizePhone = (value: string) => value.replace(/\D/g, '').slice(0, 11);
const parseDecimalInput = (value: string) => Number(value.replace(',', '.'));

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 py-4 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="max-w-[62%] truncate text-right text-sm font-semibold text-foreground">{value || '-'}</span>
    </div>
  );
}

export default function Settings() {
  const { signOut } = useAuth();
  const { profile, loading, updateProfile } = useProfile();
  const { latestRecord: latestBioimpedance } = useBioimpedance();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [highlightBMI, setHighlightBMI] = useState(false);
  const [highlightWeeklyGoal, setHighlightWeeklyGoal] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    ...defaultNotificationSettings,
  });
  const bmiFieldsRef = useRef<HTMLDivElement>(null);
  const weeklyGoalFieldRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    age: '',
    height_cm: '',
    weight_kg: '',
    weight_goal_kg: '',
    weekly_workout_goal: '',
  });

  // Auto-edit when coming from a deep-link (BMI card, "Alterar meta" na Home)
  useEffect(() => {
    const editTarget = searchParams.get('edit');
    if ((editTarget === 'bmi' || editTarget === 'weekly_goal') && profile && !loading) {
      setFormData({
        full_name: profile.full_name,
        phone: profile.phone || '',
        age: String(profile.age),
        height_cm: String(profile.height_cm),
        weight_kg: String(profile.weight_kg),
        weight_goal_kg: profile.weight_goal_kg != null ? String(profile.weight_goal_kg) : '',
        weekly_workout_goal: profile.weekly_workout_goal != null ? String(profile.weekly_workout_goal) : '',
      });
      setEditing(true);
      // Clear the query param
      setSearchParams({});

      const targetRef = editTarget === 'bmi' ? bmiFieldsRef : weeklyGoalFieldRef;
      const setHighlight = editTarget === 'bmi' ? setHighlightBMI : setHighlightWeeklyGoal;
      setHighlight(true);
      // Scroll to the target field after a short delay
      setTimeout(() => {
        targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      // Remove highlight after animation
      setTimeout(() => setHighlight(false), 2000);
    }
  }, [searchParams, profile, loading, setSearchParams]);

  useEffect(() => {
    if (!profile?.notification_preferences) return;

    setNotificationSettings({
      ...defaultNotificationSettings,
      ...profile.notification_preferences,
    });
  }, [profile?.notification_preferences]);

  const startEditing = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name,
        phone: profile.phone || '',
        age: String(profile.age),
        height_cm: String(profile.height_cm),
        weight_kg: String(profile.weight_kg),
        weight_goal_kg: profile.weight_goal_kg != null ? String(profile.weight_goal_kg) : '',
        weekly_workout_goal: profile.weekly_workout_goal != null ? String(profile.weekly_workout_goal) : '',
      });
    }
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await updateProfile({
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || null,
        age: Number(formData.age),
        height_cm: Number(formData.height_cm),
        weight_kg: parseDecimalInput(formData.weight_kg),
        weight_goal_kg: formData.weight_goal_kg.trim() ? parseDecimalInput(formData.weight_goal_kg) : null,
        weekly_workout_goal: formData.weekly_workout_goal.trim() ? Number(formData.weekly_workout_goal) : null,
      });

      if (error) throw new Error(error);

      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram salvas.',
      });
      setEditing(false);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleNotificationChange = async (
    key: NotificationPreference['key'],
    checked: boolean,
  ) => {
    const nextSettings = {
      ...notificationSettings,
      [key]: checked,
    };

    setNotificationSettings(nextSettings);

    const { error } = await updateProfile({
      notification_preferences: nextSettings,
    });

    if (error) {
      setNotificationSettings(notificationSettings);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar preferência',
        description: error,
      });
    }
  };

  const initials = profile?.full_name
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'VI';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-4 pb-28 pt-4 md:pb-8 md:pt-7">
      <header className="relative flex h-12 items-center justify-center">
        <Link
          to="/profile"
          className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-card/85 text-muted-foreground shadow-elegant hover:text-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold">Ajustes</h1>
        {!editing && (
          <Button
            variant="ghost"
            size="icon"
            onClick={startEditing}
            className="absolute right-0 h-10 w-10 rounded-full bg-card/85 shadow-elegant"
            aria-label="Editar perfil"
          >
            <Edit className="h-5 w-5" />
          </Button>
        )}
      </header>

      <section className="rounded-2xl border border-white/5 bg-card/85 p-4 shadow-elegant md:p-5">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/25 bg-primary/15 text-2xl font-bold text-primary">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full rounded-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div>
            <p className="text-base font-bold">{profile?.full_name}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
          </div>
          {!editing && (
            <button type="button" onClick={startEditing} className="text-sm font-bold text-primary">
              Editar dados
            </button>
          )}
        </div>

        {editing ? (
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="text"
                inputMode="numeric"
                maxLength={11}
                value={formData.phone}
                onKeyDown={handleIntegerKeyDown}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: sanitizePhone(e.target.value) }))}
                className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
              />
            </div>
            <div 
              ref={bmiFieldsRef}
              className={cn(
                "grid grid-cols-3 gap-3 p-2 -m-2 rounded-xl transition-all duration-500",
                highlightBMI && "ring-2 ring-primary bg-primary/10"
              )}
            >
              <div className="space-y-2">
                <Label htmlFor="age">Idade</Label>
                <Input
                  id="age"
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  value={formData.age}
                  onKeyDown={handleIntegerKeyDown}
                  onChange={(e) => setFormData((prev) => ({ ...prev, age: sanitizeInteger(e.target.value) }))}
                  className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height_cm">Altura (cm)</Label>
                <Input
                  id="height_cm"
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  value={formData.height_cm}
                  onKeyDown={handleIntegerKeyDown}
                  onChange={(e) => setFormData((prev) => ({ ...prev, height_cm: sanitizeInteger(e.target.value) }))}
                  className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight_kg">Peso (kg)</Label>
                <Input
                  id="weight_kg"
                  type="text"
                  inputMode="decimal"
                  maxLength={6}
                  value={formData.weight_kg}
                  onKeyDown={handleDecimalKeyDown}
                  onChange={(e) => setFormData((prev) => ({ ...prev, weight_kg: sanitizeDecimal(e.target.value) }))}
                  className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight_goal_kg">Meta de peso (kg)</Label>
              <Input
                id="weight_goal_kg"
                type="text"
                inputMode="decimal"
                maxLength={6}
                placeholder="Opcional"
                value={formData.weight_goal_kg}
                onKeyDown={handleDecimalKeyDown}
                onChange={(e) => setFormData((prev) => ({ ...prev, weight_goal_kg: sanitizeDecimal(e.target.value) }))}
                className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
              />
              {(() => {
                const goalWeight = parseDecimalInput(formData.weight_goal_kg);
                const heightCm = Number(formData.height_cm);
                if (!formData.weight_goal_kg.trim() || !Number.isFinite(goalWeight) || !heightCm) return null;

                const goalBmi = goalWeight / ((heightCm / 100) ** 2);
                if (goalBmi >= 18.5 && goalBmi <= 30) return null;

                return (
                  <p className="flex items-start gap-2 rounded-xl bg-amber-400/10 p-3 text-xs text-amber-300">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    Essa meta resultaria em um IMC de {goalBmi.toFixed(1)}, fora da faixa saudável (18,5 – 24,9).
                    Confirme com a equipe da clínica antes de manter esse valor.
                  </p>
                );
              })()}
              {latestBioimpedance?.ideal_weight_kg ? (
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      weight_goal_kg: String(latestBioimpedance.ideal_weight_kg),
                    }))
                  }
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Usar peso ideal sugerido pela bioimpedância ({latestBioimpedance.ideal_weight_kg}kg)
                </button>
              ) : null}
            </div>
            <div
              ref={weeklyGoalFieldRef}
              className={cn(
                'space-y-2 p-2 -m-2 rounded-xl transition-all duration-500',
                highlightWeeklyGoal && 'ring-2 ring-primary bg-primary/10'
              )}
            >
              <Label htmlFor="weekly_workout_goal">Meta de treinos por semana</Label>
              <Input
                id="weekly_workout_goal"
                type="text"
                inputMode="numeric"
                maxLength={2}
                placeholder="Opcional"
                value={formData.weekly_workout_goal}
                onKeyDown={handleIntegerKeyDown}
                onChange={(e) => setFormData((prev) => ({ ...prev, weekly_workout_goal: sanitizeInteger(e.target.value) }))}
                className="h-14 rounded-xl border-white/5 bg-secondary/70 text-base focus-visible:ring-offset-0"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={cancelEditing}
                className="flex-1 border-border"
                disabled={saving}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95"
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <DetailRow label="Nome completo" value={profile?.full_name} />
            <DetailRow label="Telefone" value={profile?.phone} />
            <DetailRow label="Idade" value={profile?.age ? `${profile.age} anos` : null} />
            <DetailRow label="Altura" value={profile?.height_cm ? `${profile.height_cm} cm` : null} />
            <DetailRow label="Peso" value={profile?.weight_kg ? `${profile.weight_kg} kg` : null} />
            <DetailRow label="Meta de peso" value={profile?.weight_goal_kg != null ? `${profile.weight_goal_kg} kg` : null} />
            <DetailRow
              label="Meta de treinos por semana"
              value={profile?.weekly_workout_goal != null ? `${profile.weekly_workout_goal}x por semana` : null}
            />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Aparência</h2>
          <p className="text-sm text-muted-foreground">Escolha o visual do app neste aparelho.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isActive = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={cn(
                  'relative flex flex-col items-start gap-2 rounded-2xl border px-4 py-4 text-left transition-colors',
                  isActive ? 'border-primary bg-card' : 'border-white/5 bg-card/85',
                )}
              >
                {isActive && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/80 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Notificações</h2>
          <p className="text-sm text-muted-foreground">Controle os canais e tipos de alerta que aparecem no app.</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-card/85 px-4 shadow-elegant">
          {notificationPreferences.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="flex items-center justify-between gap-4 border-b border-white/10 py-4 last:border-b-0">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/80 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{item.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                  </span>
                </div>
                <Switch
                  checked={notificationSettings[item.key]}
                  onCheckedChange={(checked) => void handleNotificationChange(item.key, checked)}
                  aria-label={`Ativar ${item.label}`}
                />
              </div>
            );
          })}
        </div>
      </section>

      <Button
        variant="outline"
        onClick={handleLogout}
        className="h-14 w-full rounded-xl border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
      >
        <LogOut className="mr-2 h-5 w-5" />
        Sair da conta
      </Button>

      <div className="text-center text-sm text-muted-foreground pt-4">
        <p>Dra. Gabriela Zinhani Issy</p>
        <p>Saúde & Performance</p>
        <p className="mt-2">v1.0.0</p>
      </div>
    </div>
  );
}
