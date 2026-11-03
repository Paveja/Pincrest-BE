CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PinBoard" (
    "id" TEXT NOT NULL,
    "pinId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "savedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PinBoard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PinBoard_pinId_boardId_key" ON "PinBoard"("pinId", "boardId");
CREATE INDEX "Board_ownerId_idx" ON "Board"("ownerId");
CREATE INDEX "PinBoard_boardId_createdAt_id_idx" ON "PinBoard"("boardId", "createdAt", "id");
CREATE INDEX "PinBoard_savedByUserId_idx" ON "PinBoard"("savedByUserId");

ALTER TABLE "Board"
ADD CONSTRAINT "Board_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PinBoard"
ADD CONSTRAINT "PinBoard_pinId_fkey"
FOREIGN KEY ("pinId") REFERENCES "Pin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PinBoard"
ADD CONSTRAINT "PinBoard_boardId_fkey"
FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PinBoard"
ADD CONSTRAINT "PinBoard_savedByUserId_fkey"
FOREIGN KEY ("savedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
