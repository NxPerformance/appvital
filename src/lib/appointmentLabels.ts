import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Shared by Home.tsx and Appointments.tsx (both user-facing) so the same
// appointment shows the same label/color everywhere - they previously kept
// independent copies of this exact mapping, free to drift apart over time.
// AdminAppointments.tsx intentionally uses its own, plainer labels ("Pendente"
// instead of "Aguardando contato") for a different, internal audience, so it
// isn't unified here.
export const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  consulta_online: 'Consulta online',
  consulta_presencial: 'Consulta presencial',
  bioimpedancia: 'Bioimpedância',
};

export const APPOINTMENT_STATUS_LABELS: Record<string, { label: string; className: string; icon: LucideIcon }> = {
  pending: { label: 'Aguardando contato', className: 'bg-yellow-500/15 text-yellow-300', icon: Clock },
  confirmed: { label: 'Agendado', className: 'bg-emerald-400/15 text-emerald-300', icon: CheckCircle2 },
  completed: { label: 'Concluído', className: 'bg-sky-400/15 text-sky-300', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', className: 'bg-red-400/15 text-red-300', icon: XCircle },
};
