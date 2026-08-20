import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@vitalissy.dev";
const ADMIN_PASSWORD = "VitalissyDev2026!";

const DEFAULT_NOTIFICATION_PREFERENCES = {
  updates: true,
  reminders: true,
  account: true,
  wearables: true,
  email: true,
  whatsapp: false,
};

async function seedAdminUser() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`Usuario admin ja existe: ${ADMIN_EMAIL}`);
    return existing;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const user = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash,
      profile: {
        create: {
          fullName: "Administrador Vitalissy",
          age: 30,
          heightCm: 170,
          weightKg: 70,
          isPremium: true,
          accountType: "client",
          termsAcceptedAt: new Date(),
          notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
          entryDate: new Date(),
        },
      },
      roles: {
        create: { role: "ADMIN" },
      },
    },
  });

  console.log(`Usuario admin criado: ${ADMIN_EMAIL}`);
  return user;
}

async function seedAchievements() {
  const achievements = [
    { name: "Mudança de Vida", description: "Comece sua jornada de transformação na Vitalissy.", sortOrder: 1 },
    { name: "Primeiro Treino", description: "Registre seu primeiro treino no app.", sortOrder: 2 },
  ];

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { name: achievement.name },
      create: achievement,
      update: {},
    });
  }

  console.log("Conquistas verificadas/criadas.");
}

async function seedProducts() {
  await prisma.product.upsert({
    where: { slug: "premium-mensal" },
    create: {
      slug: "premium-mensal",
      name: "Vitalissy Premium",
      description: "Acesso completo aos recursos premium da Vitalissy.",
      priceCents: 1990,
      currency: "BRL",
      status: "ACTIVE",
      billingCycle: "MONTHLY",
      grantsPremium: true,
    },
    update: {},
  });

  console.log("Produto Premium verificado/criado.");
}

async function main() {
  await seedAdminUser();
  await seedAchievements();
  await seedProducts();
}

main()
  .catch((err) => {
    console.error("Falha ao rodar seed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
