import { AppointmentStatus, AppointmentType, UserRole, type Profile, type User } from "@prisma/client";

const defaultNotificationPreferences = {
  updates: true,
  reminders: true,
  account: true,
  wearables: true,
  email: true,
  whatsapp: false,
};

export function serializeUser(user: User, roles: UserRole[]) {
  return {
    id: user.id,
    email: user.email,
    roles,
    created_at: user.createdAt,
  };
}

export function serializeProfile(
  profile: Profile,
  email: string,
  options: {
    isAdmin?: boolean;
    isPersonalTrainer?: boolean;
    trainerApplicationStatus?: string | null;
    trainerApplicationId?: string | null;
  } = {},
) {
  return {
    id: profile.userId,
    full_name: profile.fullName,
    email,
    phone: profile.phone,
    age: profile.age,
    height_cm: profile.heightCm,
    weight_kg: Number(profile.weightKg),
    is_premium: profile.isPremium,
    account_type: profile.accountType,
    selected_plan: profile.selectedPlan,
    initial_payment_method: profile.initialPaymentMethod,
    terms_accepted_at: profile.termsAcceptedAt,
    notification_preferences:
      typeof profile.notificationPreferences === "object" && profile.notificationPreferences !== null
        ? { ...defaultNotificationPreferences, ...profile.notificationPreferences }
        : defaultNotificationPreferences,
    entry_date: profile.entryDate,
    avatar_url: profile.avatarUrl,
    created_at: profile.createdAt,
    is_admin: options.isAdmin ?? false,
    is_personal_trainer: options.isPersonalTrainer ?? false,
    trainer_application_status: options.trainerApplicationStatus ?? null,
    trainer_application_id: options.trainerApplicationId ?? null,
  };
}

export function serializeAppointmentType(value: string) {
  const mapping: Record<string, AppointmentType> = {
    consulta_online: AppointmentType.CONSULTA_ONLINE,
    consulta_presencial: AppointmentType.CONSULTA_PRESENCIAL,
    bioimpedancia: AppointmentType.BIOIMPEDANCIA,
  };

  return mapping[value];
}

export function parseAppointmentType(value: AppointmentType) {
  const mapping: Record<AppointmentType, string> = {
    [AppointmentType.CONSULTA_ONLINE]: "consulta_online",
    [AppointmentType.CONSULTA_PRESENCIAL]: "consulta_presencial",
    [AppointmentType.BIOIMPEDANCIA]: "bioimpedancia",
  };

  return mapping[value];
}

export function serializeAppointmentStatus(value: string) {
  const mapping: Record<string, AppointmentStatus> = {
    pending: AppointmentStatus.PENDING,
    confirmed: AppointmentStatus.CONFIRMED,
    completed: AppointmentStatus.COMPLETED,
    cancelled: AppointmentStatus.CANCELLED,
  };

  return mapping[value];
}

export function parseAppointmentStatus(value: AppointmentStatus) {
  const mapping: Record<AppointmentStatus, string> = {
    [AppointmentStatus.PENDING]: "pending",
    [AppointmentStatus.CONFIRMED]: "confirmed",
    [AppointmentStatus.COMPLETED]: "completed",
    [AppointmentStatus.CANCELLED]: "cancelled",
  };

  return mapping[value];
}
