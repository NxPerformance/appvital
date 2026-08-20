import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export async function markPaymentAsPaid(paymentId: string, providerPayload?: Prisma.InputJsonValue) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!payment) {
      throw new Error("Pagamento nao encontrado");
    }

    if (payment.status === PaymentStatus.PAID) {
      return payment;
    }

    const paidAt = new Date();

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        paidAt,
        rawProviderPayload: providerPayload,
      },
    });

    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        status: OrderStatus.PAID,
        paidAt,
      },
    });

    if (payment.order.items.some((item) => item.grantsPremium)) {
      await tx.profile.update({
        where: { userId: payment.userId },
        data: { isPremium: true },
      });
    }

    return updatedPayment;
  });
}
