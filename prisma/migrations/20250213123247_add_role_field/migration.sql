-- CreateEnum
CREATE TYPE "Role" AS ENUM ('apprenant', 'formateur', 'admin');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'apprenant';
