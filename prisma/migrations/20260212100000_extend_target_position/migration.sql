-- AlterTable: Add extended fields to TargetPosition
ALTER TABLE "TargetPosition" ADD COLUMN "salaryRange" TEXT;
ALTER TABLE "TargetPosition" ADD COLUMN "location" TEXT;
ALTER TABLE "TargetPosition" ADD COLUMN "employmentType" TEXT;
ALTER TABLE "TargetPosition" ADD COLUMN "deadline" TEXT;
ALTER TABLE "TargetPosition" ADD COLUMN "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "TargetPosition" ADD COLUMN "companySize" TEXT;
ALTER TABLE "TargetPosition" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "TargetPosition" ADD COLUMN "sourceSite" TEXT;
ALTER TABLE "TargetPosition" ADD COLUMN "lastFetched" TIMESTAMP(3);
ALTER TABLE "TargetPosition" ADD COLUMN "techStack" TEXT[] DEFAULT ARRAY[]::TEXT[];
