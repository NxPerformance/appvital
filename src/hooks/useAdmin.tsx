import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toDateOnlyString } from '@/lib/dateUtils';
import { useAuth } from './useAuth';

function mapBioimpedanceRecord(record: any) {
  return {
    id: record.id,
    user_id: record.userId,
    date: toDateOnlyString(record.date),
    created_at: record.createdAt,
    weight_kg: record.weightKg ? Number(record.weightKg) : null,
    body_fat_percent: record.bodyFatPercent ? Number(record.bodyFatPercent) : null,
    muscle_percent: record.musclePercent ? Number(record.musclePercent) : null,
    water_percent: record.waterPercent ? Number(record.waterPercent) : null,
    visceral_fat: record.visceralFat ? Number(record.visceralFat) : null,
    subcutaneous_fat_percent: record.subcutaneousFatPercent ? Number(record.subcutaneousFatPercent) : null,
    fat_free_mass_kg: record.fatFreeMassKg ? Number(record.fatFreeMassKg) : null,
    protein_percent: record.proteinPercent ? Number(record.proteinPercent) : null,
    bone_mass_kg: record.boneMassKg ? Number(record.boneMassKg) : null,
    muscle_mass_kg: record.muscleMassKg ? Number(record.muscleMassKg) : null,
    bmi: record.bmi ? Number(record.bmi) : null,
    fat_weight_kg: record.fatWeightKg ? Number(record.fatWeightKg) : null,
    waist_hip_ratio: record.waistHipRatio ? Number(record.waistHipRatio) : null,
    bmr_kcal: record.bmrKcal,
    ideal_weight_kg: record.idealWeightKg ? Number(record.idealWeightKg) : null,
    weight_control_tip: record.weightControlTip ? Number(record.weightControlTip) : null,
    fat_control_tip: record.fatControlTip ? Number(record.fatControlTip) : null,
    muscle_control_tip: record.muscleControlTip ? Number(record.muscleControlTip) : null,
    daily_calories: record.dailyCalories,
    waist_cm: record.waistCm ? Number(record.waistCm) : null,
    hip_cm: record.hipCm ? Number(record.hipCm) : null,
    arm_cm: record.armCm ? Number(record.armCm) : null,
    thigh_cm: record.thighCm ? Number(record.thighCm) : null,
    shoulder_imbalance_cm: record.shoulderImbalanceCm ? Number(record.shoulderImbalanceCm) : null,
    spine_curvature_cm: record.spineCurvatureCm ? Number(record.spineCurvatureCm) : null,
    head_tilt_degrees: record.headTiltDegrees ? Number(record.headTiltDegrees) : null,
    trunk_curvature_degrees: record.trunkCurvatureDegrees ? Number(record.trunkCurvatureDegrees) : null,
    pelvis_tilt_degrees: record.pelvisTiltDegrees ? Number(record.pelvisTiltDegrees) : null,
    head_forward_degrees: record.headForwardDegrees ? Number(record.headForwardDegrees) : null,
    notes: record.notes,
  };
}

export interface AdminProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  age: number;
  height_cm: number;
  weight_kg: number;
  is_premium: boolean;
  created_at: string | null;
  entry_date: string | null;
  avatar_url?: string | null;
  is_admin: boolean;
  is_personal_trainer?: boolean;
  trainer_application_status?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  trainer_application_id?: string | null;
}

export interface TrainerApplication {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  full_name: string;
  cref: string;
  cref_state: string;
  specialties: string | null;
  experience_years: number | null;
  instagram_handle: string | null;
  proof_notes: string | null;
  self_photo_url: string | null;
  document_photo_url: string | null;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  user: AdminProfile | null;
}

export interface AdminOrder {
  id: string;
  status: string;
  total_cents: number;
  currency: string;
  customer_email: string;
  customer_name: string | null;
  user_id: string;
  created_at: string;
  paid_at: string | null;
  items: Array<{
    product_name: string;
    quantity: number;
    total_cents: number;
  }>;
  payments: Array<{
    id: string;
    provider: string;
    method: string;
    status: string;
    amount_cents: number;
    provider_payment_id: string | null;
    created_at: string;
  }>;
}

export interface PaymentGatewaySettings {
  provider: 'stripe';
  is_active: boolean;
  publishable_key: string;
  has_secret_key: boolean;
  has_webhook_secret: boolean;
  secret_key_preview: string | null;
  webhook_secret_preview: string | null;
  source: 'database' | 'environment';
  updated_at: string | null;
}

