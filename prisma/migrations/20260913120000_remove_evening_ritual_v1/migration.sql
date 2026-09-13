-- Drop EveningRitual table and User.ritualTime column (legacy v1)
DROP TABLE IF EXISTS "EveningRitual";
ALTER TABLE "User" DROP COLUMN IF EXISTS "ritualTime";
