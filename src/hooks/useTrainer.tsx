import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface TrainerClientProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  age: number;
  height_cm: number;
  weight_kg: number;
  is_premium: boolean;
  entry_date: string | null;
  avatar_url: string | null;
  is_admin?: boolean;
  is_personal_trainer?: boolean;
}

export interface TrainerClientAssignment {
  id: string;
  status: 'active' | 'archived';
  notes: string | null;
  goals?: string | null;
  training_plan?: string | null;
  created_at: string;
  profile: TrainerClientProfile;
}

export interface TrainerClientLog {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TrainerClientSummary {
  assignment: {
    id: string;
    status: 'active' | 'archived';
    notes: string | null;
    goals: string | null;
    training_plan: string | null;
    created_at: string;
  };
  workouts_last_30_days: number;
  strength_workouts_last_30_days: number;
  cardio_workouts_last_30_days: number;
  latest_body_progress_photo: {
    id: string;
    image_url: string;
    pose: string;
    taken_at: string;
  } | null;
  latest_bioimpedance: {
    date: string;
    weight_kg: number | null;
    body_fat_percent: number | null;
    muscle_mass_kg: number | null;
  } | null;
  logs: TrainerClientLog[];
}

export interface MyTrainerAssignment {
  id: string;
  status: 'active' | 'archived';
  notes: string | null;
  goals: string | null;
  training_plan: string | null;
  created_at: string;
  updated_at: string;
  trainer: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export function useMyTrainerAssignment(enabled = true) {
  return useQuery({
    queryKey: ['myTrainerAssignment'],
    queryFn: async () => {
      const response = await api.get<{ assignment: MyTrainerAssignment | null }>('/trainer/my-assignment');
      return response.assignment;
    },
    enabled,
  });
}

export function useTrainerClients() {
  return useQuery({
    queryKey: ['trainerClients'],
    queryFn: async () => {
      const response = await api.get<{ clients: TrainerClientAssignment[] }>('/trainer/clients');
      return response.clients;
    },
  });
}

export function useTrainerClientSummary(clientId: string | undefined) {
  return useQuery({
    queryKey: ['trainerClientSummary', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const response = await api.get<{ client: TrainerClientProfile; summary: TrainerClientSummary }>(
        `/trainer/clients/${clientId}/summary`
      );
      return response;
    },
    enabled: !!clientId,
  });
}

export function useTrainerUserSearch(query: string) {
  return useQuery({
    queryKey: ['trainerUserSearch', query],
    queryFn: async () => {
      if (query.trim().length < 2) return [];
      const response = await api.get<{ users: Array<{ profile: TrainerClientProfile }> }>(
        `/trainer/search-users?q=${encodeURIComponent(query)}`
      );
      return response.users.map((item) => item.profile);
    },
    enabled: query.trim().length >= 2,
  });
}

export function useAssignTrainerClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, notes }: { clientId: string; notes?: string }) => {
      await api.post('/trainer/clients', {
        client_id: clientId,
        notes: notes ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerClients'] });
      queryClient.invalidateQueries({ queryKey: ['trainerUserSearch'] });
    },
  });
}

export function useUpdateTrainerClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      status,
      notes,
      goals,
      trainingPlan,
    }: {
      assignmentId: string;
      status?: 'ACTIVE' | 'ARCHIVED';
      notes?: string | null;
      goals?: string | null;
      trainingPlan?: string | null;
    }) => {
      await api.patch(`/trainer/clients/${assignmentId}`, {
        status,
        notes,
        goals: variablesOrUndefined(goals),
        training_plan: variablesOrUndefined(trainingPlan),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trainerClients'] });
      queryClient.invalidateQueries({ queryKey: ['trainerClientSummary'] });
      if (variables.assignmentId) {
        queryClient.invalidateQueries({ queryKey: ['trainerClients'] });
      }
    },
  });
}

function variablesOrUndefined(value: string | null | undefined) {
  if (typeof value === 'undefined') return undefined;
  return value;
}

export function useCreateTrainerLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      title,
      content,
    }: {
      clientId: string;
      title: string;
      content: string;
    }) => {
      await api.post(`/trainer/clients/${clientId}/logs`, {
        title,
        content,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trainerClientSummary', variables.clientId] });
    },
  });
}
