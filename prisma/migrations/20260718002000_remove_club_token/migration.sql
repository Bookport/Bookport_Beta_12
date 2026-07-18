-- Drop unused club token fields from User
ALTER TABLE "User" DROP COLUMN IF EXISTS "clubToken";
ALTER TABLE "User" DROP COLUMN IF EXISTS "clubTokenExpiresAt";
