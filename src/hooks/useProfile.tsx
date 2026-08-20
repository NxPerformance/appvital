import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  age: number;
  height_cm: number;
  weight_kg: number;
  is_premium: boolean;
  account_type?: 'client' | 'personal';
  selected_plan?: 'essential' | 'premium' | null;
  initial_payment_method?: 'pix' | 'credit_card' | null;
  terms_accepted_at?: string | null;
  notification_preferences?: Record<string, boolean>;
  created_at: string;
  entry_date: string | null;
  avatar_url: string | null;
  is_admin?: boolean;
  is_personal_trainer?: boolean;
  trainer_application_status?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  trainer_application_id?: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get<{ profile: Profile }>('/profile/me');
      setProfile(response.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const payload = {
        full_name: updates.full_name,
        phone: updates.phone,
        age: updates.age,
        height_cm: updates.height_cm,
        weight_kg: updates.weight_kg,
        notification_preferences: updates.notification_preferences,
      };
      await api.patch('/profile/me', payload);
      await fetchProfile();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erro ao atualizar perfil' };
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return { error: 'Not authenticated', url: null };

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return { error: 'Tipo de arquivo não permitido. Use JPG, PNG, WebP ou GIF.', url: null };
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { error: 'Arquivo muito grande. Máximo 5MB.', url: null };
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await api.post<{ profile: Profile }>('/profile/avatar', formData);
      setProfile(response.profile);
      return { error: null, url: response.profile.avatar_url };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erro ao enviar avatar', url: null };
    } finally {
      setUploading(false);
    }
  };

  return { profile, loading, error, uploading, updateProfile, uploadAvatar, refetch: fetchProfile };
}
