import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, BackendUser, clearStoredAuthSession, getStoredAuthSession, persistAuthSession } from '@/lib/api';

interface RegisterPayload {
  full_name: string;
  email: string;
  phone?: string | null;
  age: number;
  height_cm: number;
  weight_kg: number;
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
  session: { token: string } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload | FormData) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BackendUser | null>(null);
  const [session, setSession] = useState<{ token: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = async () => {
    const stored = getStoredAuthSession();
    if (!stored?.token) {
      setSession(null);
      setUser(null);
      return;
    }

    const response = await api.get<{ user: BackendUser }>('/auth/me');
    persistAuthSession(stored.token, response.user);
    setSession({ token: stored.token });
    setUser(response.user);
  };

  useEffect(() => {
    const bootstrap = async () => {
      const stored = getStoredAuthSession();
      if (!stored?.token) {
        setLoading(false);
        return;
      }

      try {
        await refreshAuth();
      } catch {
        clearStoredAuthSession();
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const signIn = async (email: string, password: string) => {
    const response = await api.post<{ token: string; user: BackendUser }>('/auth/login', {
      email,
      password,
    }, false);

    persistAuthSession(response.token, response.user);
    setSession({ token: response.token });
    setUser(response.user);
  };

  const register = async (payload: RegisterPayload | FormData) => {
    const response = await api.post<{ token: string; user: BackendUser }>('/auth/register', payload, false);

    persistAuthSession(response.token, response.user);
    setSession({ token: response.token });
    setUser(response.user);
  };

  const signOut = async () => {
    clearStoredAuthSession();
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, register, signOut, refreshAuth }}>
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
