ALTER TABLE "Follow"
ADD COLUMN "id" TEXT,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Follow"
SET "id" = gen_random_uuid()::text
WHERE "id" IS NULL;

ALTER TABLE "Follow"
ALTER COLUMN "id" SET NOT NULL;

CREATE UNIQUE INDEX "Follow_id_key" ON "Follow"("id");
CREATE INDEX "Follow_followerId_createdAt_id_idx"
ON "Follow"("followerId", "createdAt", "id");
CREATE INDEX "Follow_followingId_createdAt_id_idx"
ON "Follow"("followingId", "createdAt", "id");
