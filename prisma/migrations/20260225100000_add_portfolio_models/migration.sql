-- CreateTable
CREATE TABLE "PortfolioProject" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "teamSize" INTEGER,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "techStack" TEXT[],
    "achievements" TEXT[],
    "troubleshooting" TEXT,
    "githubUrl" TEXT,
    "demoUrl" TEXT,
    "category" TEXT NOT NULL DEFAULT 'personal',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioGuide" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "targetPositionId" TEXT,
    "strategy" JSONB NOT NULL,
    "overallScore" INTEGER,
    "overallFeedback" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioGuide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortfolioProject_profileId_idx" ON "PortfolioProject"("profileId");

-- CreateIndex
CREATE INDEX "PortfolioGuide_profileId_idx" ON "PortfolioGuide"("profileId");
CREATE INDEX "PortfolioGuide_profileId_targetPositionId_idx" ON "PortfolioGuide"("profileId", "targetPositionId");
CREATE INDEX "PortfolioGuide_targetPositionId_idx" ON "PortfolioGuide"("targetPositionId");

-- AddForeignKey
ALTER TABLE "PortfolioProject" ADD CONSTRAINT "PortfolioProject_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioGuide" ADD CONSTRAINT "PortfolioGuide_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PortfolioGuide" ADD CONSTRAINT "PortfolioGuide_targetPositionId_fkey" FOREIGN KEY ("targetPositionId") REFERENCES "TargetPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
