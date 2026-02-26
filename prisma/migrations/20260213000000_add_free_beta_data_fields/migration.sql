-- Add data collection fields to InterviewSession
ALTER TABLE "InterviewSession" ADD COLUMN "userRating" INTEGER;
ALTER TABLE "InterviewSession" ADD COLUMN "mostHelpfulQuestionId" TEXT;
ALTER TABLE "InterviewSession" ADD COLUMN "sessionDurationSec" INTEGER;

-- Add free beta tracking fields to User
ALTER TABLE "User" ADD COLUMN "signupSource" TEXT;
ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN "referredByUserId" TEXT;
ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "aiDataConsent" BOOLEAN NOT NULL DEFAULT false;

-- Unique constraint on referralCode
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
