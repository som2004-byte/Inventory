import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

// Always load env from backend/.env regardless of current working directory.
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

/** Strip optional surrounding quotes from .env values (some editors add them). */
function rawEnv(name: string): string | undefined {
  const v = process.env[name]?.trim();
  if (!v) return undefined;
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

/**
 * This app supports PostgreSQL only (see prisma/schema.prisma).
 * Call before creating the Express app so misconfiguration fails immediately.
 */
export function assertPostgresDatabaseUrl(): void {
  const url = rawEnv("DATABASE_URL");
  if (!url) {
    console.error(
      "[config] DATABASE_URL is missing.\n" +
        "  Add it to backend/.env — example:\n" +
        '  DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/inventory?schema=public"\n' +
        "  Create database `inventory` in PostgreSQL first, then run: npx prisma migrate deploy"
    );
    process.exit(1);
  }
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    console.error(
      "[config] Invalid DATABASE_URL: this project uses PostgreSQL only.\n" +
        "  URL must start with postgresql:// or postgres://\n" +
        "  Current value begins with: " +
        JSON.stringify(url.slice(0, 24))
    );
    process.exit(1);
  }
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me",
  webOrigin: process.env.WEB_ORIGIN || "http://localhost:5173",
  /** When set, forecast POST proxies to FastAPI at this base URL (e.g. http://localhost:8001). */
  mlServiceUrl: (process.env.ML_SERVICE_URL || "").replace(/\/$/, ""),
  mlInternalKey: process.env.ML_INTERNAL_KEY || "dev-ml-key-change-me",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  openaiBaseUrl: process.env.OPENAI_BASE_URL || undefined,
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
};
