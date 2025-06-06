-- CreateTable
CREATE TABLE "skill_validations" (
    "id" SERIAL NOT NULL,
    "emargementId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "skillsBeforeTraining" JSONB NOT NULL,
    "skillsAfterTraining" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_validations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skill_validations_emargementId_key" ON "skill_validations"("emargementId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_validations_emargementId_userId_key" ON "skill_validations"("emargementId", "userId");

-- AddForeignKey
ALTER TABLE "skill_validations" ADD CONSTRAINT "skill_validations_emargementId_fkey" FOREIGN KEY ("emargementId") REFERENCES "emargements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_validations" ADD CONSTRAINT "skill_validations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
