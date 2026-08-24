import { prisma } from "../lib/prisma.js";

interface LogAuditInput {
  actorUserId?: string | null;
  targetUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: unknown;
}

export async function logAudit(input: LogAuditInput) {
  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      targetUserId: input.targetUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      details: (input.details ?? {}) as any,
    },
  });
}
