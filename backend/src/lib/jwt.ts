import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export interface AuthTokenPayload {
  sub: string;
  email: string;
  roles: string[];
}

export function signToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}
