-- AlterTable
ALTER TABLE "Anchor" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "deletedByName" TEXT;

-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "deletedByName" TEXT;

-- CreateIndex
CREATE INDEX "Anchor_deletedAt_idx" ON "Anchor"("deletedAt");

-- CreateIndex
CREATE INDEX "Inspection_deletedAt_idx" ON "Inspection"("deletedAt");
