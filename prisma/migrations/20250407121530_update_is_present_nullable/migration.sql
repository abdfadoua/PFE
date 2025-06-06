/*
  Warnings:

  - You are about to drop the column `profileImage` on the `Emargement` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Emargement" DROP COLUMN "profileImage",
ALTER COLUMN "isPresent" DROP NOT NULL,
ALTER COLUMN "isPresent" DROP DEFAULT;
