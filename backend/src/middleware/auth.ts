import type { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { verifyToken } from "../lib/jwt.js";

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    email: string;
    roles: UserRole[];
  };
  file?: Express.Multer.File;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token ausente" });
  }

  try {
    const token = header.replace("Bearer ", "");
    const payload = verifyToken(token);
    const roles = await prisma.userRoleAssignment.findMany({
      where: { userId: payload.sub },
      select: { role: true },
    });

    req.auth = {
      userId: payload.sub,
      email: payload.email,
      roles: roles.map((entry) => entry.role),
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Token invalido" });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.auth?.roles.includes(UserRole.ADMIN)) {
    return res.status(403).json({ message: "Acesso restrito a administradores" });
  }

  return next();
}

export function requireRole(role: UserRole, message?: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth?.roles.includes(role)) {
      return res.status(403).json({ message: message ?? "Acesso restrito" });
    }

    return next();
  };
}
