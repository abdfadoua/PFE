-- AlterTable
ALTER TABLE "feedbacks" ADD COLUMN     "materialOrganization" INTEGER,
ADD COLUMN     "premisesComfort" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "welcomeQuality" INTEGER;
