import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, ApiError, BackendUser } from '@/lib/api';

interface RegisterPayload {
  full_name: string;
  email: string;
  phone?: string | null;
  age: number;
  height_cm: number;
  weight_kg: number;
  weekly_workout_goal?: number | null;
  password: string;
  terms_accepted: boolean;
  account_type?: 'client' | 'personal';
  selected_plan?: 'essential' | 'premium';
  initial_payment_method?: 'pix' | 'credit_card' | null;
  trainer_application?: {
    cref: string;
    cref_state: string;
    specialties?: string | null;
    experience_years?: number | null;
    instagram_handle?: string | null;
    proof_notes?: string | null;
  };
}

interface AuthContextType {
  user: BackendUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload | FormData) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BackendUser | null>(null);
  const [loading, setLoading] = useState(true);

  // The session lives in an httpOnly cookie the browser sends automatically —
  // there's nothing for the frontend to read directly, so auth state is
  // always determined by asking the backend.
  const refreshAuth = async () => {
    try {
      const response = await api.get<{ user: BackendUser }>('/auth/me');
      setUser(response.user);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        return;
      }
      throw error;
    }
  };

  useEffect(() => {
    refreshAuth().finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    const response = await api.post<{ user: BackendUser }>('/auth/login', { email, password });
    setUser(response.user);
  };

  const register = async (payload: RegisterPayload | FormData) => {
    const response = await api.post<{ user: BackendUser }>('/auth/register', payload);
    setUser(response.user);
  };

  const signOut = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, register, signOut, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
