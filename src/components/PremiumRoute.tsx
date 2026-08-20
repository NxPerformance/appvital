import { Navigate, useLocation } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";

export function PremiumRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useProfile();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
      </div>
    );
  }

  const hasPremiumAccess = Boolean(profile?.is_premium || profile?.is_admin || profile?.is_personal_trainer);

  if (!hasPremiumAccess) {
    return <Navigate to="/premium" replace state={{ premiumRequired: true, from: location.pathname }} />;
  }

  return <>{children}</>;
}
