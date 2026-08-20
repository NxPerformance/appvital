import { useState, useEffect, useRef } from 'react';
import type { ElementType } from 'react';
import {
  ArrowLeft,
  Bell,
  Edit,
  LogOut,
  Mail,
  MessageCircle,
  Save,
  ShieldCheck,
  Smartphone,
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { handleIntegerKeyDown, handleDecimalKeyDown, sanitizeInteger, sanitizeDecimal } from '@/lib/inputValidation';

type NotificationPreference = {
  key: 'updates' | 'reminders' | 'account' | 'wearables' | 'email' | 'whatsapp';
  label: string;
  description: string;
  icon: ElementType;
};

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
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [highlightBMI, setHighlightBMI] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    ...defaultNotificationSettings,
  });
  const bmiFieldsRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    age: '',
    height_cm: '',
    weight_kg: '',
  });

  // Auto-edit when coming from BMI card
  useEffect(() => {
    if (searchParams.get('edit') === 'bmi' && profile && !loading) {
      setFormData({
        full_name: profile.full_name,
        phone: profile.phone || '',
        age: String(profile.age),
        height_cm: String(profile.height_cm),
        weight_kg: String(profile.weight_kg),
      });
      setEditing(true);
      setHighlightBMI(true);
      // Clear the query param
      setSearchParams({});
      // Scroll to BMI fields after a short delay
      setTimeout(() => {
        bmiFieldsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      // Remove highlight after animation
      setTimeout(() => setHighlightBMI(false), 2000);
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
          </div>
        )}
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
