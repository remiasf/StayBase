/*
  Warnings:

  - You are about to drop the column `discountPrice` on the `Apartment` table. All the data in the column will be lost.
  - Added the required column `currency` to the `Apartment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Apartment" DROP COLUMN "discountPrice",
ADD COLUMN     "currency" TEXT NOT NULL,
ADD COLUMN     "discountPercent" INTEGER DEFAULT 0,
ADD COLUMN     "priceUsd" INTEGER;
