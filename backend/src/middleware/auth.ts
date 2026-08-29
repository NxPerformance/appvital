import type { NextFunction, Request, Response } from "express";
import { verifyJwt } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "./error-handler.js";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, SESSION_COOKIE_NAME } from "../lib/auth-cookies.js";
import type { UserRole } from "@prisma/client";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    if (!token) {
      throw new HttpError(401, "Nao autenticado");
    }

    const payload = verifyJwt(token);

    // Double-submit CSRF check on state-changing requests: the header must
    // echo the readable CSRF cookie set alongside the session at login. A
    // cross-site form post can carry the session cookie automatically but
    // can neither read the CSRF cookie nor set this header.
    if (UNSAFE_METHODS.has(req.method)) {
      const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];
      const csrfHeader = req.headers[CSRF_HEADER_NAME];
      if (!csrfCookie || !csrfHeader || csrfHeader !== csrfCookie) {
        throw new HttpError(403, "Token CSRF invalido");
      }
    }

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
  } catch (error) {
    if (error instanceof HttpError && error.status === 403) {
      res.status(403).json({ message: error.message });
      return;
    }
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
