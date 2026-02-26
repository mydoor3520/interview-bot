-- AlterTable
ALTER TABLE "User" ADD COLUMN "jobFunction" TEXT NOT NULL DEFAULT 'developer';

-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN "jobFunction" TEXT NOT NULL DEFAULT 'developer';

-- CreateIndex
CREATE INDEX "User_jobFunction_idx" ON "User"("jobFunction");

-- CreateIndex
CREATE INDEX "InterviewSession_jobFunction_idx" ON "InterviewSession"("jobFunction");
