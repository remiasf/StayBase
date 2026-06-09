/*
  Warnings:

  - Added the required column `currency` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discountPercent` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `localPrice` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "currency" TEXT NOT NULL,
ADD COLUMN     "discountPercent" INTEGER NOT NULL,
ADD COLUMN     "localPrice" INTEGER NOT NULL;
