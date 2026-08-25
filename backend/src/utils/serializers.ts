import type { Appointment, BodyProgressPhoto, Profile, User, UserRoleAssignment } from "@prisma/client";

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  updates: true,
  reminders: true,
  account: true,
  wearables: true,
  email: true,
  whatsapp: false,
};

export function serializeUser(user: Pick<User, "id" | "email" | "createdAt">, roles: string[]) {
  return {
    id: user.id,
    email: user.email,
    roles,
    created_at: user.createdAt,
  };
}

export function serializeProfile(
  profile: Profile,
  roles: string[],
  trainerApplication?: { status: string; id: string } | null,
) {
  const preferences =
    profile.notificationPreferences && typeof profile.notificationPreferences === "object"
      ? { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(profile.notificationPreferences as Record<string, boolean>) }
      : DEFAULT_NOTIFICATION_PREFERENCES;

  return {
    id: profile.userId,
    full_name: profile.fullName,
    phone: profile.phone,
    age: profile.age,
    height_cm: profile.heightCm,
    weight_kg: Number(profile.weightKg),
    weight_goal_kg: profile.weightGoalKg != null ? Number(profile.weightGoalKg) : null,
    weekly_workout_goal: profile.weeklyWorkoutGoal,
    is_premium: profile.isPremium,
    account_type: profile.accountType,
    selected_plan: profile.selectedPlan,
    initial_payment_method: profile.initialPaymentMethod,
    terms_accepted_at: profile.termsAcceptedAt,
    notification_preferences: preferences,
    created_at: profile.createdAt,
    entry_date: profile.entryDate,
    avatar_url: profile.avatarUrl,
    is_admin: roles.includes("ADMIN"),
    is_personal_trainer: roles.includes("PERSONAL_TRAINER"),
    trainer_application_status: trainerApplication?.status ?? null,
    trainer_application_id: trainerApplication?.id ?? null,
  };
}

export const APPOINTMENT_TYPE_TO_DB: Record<string, "CONSULTA_ONLINE" | "CONSULTA_PRESENCIAL" | "BIOIMPEDANCIA"> = {
  consulta_online: "CONSULTA_ONLINE",
  consulta_presencial: "CONSULTA_PRESENCIAL",
  bioimpedancia: "BIOIMPEDANCIA",
};

export const APPOINTMENT_TYPE_TO_CLIENT: Record<string, string> = {
  CONSULTA_ONLINE: "consulta_online",
  CONSULTA_PRESENCIAL: "consulta_presencial",
  BIOIMPEDANCIA: "bioimpedancia",
};

export const APPOINTMENT_STATUS_TO_DB: Record<string, "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED"> = {
  pending: "PENDING",
  confirmed: "CONFIRMED",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
};

export const APPOINTMENT_STATUS_TO_CLIENT: Record<string, string> = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export function serializeAppointment(
  appointment: Appointment,
  profile?: { fullName: string; user: { email: string } } & { phone?: string | null } | null,
) {
  return {
    id: appointment.id,
    user_id: appointment.userId,
    type: APPOINTMENT_TYPE_TO_CLIENT[appointment.type] ?? appointment.type,
    status: APPOINTMENT_STATUS_TO_CLIENT[appointment.status] ?? appointment.status,
    scheduled_date: appointment.scheduledDate,
    scheduled_time: appointment.scheduledTime,
    admin_notes: appointment.adminNotes,
    created_at: appointment.createdAt,
    profiles: profile
      ? {
          full_name: profile.fullName,
          email: profile.user.email,
          phone: profile.phone ?? null,
        }
      : undefined,
  };
}

export function serializeBodyProgressPhoto(photo: BodyProgressPhoto) {
  return {
    id: photo.id,
    user_id: photo.userId,
    image_url: photo.imageUrl,
    pose: photo.pose.toLowerCase(),
    label: photo.label,
    notes: photo.notes,
    taken_at: photo.takenAt,
    created_at: photo.createdAt,
  };
}

export function rolesFromAssignments(assignments: Pick<UserRoleAssignment, "role">[]): string[] {
  return assignments.map((assignment) => assignment.role);
}
