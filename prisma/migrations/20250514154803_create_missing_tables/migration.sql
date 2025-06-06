/*
  Warnings:

  - Made the column `emargementDate` on table `emargements` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `materialOrganization` to the `feedbacks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `premisesComfort` to the `feedbacks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `welcomeQuality` to the `feedbacks` table without a default value. This is not possible if the table is not empty.
  - Made the column `clarity` on table `feedbacks` required. This step will fail if there are existing NULL values in that column.
  - Made the column `objectives` on table `feedbacks` required. This step will fail if there are existing NULL values in that column.
  - Made the column `level` on table `feedbacks` required. This step will fail if there are existing NULL values in that column.
  - Made the column `trainer` on table `feedbacks` required. This step will fail if there are existing NULL values in that column.
  - Made the column `materials` on table `feedbacks` required. This step will fail if there are existing NULL values in that column.

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

-- AlterTable
ALTER TABLE "emargements" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "emargementDate" SET NOT NULL,
ALTER COLUMN "emargementDate" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "feedbacks" ADD COLUMN     "materialOrganization" INTEGER NOT NULL,
ADD COLUMN     "premisesComfort" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "welcomeQuality" INTEGER NOT NULL,
ALTER COLUMN "clarity" SET NOT NULL,
ALTER COLUMN "objectives" SET NOT NULL,
ALTER COLUMN "level" SET NOT NULL,
ALTER COLUMN "trainer" SET NOT NULL,
ALTER COLUMN "materials" SET NOT NULL;

-- AlterTable
ALTER TABLE "formations" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "participant_requests" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "purchases" ALTER COLUMN "purchaseDate" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "sections" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "formationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sections_formationId_idx" ON "sections"("formationId");

-- CreateIndex
CREATE INDEX "emargements_userId_sessionId_idx" ON "emargements"("userId", "sessionId");

-- CreateIndex
CREATE INDEX "feedbacks_userId_emargementId_idx" ON "feedbacks"("userId", "emargementId");

-- CreateIndex
CREATE INDEX "formations_formateurId_idx" ON "formations"("formateurId");

-- CreateIndex
CREATE INDEX "history_actorId_idx" ON "history"("actorId");

-- CreateIndex
CREATE INDEX "notifications_recipientId_requestId_idx" ON "notifications"("recipientId", "requestId");

-- CreateIndex
CREATE INDEX "participant_requests_formationId_requestedById_idx" ON "participant_requests"("formationId", "requestedById");

-- CreateIndex
CREATE INDEX "purchases_userId_formationId_idx" ON "purchases"("userId", "formationId");

-- CreateIndex
CREATE INDEX "sessions_formationId_idx" ON "sessions"("formationId");

-- CreateIndex
CREATE INDEX "skill_validations_userId_idx" ON "skill_validations"("userId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- AddForeignKey
ALTER TABLE "formations" ADD CONSTRAINT "formations_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emargements" ADD CONSTRAINT "emargements_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_requests" ADD CONSTRAINT "participant_requests_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_requests" ADD CONSTRAINT "participant_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "participant_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history" ADD CONSTRAINT "history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history" ADD CONSTRAINT "history_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "participant_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_validations" ADD CONSTRAINT "skill_validations_emargementId_fkey" FOREIGN KEY ("emargementId") REFERENCES "emargements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_validations" ADD CONSTRAINT "skill_validations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
