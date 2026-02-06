-- DropIndex
DROP INDEX "Question_sessionId_orderIndex_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Question_sessionId_orderIndex_key" ON "Question"("sessionId", "orderIndex");
