/*
  Warnings:

  - You are about to drop the column `profileImage` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,sessionId]` on the table `Emargement` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Emargement" ADD COLUMN     "isPresent" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "profileImage" TEXT,
ADD COLUMN     "validatedBy" INTEGER,
ADD COLUMN     "validationDate" TIMESTAMP(3),
ALTER COLUMN "signature" DROP NOT NULL,
ALTER COLUMN "emargementDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Formation" ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "profileImage",
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "country" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Emargement_userId_sessionId_key" ON "Emargement"("userId", "sessionId");

-- AddForeignKey
ALTER TABLE "Emargement" ADD CONSTRAINT "Emargement_validatedBy_fkey" FOREIGN KEY ("validatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
