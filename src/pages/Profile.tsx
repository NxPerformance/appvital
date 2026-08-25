import { useRef, useState } from 'react';
import type { ElementType } from 'react';
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  Crown,
  LogOut,
  Settings as SettingsIcon,
  Trophy,
  User,
  Watch,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useAchievements } from '@/hooks/useAchievements';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type AccountAction = {
  to: string;
  label: string;
  description: string;
  icon: ElementType;
};

const accountActions: AccountAction[] = [
  { to: '/settings', label: 'Dados pessoais', description: 'Editar conta, meta de peso e notificações', icon: User },
  { to: '/wearables', label: 'Relógio e saúde', description: 'Sincronização e alertas', icon: Watch },
  { to: '/notifications', label: 'Notificações', description: 'Alertas e novidades', icon: SettingsIcon },
];

function AccountActionRow({ action }: { action: AccountAction }) {
  const Icon = action.icon;

  return (
    <Link
      to={action.to}
      className="group flex items-center justify-between gap-4 border-b border-white/10 py-4 last:border-b-0"
    >
      <div className="flex min-w-0 items-center gap-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/80 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">{action.label}</span>
          <span className="block truncate text-xs text-muted-foreground">{action.description}</span>
        </span>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

function AccountGroup({ actions }: { actions: AccountAction[] }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-card/85 px-4 shadow-elegant">
      {actions.map((action) => (
        <AccountActionRow key={action.to} action={action} />
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </h2>
  );
}

export default function Profile() {
  const { signOut } = useAuth();
  const { profile, loading, uploading, uploadAvatar } = useProfile();
  const { achievements, userAchievements } = useAchievements();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Tipo inválido',
        description: 'Use JPG, PNG, WebP ou GIF.',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'Máximo 5MB.',
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    const { error } = await uploadAvatar(file);
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar foto',
        description: error,
      });
    } else {
      toast({ title: 'Foto atualizada!' });
    }
    setAvatarPreview(null);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogout = async () => {
    setSigningOut(true);
    await signOut();
    navigate('/login', { replace: true });
  };

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
          to="/"
          className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-card/85 text-muted-foreground shadow-elegant hover:text-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold">Perfil</h1>
      </header>

      <div className="rounded-2xl border border-white/5 bg-card/85 p-4 shadow-elegant md:p-5">
        <div className="flex items-center gap-4">
          <div
            className="relative cursor-pointer group"
            onClick={handleAvatarClick}
          >
            <Avatar className="h-16 w-16 border-2 border-primary/30">
              <AvatarImage
                src={avatarPreview || profile?.avatar_url || undefined}
                alt={profile?.full_name}
                className="object-cover"
              />
              <AvatarFallback className="bg-primary/15 text-primary text-xl">
                {profile?.full_name?.charAt(0)?.toUpperCase() || <User className="w-8 h-8" />}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-5 h-5 text-white" />
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void handleFileSelect(e)}
          />
          <div>
            <h2 className="line-clamp-1 text-base font-bold">{profile?.full_name}</h2>
            <p className="line-clamp-1 text-sm text-muted-foreground">{profile?.phone || profile?.email}</p>
          </div>
        </div>

        <Link
          to="/premium"
          className="mt-4 flex h-14 items-center justify-center gap-3 rounded-xl bg-gradient-primary text-sm font-bold text-primary-foreground shadow-glow transition-opacity hover:opacity-95"
        >
          <Crown className="h-5 w-5" />
          {profile?.is_premium ? 'Premium ativo' : 'GO PREMIUM'}
        </Link>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl bg-secondary/70 p-3">
            <p className="text-2xl font-bold text-primary">{profile?.age}</p>
            <p className="text-xs text-muted-foreground">anos</p>
          </div>
          <div className="rounded-2xl bg-secondary/70 p-3">
            <p className="text-2xl font-bold text-primary">{profile?.height_cm}</p>
            <p className="text-xs text-muted-foreground">cm</p>
          </div>
          <div className="rounded-2xl bg-secondary/70 p-3">
            <p className="text-2xl font-bold text-primary">{profile?.weight_kg}</p>
            <p className="text-xs text-muted-foreground">kg</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <SectionLabel>Conta</SectionLabel>
        <AccountGroup actions={accountActions} />
      </div>

      <Button
        variant="outline"
        onClick={() => void handleLogout()}
        disabled={signingOut}
        className="h-14 w-full rounded-xl border-destructive/50 bg-card/85 text-destructive shadow-elegant hover:bg-destructive hover:text-destructive-foreground"
      >
        <LogOut className="mr-2 h-5 w-5" />
        {signingOut ? 'Saindo...' : 'Sair do aplicativo'}
      </Button>

      {/* Conquistas Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Conquistas
        </h2>
        <div className="rounded-[2rem] border border-white/5 bg-card/85 p-4 shadow-elegant">
          {achievements && achievements.length > 0 ? (
            <div className="grid grid-cols-4 gap-4">
              {achievements.map((achievement) => {
                const isUnlocked = userAchievements?.some(
                  (ua) => ua.achievement_id === achievement.id
                );
                return (
                  <div
                    key={achievement.id}
                    className={cn(
                      "flex flex-col items-center gap-2 text-center",
                      !isUnlocked && "opacity-40"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-2xl",
                      isUnlocked ? "bg-primary/15" : "bg-muted"
                    )}>
                      {achievement.icon || '🏆'}
                    </div>
                    <span className="text-xs font-medium leading-tight">
                      {achievement.name}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Suas conquistas aparecerão aqui</p>
            </div>
          )}
        </div>
      </div>

      {/* App Info */}
      <div className="text-center text-sm text-muted-foreground pt-4">
        <p>Dra. Gabriela Zinhani Issy</p>
        <p>Saúde & Performance</p>
        <p className="mt-2">v1.0.0</p>
      </div>
    </div>
  );
}
