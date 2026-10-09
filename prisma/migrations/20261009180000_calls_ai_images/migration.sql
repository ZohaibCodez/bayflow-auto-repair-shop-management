-- DropIndex
DROP INDEX "CallLog_shopId_idx";

-- AlterTable
ALTER TABLE "AiTask" ADD COLUMN     "doneAt" TIMESTAMP(3),
ADD COLUMN     "doneById" TEXT,
ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'Follow up with customer';

-- AlterTable
ALTER TABLE "CallLog" ADD COLUMN     "aiHandled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "answer" TEXT,
ADD COLUMN     "answeredAt" TIMESTAMP(3),
ADD COLUMN     "answeredById" TEXT,
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "offer" TEXT,
ADD COLUMN     "transcript" JSONB;

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "coverImage" TEXT;

-- CreateIndex
CREATE INDEX "CallLog_shopId_state_idx" ON "CallLog"("shopId", "state");

-- CreateIndex
CREATE INDEX "CallLog_toUserId_state_idx" ON "CallLog"("toUserId", "state");

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTask" ADD CONSTRAINT "AiTask_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

