import crypto from "node:crypto";
import type { Response } from "express";
import { env } from "../config/env.js";

export const SESSION_COOKIE_NAME = "vitalissy_session";
export const CSRF_COOKIE_NAME = "vitalissy_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

const DURATION_UNITS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

// Parses the simple duration strings jsonwebtoken's `expiresIn` already
// accepts (e.g. "7d", "12h") into milliseconds, so the cookie's maxAge stays
// in sync with the JWT's own expiry without a new dependency just for that.
export function parseDurationMs(value: string, fallbackMs: number): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = DURATION_UNITS[match[2]];
  return amount * unit;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeMs,
  };
}

export function setAuthCookies(res: Response, token: string): void {
  const maxAgeMs = parseDurationMs(env.JWT_EXPIRES_IN, SEVEN_DAYS_MS);

  res.cookie(SESSION_COOKIE_NAME, token, cookieOptions(maxAgeMs));

  // Double-submit CSRF token: readable by frontend JS (not httpOnly) so it
  // can be echoed back as the X-CSRF-Token header on mutating requests.
  // A cross-site request forged via a plain HTML form can't read this
  // cookie or set a custom header, so a mismatch means the request didn't
  // originate from our own frontend.
  const csrfToken = crypto.randomBytes(32).toString("hex");
  res.cookie(CSRF_COOKIE_NAME, csrfToken, { ...cookieOptions(maxAgeMs), httpOnly: false });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
  res.clearCookie(CSRF_COOKIE_NAME, { path: "/" });
}
