-- CreateTable
CREATE TABLE "formateur_feedbacks" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "formationId" INTEGER NOT NULL,
    "homogeneity" INTEGER,
    "informationLevel" INTEGER,
    "groupLevel" INTEGER,
    "participantCount" INTEGER,
    "participation" INTEGER,
    "assimilation" INTEGER,
    "environment" INTEGER,
    "welcome" INTEGER,
    "technicalPlatforms" INTEGER,
    "adapted" BOOLEAN,
    "adaptationDetails" TEXT,
    "organizationRemarks" TEXT,
    "trainingImprovement" TEXT,
    "environmentImprovement" TEXT,
    "technicalImprovement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "formateur_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "formateur_feedbacks_userId_formationId_key" ON "formateur_feedbacks"("userId", "formationId");

-- AddForeignKey
ALTER TABLE "formateur_feedbacks" ADD CONSTRAINT "formateur_feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formateur_feedbacks" ADD CONSTRAINT "formateur_feedbacks_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
