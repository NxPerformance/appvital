import type { NextFunction, Request, Response } from "express";
import { verifyJwt } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "./error-handler.js";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, SESSION_COOKIE_NAME } from "../lib/auth-cookies.js";
import { corsOrigins } from "../config/env.js";
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

    // Look the user up by id rather than trusting the JWT payload alone, so
    // a deleted account's still-valid (unexpired) token stops working
    // immediately instead of staying "authenticated" with an empty role set.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, roles: { select: { role: true } } },
    });

    if (!user) {
      throw new HttpError(401, "Nao autenticado");
    }

    req.auth = {
      userId: user.id,
      email: payload.email,
      roles: user.roles.map((assignment) => assignment.role),
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

function originFromHeader(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

// Login/register issue a fresh session cookie before the double-submit CSRF
// cookie exists, so requireAuth's check can't cover them. A cross-site HTML
// form can still POST here (it doesn't need to read anything to submit
// credentials or trigger a login), and the browser honors whatever
// Set-Cookie the response carries regardless of who made the request. This
// checks the request actually came from our own frontend origin - the only
// signal available before a session exists - falling back to Referer when a
// browser omits Origin on same-origin requests, and allowing requests with
// neither header rather than breaking non-browser API clients.
export function requireTrustedOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = originFromHeader(req.headers.origin) ?? originFromHeader(req.headers.referer);
  if (origin && !corsOrigins.includes(origin)) {
    res.status(403).json({ message: "Origem da requisicao nao permitida" });
    return;
  }
  next();
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
