/*
  Warnings:

  - You are about to drop the column `overall` on the `feedbacks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "feedbacks" DROP COLUMN "overall",
ADD COLUMN     "globalRating" INTEGER;