export function useIsAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['isAdmin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      return user.roles.includes('ADMIN');
    },
    enabled: !!user?.id,
  });
}

export function useAllProfiles() {
  return useQuery({
    queryKey: ['allProfiles'],
    queryFn: async () => {
      const response = await api.get<{ users: AdminProfile[] }>('/admin/users');
      return response.users;
    },
  });
}

export function useAdminOrders() {
  return useQuery({
    queryKey: ['adminOrders'],
    queryFn: async () => {
      const response = await api.get<{ orders: AdminOrder[] }>('/admin/orders');
      return response.orders;
    },
  });
}

export function usePaymentGatewaySettings() {
  return useQuery({
    queryKey: ['paymentGatewaySettings'],
    queryFn: async () => {
      const response = await api.get<{ settings: PaymentGatewaySettings }>('/admin/payment-gateway-settings');
      return response.settings;
    },
  });
}

export function useUpdateStripeGatewaySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: {
      is_active: boolean;
      publishable_key?: string | null;
      secret_key?: string | null;
      webhook_secret?: string | null;
    }) => {
      const response = await api.put<{ settings: PaymentGatewaySettings }>(
        '/admin/payment-gateway-settings/stripe',
        settings,
      );
      return response.settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentGatewaySettings'] });
    },
  });
}

export function useUserBioimpedance(userId: string | undefined) {
  return useQuery({
    queryKey: ['userBioimpedance', userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await api.get<{ records: any[] }>(`/bioimpedance/admin/user/${userId}`);
      return response.records.map(mapBioimpedanceRecord);
    },
    enabled: !!userId,
  });
}

export function useBioimpedanceRecord(recordId: string | undefined) {
  return useQuery({
    queryKey: ['bioimpedanceRecord', recordId],
    queryFn: async () => {
      if (!recordId) return null;
      const response = await api.get<{ record: any }>(`/bioimpedance/admin/record/${recordId}`);
      return mapBioimpedanceRecord(response.record);
    },
    enabled: !!recordId,
  });
}

export function useInsertBioimpedance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: Record<string, unknown>) => {
      const response = await api.post<{ record: any }>('/bioimpedance/admin', record);
      return mapBioimpedanceRecord(response.record);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userBioimpedance'] });
      queryClient.invalidateQueries({ queryKey: ['allProfiles'] });
    },
  });
}

export function useUpdateBioimpedance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...record }: { id: string } & Record<string, unknown>) => {
      const response = await api.patch<{ record: any }>(`/bioimpedance/admin/${id}`, record);
      return mapBioimpedanceRecord(response.record);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userBioimpedance'] });
      queryClient.invalidateQueries({ queryKey: ['bioimpedanceRecord'] });
    },
  });
}

export function useDeleteBioimpedance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/bioimpedance/admin/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userBioimpedance'] });
    },
  });
}

export function useUpdateUserPremium() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, isPremium }: { userId: string; isPremium: boolean }) => {
      await api.patch(`/admin/users/${userId}/premium`, {
        is_premium: isPremium,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProfiles'] });
    },
  });
}

export function useSetAdminRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, enable }: { userId: string; enable: boolean }) => {
      await api.patch(`/admin/users/${userId}/admin-role`, {
        is_admin: enable,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['isAdmin'] });
    },
  });
}

export function useSetTrainerRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, enable }: { userId: string; enable: boolean }) => {
      await api.patch(`/admin/users/${userId}/trainer-role`, {
        is_personal_trainer: enable,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['trainerApplications'] });
    },
  });
}

export function useTrainerApplications() {
  return useQuery({
    queryKey: ['trainerApplications'],
    queryFn: async () => {
      const response = await api.get<{ applications: TrainerApplication[] }>('/admin/trainer-applications');
      return response.applications;
    },
  });
}

export function useReviewTrainerApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      decision,
      rejectionReason,
    }: {
      applicationId: string;
      decision: 'approve' | 'reject';
      rejectionReason?: string | null;
    }) => {
      await api.patch(`/admin/trainer-applications/${applicationId}/review`, {
        decision,
        rejection_reason: rejectionReason ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['trainerApplications'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProfiles'] });
    },
  });
}
