/*
  Warnings:

  - You are about to drop the column `summaty` on the `AiReview` table. All the data in the column will be lost.
  - Added the required column `summary` to the `AiReview` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AiReview" DROP COLUMN "summaty",
ADD COLUMN     "summary" TEXT NOT NULL;
