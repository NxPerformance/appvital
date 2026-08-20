import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

interface AuditInput {
  actorUserId?: string | null;
  targetUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Prisma.InputJsonValue;
}

export async function logAudit(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      targetUserId: input.targetUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      details: input.details ?? {},
    },
  });
}
