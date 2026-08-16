/*
  Warnings:

  - Added the required column `updatedAt` to the `AiReview` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AiReview" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
