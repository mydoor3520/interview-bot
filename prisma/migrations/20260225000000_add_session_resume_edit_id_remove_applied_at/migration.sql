-- AlterTable: Add resumeEditId to InterviewSession
ALTER TABLE "InterviewSession" ADD COLUMN "resumeEditId" TEXT;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_resumeEditId_fkey" FOREIGN KEY ("resumeEditId") REFERENCES "ResumeEdit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "InterviewSession_resumeEditId_idx" ON "InterviewSession"("resumeEditId");

-- AlterTable: Remove appliedAt from ResumeEdit
ALTER TABLE "ResumeEdit" DROP COLUMN IF EXISTS "appliedAt";
