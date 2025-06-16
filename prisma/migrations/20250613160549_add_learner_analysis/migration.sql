-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cluster" INTEGER;

-- CreateTable
CREATE TABLE "LearnerAnalysis" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "optimalK" INTEGER NOT NULL,
    "clusterSummary" TEXT NOT NULL,
    "graphs" TEXT NOT NULL,
    "detailedClusterSummary" TEXT,

    CONSTRAINT "LearnerAnalysis_pkey" PRIMARY KEY ("id")
);
