-- Phase F: Add admin workflow fields to BetaFeedback
ALTER TABLE "BetaFeedback" ADD COLUMN "status" TEXT;
ALTER TABLE "BetaFeedback" ADD COLUMN "adminNote" TEXT;
ALTER TABLE "BetaFeedback" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "BetaFeedback" ADD COLUMN "resolvedBy" TEXT;

CREATE INDEX "BetaFeedback_status_idx" ON "BetaFeedback"("status");

-- Phase G: Add Announcement system
CREATE TYPE "AnnouncementTarget" AS ENUM ('ALL', 'FREE', 'PRO');
CREATE TYPE "AnnouncementDisplayType" AS ENUM ('BANNER', 'POPUP');

CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "target" "AnnouncementTarget" NOT NULL DEFAULT 'ALL',
    "displayType" "AnnouncementDisplayType" NOT NULL DEFAULT 'BANNER',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Announcement_deletedAt_startsAt_endsAt_idx" ON "Announcement"("deletedAt", "startsAt", "endsAt");
CREATE INDEX "Announcement_target_idx" ON "Announcement"("target");
