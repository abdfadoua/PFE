/*
  Warnings:

  - You are about to drop the column `createdAt` on the `emargements` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `emargements` table. All the data in the column will be lost.
  - You are about to drop the column `materialOrganization` on the `feedbacks` table. All the data in the column will be lost.
  - You are about to drop the column `premisesComfort` on the `feedbacks` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `feedbacks` table. All the data in the column will be lost.
  - You are about to drop the column `welcomeQuality` on the `feedbacks` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `formations` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `formations` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `sections` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `sections` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `sessions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "emargements" DROP CONSTRAINT "emargements_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "formations" DROP CONSTRAINT "formations_formateurId_fkey";

-- DropForeignKey
ALTER TABLE "history" DROP CONSTRAINT "history_actorId_fkey";

-- DropForeignKey
ALTER TABLE "history" DROP CONSTRAINT "history_requestId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_recipientId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_requestId_fkey";

-- DropForeignKey
ALTER TABLE "participant_requests" DROP CONSTRAINT "participant_requests_formationId_fkey";

-- DropForeignKey
ALTER TABLE "participant_requests" DROP CONSTRAINT "participant_requests_requestedById_fkey";

-- DropForeignKey
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_formationId_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_formationId_fkey";

-- DropForeignKey
ALTER TABLE "skill_validations" DROP CONSTRAINT "skill_validations_emargementId_fkey";

-- DropForeignKey
ALTER TABLE "skill_validations" DROP CONSTRAINT "skill_validations_userId_fkey";

-- DropIndex
DROP INDEX "emargements_userId_sessionId_idx";

-- DropIndex
DROP INDEX "feedbacks_userId_emargementId_idx";

-- DropIndex
DROP INDEX "formations_formateurId_idx";

-- DropIndex
DROP INDEX "history_actorId_idx";

-- DropIndex
DROP INDEX "notifications_recipientId_requestId_idx";

-- DropIndex
DROP INDEX "participant_requests_formationId_requestedById_idx";

-- DropIndex
DROP INDEX "purchases_userId_formationId_idx";

-- DropIndex
DROP INDEX "sections_formationId_idx";

-- DropIndex
DROP INDEX "sessions_formationId_idx";

-- DropIndex
DROP INDEX "skill_validations_userId_idx";

-- DropIndex
DROP INDEX "users_email_idx";

-- AlterTable
ALTER TABLE "emargements" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ALTER COLUMN "emargementDate" DROP NOT NULL,
ALTER COLUMN "emargementDate" DROP DEFAULT;

-- AlterTable
ALTER TABLE "feedbacks" DROP COLUMN "materialOrganization",
DROP COLUMN "premisesComfort",
DROP COLUMN "updatedAt",
DROP COLUMN "welcomeQuality",
ALTER COLUMN "clarity" DROP NOT NULL,
ALTER COLUMN "objectives" DROP NOT NULL,
ALTER COLUMN "level" DROP NOT NULL,
ALTER COLUMN "trainer" DROP NOT NULL,
ALTER COLUMN "materials" DROP NOT NULL;

-- AlterTable
ALTER TABLE "formations" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "participant_requests" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "purchases" ALTER COLUMN "purchaseDate" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sections" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AddForeignKey
ALTER TABLE "formations" ADD CONSTRAINT "formations_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "formations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "formations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emargements" ADD CONSTRAINT "emargements_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_requests" ADD CONSTRAINT "participant_requests_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "formations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_requests" ADD CONSTRAINT "participant_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "participant_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history" ADD CONSTRAINT "history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history" ADD CONSTRAINT "history_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "participant_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_validations" ADD CONSTRAINT "skill_validations_emargementId_fkey" FOREIGN KEY ("emargementId") REFERENCES "emargements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_validations" ADD CONSTRAINT "skill_validations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
