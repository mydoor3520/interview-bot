-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifyToken" TEXT,
    "emailVerifyTokenExpiry" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpiry" TIMESTAMP(3),
    "oauthProvider" TEXT,
    "oauthProviderId" TEXT,
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "subscriptionId" TEXT,
    "monthlySessionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_subscriptionTier_idx" ON "User"("subscriptionTier");

-- CreateIndex
CREATE UNIQUE INDEX "User_oauthProvider_oauthProviderId_key" ON "User"("oauthProvider", "oauthProviderId");

-- AlterTable: Add userId columns (nullable for migration)
ALTER TABLE "UserProfile" ADD COLUMN "userId" TEXT;
ALTER TABLE "InterviewSession" ADD COLUMN "userId" TEXT;
ALTER TABLE "AIUsageLog" ADD COLUMN "userId" TEXT;
ALTER TABLE "LoginAttempt" ADD COLUMN "userId" TEXT;

-- Data Migration: Create initial User from existing UserProfile
INSERT INTO "User" ("id", "email", "name", "updatedAt")
SELECT
  'legacy-user-' || gen_random_uuid()::text,
  COALESCE("email", 'legacy@placeholder.com'),
  "name",
  NOW()
FROM "UserProfile"
LIMIT 1;

-- Data Migration: Link existing records to the initial User
UPDATE "UserProfile" SET "userId" = (SELECT "id" FROM "User" LIMIT 1)
WHERE "userId" IS NULL;

UPDATE "InterviewSession" SET "userId" = (SELECT "id" FROM "User" LIMIT 1)
WHERE "userId" IS NULL;

UPDATE "AIUsageLog" SET "userId" = (SELECT "id" FROM "User" LIMIT 1)
WHERE "userId" IS NULL;

-- CreateIndex (after data migration)
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");
CREATE INDEX "InterviewSession_userId_startedAt_idx" ON "InterviewSession"("userId", "startedAt");
CREATE INDEX "AIUsageLog_userId_idx" ON "AIUsageLog"("userId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
