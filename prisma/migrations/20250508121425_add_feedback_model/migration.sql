-- CreateTable
CREATE TABLE "feedbacks" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "emargementId" INTEGER NOT NULL,
    "clarity" INTEGER,
    "objectives" INTEGER,
    "level" INTEGER,
    "trainer" INTEGER,
    "materials" INTEGER,
    "overall" INTEGER,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feedbacks_emargementId_key" ON "feedbacks"("emargementId");

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_emargementId_fkey" FOREIGN KEY ("emargementId") REFERENCES "emargements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
