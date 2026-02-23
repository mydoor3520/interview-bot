-- CreateTable
CREATE TABLE "ResumeEdit" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "targetPositionId" TEXT,
    "mode" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "overallScore" INTEGER,
    "overallFeedback" TEXT,
    "keywordMatch" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeEdit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResumeEdit_profileId_idx" ON "ResumeEdit"("profileId");

-- CreateIndex
CREATE INDEX "ResumeEdit_profileId_targetPositionId_idx" ON "ResumeEdit"("profileId", "targetPositionId");

-- CreateIndex
CREATE INDEX "ResumeEdit_targetPositionId_idx" ON "ResumeEdit"("targetPositionId");

-- AddForeignKey
ALTER TABLE "ResumeEdit" ADD CONSTRAINT "ResumeEdit_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeEdit" ADD CONSTRAINT "ResumeEdit_targetPositionId_fkey" FOREIGN KEY ("targetPositionId") REFERENCES "TargetPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
