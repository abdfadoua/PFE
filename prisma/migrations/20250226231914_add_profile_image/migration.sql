/*
  Warnings:

  - You are about to drop the column `twoFactorCode` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `twoFactorExpires` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "twoFactorCode",
DROP COLUMN "twoFactorExpires",
ADD COLUMN     "profileImage" TEXT DEFAULT '';
