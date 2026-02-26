-- Add performance indexes

-- TargetPosition: index on profileId for profile lookups
CREATE INDEX "TargetPosition_profileId_idx" ON "TargetPosition"("profileId");

-- WorkExperience: index on profileId for profile lookups
CREATE INDEX "WorkExperience_profileId_idx" ON "WorkExperience"("profileId");

-- Question: composite index for session + follow-up queries
CREATE INDEX "Question_sessionId_isFollowUp_idx" ON "Question"("sessionId", "isFollowUp");

-- Payment: index on externalId for Stripe webhook lookups
CREATE INDEX "Payment_externalId_idx" ON "Payment"("externalId");

-- Payment: composite index for status + date filtering
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- User: index on lastLoginAt for activity queries
CREATE INDEX "User_lastLoginAt_idx" ON "User"("lastLoginAt");

-- User: index on createdAt for signup analytics
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- User: remove redundant email index (already covered by unique constraint)
DROP INDEX IF EXISTS "User_email_idx";
