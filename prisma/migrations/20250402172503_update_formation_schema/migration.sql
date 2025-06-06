/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Emargement` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Emargement` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Formation` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Formation` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - Added the required column `emargementDate` to the `Emargement` table without a default value. This is not possible if the table is not empty.
  - Made the column `signature` on table `Emargement` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `formateurId` to the `Formation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purchaseDate` to the `Purchase` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Emargement" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "emargementDate" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "signature" SET NOT NULL;

-- AlterTable
ALTER TABLE "Formation" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "formateurId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Purchase" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "purchaseDate" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ALTER COLUMN "phone" DROP DEFAULT,
ALTER COLUMN "city" DROP DEFAULT,
ALTER COLUMN "country" DROP DEFAULT;

-- DropEnum
DROP TYPE "Role";

-- AddForeignKey
ALTER TABLE "Formation" ADD CONSTRAINT "Formation_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
