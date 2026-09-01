import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface TrainerRouteProps {
  children: React.ReactNode;
}

// Purely a UX guard - the backend already rejects non-trainers on every
// /trainer/* endpoint (requireRole("PERSONAL_TRAINER")), so this only saves
// a non-trainer who lands on the page from staring at API error states.
export function TrainerRoute({ children }: TrainerRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!user?.roles.includes('PERSONAL_TRAINER')) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
