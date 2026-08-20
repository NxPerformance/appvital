import { NavLink } from 'react-router-dom';
import { Dumbbell, HeartPulse, Home, TrendingUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const baseNavItems = [
  { to: '/', icon: Home, label: 'Início' },
  { to: '/workouts', icon: Dumbbell, label: 'Treinos' },
  { to: '/body-progress', icon: TrendingUp, label: 'Evolução' },
  { to: '/appointments', icon: HeartPulse, label: 'Saúde' },
  { to: '/profile', icon: User, label: 'Perfil' },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[hsl(var(--background-strong)/0.96)] px-3 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex h-16 max-w-[430px] items-center justify-around">
        {baseNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex min-w-[58px] flex-col items-center justify-center gap-1 px-1 py-2 transition-colors duration-200',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'flex h-6 w-8 items-center justify-center transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
