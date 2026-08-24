import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useAdmin';
import { Loader2 } from 'lucide-react';

export function AdminRoute() {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  // Admin pages render outside AppLayout's scrollable ".app-content" container,
  // so they need this toggled on html/body/#root themselves to be able to scroll.
  useEffect(() => {
    document.documentElement.classList.add('scrollable-page');
    document.body.classList.add('scrollable-page');

    return () => {
      document.documentElement.classList.remove('scrollable-page');
      document.body.classList.remove('scrollable-page');
    };
  }, []);

  if (authLoading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
