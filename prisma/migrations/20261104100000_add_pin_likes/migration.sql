CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pinId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Like_userId_pinId_key" ON "Like"("userId", "pinId");
CREATE INDEX "Like_pinId_createdAt_id_idx" ON "Like"("pinId", "createdAt", "id");
CREATE INDEX "Like_userId_idx" ON "Like"("userId");

ALTER TABLE "Like"
ADD CONSTRAINT "Like_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Like"
ADD CONSTRAINT "Like_pinId_fkey"
FOREIGN KEY ("pinId") REFERENCES "Pin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
