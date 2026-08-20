import type { NextFunction, Request, Response } from "express";
import { verifyJwt } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "./error-handler.js";
import type { UserRole } from "@prisma/client";

export interface AuthContext {
  userId: string;
  email: string;
  roles: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new HttpError(401, "Nao autenticado");
    }

    const token = header.slice("Bearer ".length);
    const payload = verifyJwt(token);

    const assignments = await prisma.userRoleAssignment.findMany({
      where: { userId: payload.sub },
      select: { role: true },
    });

    req.auth = {
      userId: payload.sub,
      email: payload.email,
      roles: assignments.map((assignment) => assignment.role),
    };

    next();
  } catch {
    res.status(401).json({ message: "Nao autenticado" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.auth?.roles.includes("ADMIN")) {
    res.status(403).json({ message: "Acesso restrito a administradores" });
    return;
  }
  next();
}

export function requireRole(role: UserRole, message = "Acesso restrito") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth?.roles.includes(role)) {
      res.status(403).json({ message });
      return;
    }
    next();
  };
}
