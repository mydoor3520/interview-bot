-- AlterTable: Add new fields to TargetPosition
ALTER TABLE "TargetPosition" ADD COLUMN "preferredQualifications" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "TargetPosition" ADD COLUMN "requiredExperience" TEXT;

-- CreateTable: GeneratedQuestion
CREATE TABLE "GeneratedQuestion" (
    "id" TEXT NOT NULL,
    "targetPositionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "reasoning" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeneratedQuestion_targetPositionId_idx" ON "GeneratedQuestion"("targetPositionId");

-- AddForeignKey
ALTER TABLE "GeneratedQuestion" ADD CONSTRAINT "GeneratedQuestion_targetPositionId_fkey" FOREIGN KEY ("targetPositionId") REFERENCES "TargetPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
