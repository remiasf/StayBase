-- CreateTable
CREATE TABLE "AiReview" (
    "id" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "priceFairness" TEXT NOT NULL,
    "pros" TEXT[],
    "consAndRisks" TEXT[],
    "questionsForLandlord" TEXT[],
    "summaty" TEXT NOT NULL,
    "apartmentId" TEXT NOT NULL,

    CONSTRAINT "AiReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiReview_apartmentId_key" ON "AiReview"("apartmentId");

-- AddForeignKey
ALTER TABLE "AiReview" ADD CONSTRAINT "AiReview_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
