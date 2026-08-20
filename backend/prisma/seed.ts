import bcrypt from "bcryptjs";
import { BillingCycle, PrismaClient, ProductStatus, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const achievementSeed = [
    {
      name: "Mudanca de Vida",
      description: "Voce iniciou sua jornada de transformacao",
      icon: "🌟",
      sortOrder: 1,
    },
    {
      name: "Primeiro Treino",
      description: "Completou seu primeiro treino",
      icon: "💪",
      sortOrder: 2,
    },
  ];

  for (const achievement of achievementSeed) {
    await prisma.achievement.upsert({
      where: { name: achievement.name },
      update: achievement,
      create: achievement,
    });
  }

  await prisma.product.upsert({
    where: { slug: "vitalissy-premium-monthly" },
    update: {
      name: "Vitalissy Premium",
      description: "Acesso mensal aos recursos Premium da plataforma Vitalissy.",
      priceCents: 1990,
      currency: "BRL",
      status: ProductStatus.ACTIVE,
      billingCycle: BillingCycle.MONTHLY,
      grantsPremium: true,
      metadata: {
        features: ["body_progress", "injectables", "priority_support", "premium_content"],
      },
    },
    create: {
      slug: "vitalissy-premium-monthly",
      name: "Vitalissy Premium",
      description: "Acesso mensal aos recursos Premium da plataforma Vitalissy.",
      priceCents: 1990,
      currency: "BRL",
      status: ProductStatus.ACTIVE,
      billingCycle: BillingCycle.MONTHLY,
      grantsPremium: true,
      metadata: {
        features: ["body_progress", "injectables", "priority_support", "premium_content"],
      },
    },
  });

  const adminEmail = "erykdeveloper@gmail.com";
  const adminPassword = "Admin123456";

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        profile: {
          create: {
            fullName: "Eryk Admin",
            age: 30,
            heightCm: 175,
            weightKg: "75",
          },
        },
      },
    });

    await prisma.userRoleAssignment.create({
      data: {
        userId: admin.id,
        role: UserRole.ADMIN,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
