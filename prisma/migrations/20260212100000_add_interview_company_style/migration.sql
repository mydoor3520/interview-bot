-- Add company style and tech knowledge tracking to InterviewSession
ALTER TABLE "InterviewSession" ADD COLUMN "companyStyle" TEXT;
ALTER TABLE "InterviewSession" ADD COLUMN "techKnowledgeEnabled" BOOLEAN NOT NULL DEFAULT false;
