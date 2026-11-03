CREATE TABLE "Follow" (
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId", "followingId")
);

CREATE TABLE "Pin" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Pin_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");
CREATE INDEX "Pin_ownerId_idx" ON "Pin"("ownerId");

ALTER TABLE "Follow"
ADD CONSTRAINT "Follow_followerId_fkey"
FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Follow"
ADD CONSTRAINT "Follow_followingId_fkey"
FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Pin"
ADD CONSTRAINT "Pin_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
