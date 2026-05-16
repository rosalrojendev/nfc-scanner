/*
  Warnings:

  - A unique constraint covering the columns `[clientId,userId]` on the table `Inspector` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Inspector` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Inspector_clientId_name_key";

-- AlterTable
ALTER TABLE "Inspector" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Inspector_userId_idx" ON "Inspector"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Inspector_clientId_userId_key" ON "Inspector"("clientId", "userId");

-- AddForeignKey
ALTER TABLE "Inspector" ADD CONSTRAINT "Inspector_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
