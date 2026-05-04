/*
  Warnings:

  - The primary key for the `Apartment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Booking` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `address` to the `Apartment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `city` to the `Apartment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `Apartment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxGuests` to the `Apartment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Apartment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'UNPAID');

-- DropForeignKey
ALTER TABLE "Apartment" DROP CONSTRAINT "Apartment_userId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_apartmentId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_userId_fkey";

-- AlterTable
ALTER TABLE "Apartment" DROP CONSTRAINT "Apartment_pkey",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "maxGuests" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Apartment_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Apartment_id_seq";

-- AlterTable
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "apartmentId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Booking_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Booking_id_seq";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- CreateTable
CREATE TABLE "Amenity" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AmenityToApartment" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AmenityToApartment_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_name_key" ON "Amenity"("name");

-- CreateIndex
CREATE INDEX "_AmenityToApartment_B_index" ON "_AmenityToApartment"("B");

-- AddForeignKey
ALTER TABLE "Apartment" ADD CONSTRAINT "Apartment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AmenityToApartment" ADD CONSTRAINT "_AmenityToApartment_A_fkey" FOREIGN KEY ("A") REFERENCES "Amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AmenityToApartment" ADD CONSTRAINT "_AmenityToApartment_B_fkey" FOREIGN KEY ("B") REFERENCES "Apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
