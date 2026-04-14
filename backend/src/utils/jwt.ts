import jwt from "jsonwebtoken";
import { config } from "../config.js";

const TTL = "12h";

export type TokenUser = { id: string; role: "admin" | "user"; email: string };

export function signAccessToken(user: TokenUser): string {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    config.jwtSecret,
    { expiresIn: TTL }
  );
}

export function verifyAccessToken(token: string): TokenUser | null {
  try {
    const p = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload & {
      sub: string;
      role: "admin" | "user";
      email: string;
    };
    if (!p.sub || !p.role || !p.email) return null;
    return { id: p.sub, role: p.role, email: p.email };
  } catch {
    return null;
  }
}
