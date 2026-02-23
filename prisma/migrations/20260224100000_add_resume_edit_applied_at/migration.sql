-- AlterTable: Add appliedAt column
ALTER TABLE "ResumeEdit" ADD COLUMN "appliedAt" TIMESTAMP(3);

-- Backfill: Mark existing rows as already applied to prevent false-positive dialogs
UPDATE "ResumeEdit" SET "appliedAt" = "createdAt" WHERE "appliedAt" IS NULL;
