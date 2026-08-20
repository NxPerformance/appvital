import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toDateOnlyString } from '@/lib/dateUtils';

export interface Appointment {
  id: string;
  user_id: string;
  type: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  admin_notes: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
}

type RawAppointment = {
  id: string;
  user_id?: string;
  userId?: string;
  type: string;
  status: string;
  scheduled_date?: string | null;
  scheduledDate?: string | null;
  scheduled_time?: string | null;
  scheduledTime?: string | null;
  admin_notes?: string | null;
  adminNotes?: string | null;
  created_at?: string;
  createdAt?: string;
  profiles?: Appointment['profiles'];
};

function normalizeAppointment(appointment: RawAppointment): Appointment {
  const scheduledDate = appointment.scheduled_date ?? appointment.scheduledDate ?? null;

  return {
    id: appointment.id,
    user_id: appointment.user_id ?? appointment.userId ?? '',
    type: appointment.type,
    status: appointment.status,
    scheduled_date: scheduledDate ? toDateOnlyString(scheduledDate) : null,
    scheduled_time: appointment.scheduled_time ?? appointment.scheduledTime ?? null,
    admin_notes: appointment.admin_notes ?? appointment.adminNotes ?? null,
    created_at: appointment.created_at ?? appointment.createdAt ?? '',
    profiles: appointment.profiles,
  };
}

// Admin: fetch all appointments with user info (queries separadas para evitar erro de FK)
export function useAllAppointments() {
  return useQuery({
    queryKey: ['appointments', 'all'],
    queryFn: async () => {
      const response = await api.get<{ appointments: RawAppointment[] }>('/appointments/admin');
      return response.appointments.map(normalizeAppointment);
    },
  });
}

// Admin: count pending appointments
export function usePendingAppointmentsCount() {
  return useQuery({
    queryKey: ['appointments', 'pending-count'],
    queryFn: async () => {
      const response = await api.get<{ appointments: RawAppointment[] }>('/appointments/admin');
      return response.appointments
        .map(normalizeAppointment)
        .filter((appointment) => appointment.status === 'pending').length;
    },
  });
}

// User: fetch own appointments
export function useMyAppointments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['appointments', 'my', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await api.get<{ appointments: RawAppointment[] }>('/appointments/mine');
      return response.appointments.map(normalizeAppointment);
    },
    enabled: !!user,
  });
}

// User: create appointment
export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (type: string) => {
      if (!user) throw new Error('User not authenticated');
      const response = await api.post<{ appointment: RawAppointment }>('/appointments/mine', { type });
      return normalizeAppointment(response.appointment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

// Admin: update appointment
export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      scheduled_date,
      scheduled_time,
      status,
      admin_notes,
    }: {
      id: string;
      scheduled_date?: string | null;
      scheduled_time?: string | null;
      status?: string;
      admin_notes?: string | null;
    }) => {
      const payload: {
        scheduled_date?: string | null;
        scheduled_time?: string | null;
        status?: string;
        admin_notes?: string | null;
      } = {};

      if (scheduled_date !== undefined) payload.scheduled_date = scheduled_date;
      if (scheduled_time !== undefined) payload.scheduled_time = scheduled_time;
      if (status !== undefined) payload.status = status;
      if (admin_notes !== undefined) payload.admin_notes = admin_notes;

      const response = await api.patch<{ appointment: RawAppointment }>(`/appointments/admin/${id}`, payload);
      return normalizeAppointment(response.appointment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

// User: delete pending appointment
export function useDeleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/appointments/mine/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
