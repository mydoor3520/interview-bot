-- CreateTable
CREATE TABLE "ResumeDocument" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "targetPositionId" TEXT,
    "resumeEditId" TEXT,
    "template" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ko',
    "appliedKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reorderedCareers" JSONB,
    "content" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'generated',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResumeDocument_profileId_idx" ON "ResumeDocument"("profileId");

-- CreateIndex
CREATE INDEX "ResumeDocument_targetPositionId_idx" ON "ResumeDocument"("targetPositionId");

-- CreateIndex
CREATE INDEX "ResumeDocument_profileId_createdAt_idx" ON "ResumeDocument"("profileId", "createdAt");

-- AddForeignKey
ALTER TABLE "ResumeDocument" ADD CONSTRAINT "ResumeDocument_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeDocument" ADD CONSTRAINT "ResumeDocument_targetPositionId_fkey" FOREIGN KEY ("targetPositionId") REFERENCES "TargetPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeDocument" ADD CONSTRAINT "ResumeDocument_resumeEditId_fkey" FOREIGN KEY ("resumeEditId") REFERENCES "ResumeEdit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
