-- AlterTable: add snapshot columns as nullable first
ALTER TABLE "Booking"
ADD COLUMN "address" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION,
ADD COLUMN "maxGuests" INTEGER,
ADD COLUMN "nights" INTEGER,
ADD COLUMN "rooms" INTEGER,
ADD COLUMN "size" DOUBLE PRECISION,
ADD COLUMN "title" TEXT;

-- Backfill from related Apartment
UPDATE "Booking" AS b
SET
  "title" = a."title",
  "description" = a."description",
  "images" = a."images",
  "city" = a."city",
  "address" = a."address",
  "latitude" = a."latitude",
  "longitude" = a."longitude",
  "size" = a."size",
  "rooms" = a."rooms",
  "maxGuests" = a."maxGuests",
  "nights" = GREATEST(
    1,
    ROUND(EXTRACT(EPOCH FROM (b."endDate" - b."startDate")) / 86400)::INTEGER
  )
FROM "Apartment" AS a
WHERE b."apartmentId" = a."id";

-- Enforce NOT NULL after backfill
ALTER TABLE "Booking"
ALTER COLUMN "address" SET NOT NULL,
ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "latitude" SET NOT NULL,
ALTER COLUMN "longitude" SET NOT NULL,
ALTER COLUMN "maxGuests" SET NOT NULL,
ALTER COLUMN "nights" SET NOT NULL,
ALTER COLUMN "rooms" SET NOT NULL,
ALTER COLUMN "size" SET NOT NULL,
ALTER COLUMN "title" SET NOT NULL;
