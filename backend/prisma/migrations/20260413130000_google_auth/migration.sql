-- Allow password-less accounts for OAuth
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- Store Google user ID for OAuth sign-in
ALTER TABLE "users" ADD COLUMN "google_id" TEXT;

CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
