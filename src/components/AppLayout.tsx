import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  BadgeCheck,
  Crown,
  Dumbbell,
  Heart,
  HeartPulse,
  Watch,
  LogOut,
  Settings,
  Trophy,
  TrendingUp,
  UserCircle2,
} from "lucide-react";
import { BottomNav } from "./BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const patientNavItems = [
  { to: "/", icon: Heart, label: "Início" },
  { to: "/workouts", icon: Dumbbell, label: "Treinos" },
  { to: "/body-progress", icon: TrendingUp, label: "Evolução" },
  { to: "/appointments", icon: HeartPulse, label: "Saúde" },
  { to: "/workouts/dashboard", icon: BarChart3, label: "Estatísticas" },
  { to: "/wearables", icon: Watch, label: "Relógio" },
  { to: "/premium", icon: Trophy, label: "Conquistas" },
  { to: "/profile", icon: UserCircle2, label: "Perfil" },
  { to: "/settings", icon: Settings, label: "Configurações" },
];

export function AppLayout() {
  const { profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const firstName = profile?.full_name?.split(" ")[0] || "Paciente";
  const initials = profile?.full_name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "PA";

  const navItems = [
    ...patientNavItems,
    ...(profile?.is_personal_trainer ? [{ to: "/trainer", icon: BadgeCheck, label: "Personal" }] : []),
    ...(isAdmin ? [{ to: "/admin", icon: Crown, label: "Admin" }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const isNavItemActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    if (to === "/workouts") return location.pathname.startsWith("/workouts") && !location.pathname.startsWith("/workouts/dashboard");
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <div className="app-container md:bg-[#24102e] md:p-2">
      <aside className="hidden w-[330px] shrink-0 rounded-[2rem] border border-white/5 bg-[#24102e] md:flex md:flex-col md:justify-between md:px-7 md:py-6">
        <div className="space-y-10">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
              <Heart className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[2rem] font-semibold tracking-tight">Vitalissy</p>
            </div>
          </div>

          <nav className="space-y-3">
            {navItems.map((item) => {
              const isActive = isNavItemActive(item.to);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-4 rounded-[1.5rem] px-5 py-4 text-xl font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-primary text-primary-foreground shadow-glow"
                      : "text-foreground/82 hover:bg-[hsl(var(--secondary))] hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-6">
          <div className="border-t border-white/10 pt-7">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border border-white/10">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "Avatar"} />
                <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-2xl font-semibold">{firstName}</p>
                <p className="truncate text-base text-muted-foreground">Vitalissy</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-[#2d123b]/70 px-4 text-sm font-medium text-red-300 transition-colors hover:bg-[#3a174d] hover:text-red-200"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <main className="app-content hide-scrollbar rounded-[2rem] pb-20 md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
