-- CreateEnum
CREATE TYPE "ChangelogSource" AS ENUM ('github_issue', 'user_request', 'internal', 'customer', 'system');

-- AlterTable
ALTER TABLE "changelog_entries" ADD COLUMN     "sourceType" "ChangelogSource" NOT NULL DEFAULT 'user_request',
ADD COLUMN     "sourceDetails" TEXT;

-- CreateIndex
CREATE INDEX "changelog_entries_sourceType_idx" ON "changelog_entries"("sourceType");

-- Data Migration: Set sourceType to 'github_issue' for entries with githubIssueNumber
UPDATE "changelog_entries"
SET "sourceType" = 'github_issue'::"ChangelogSource"
WHERE "githubIssueNumber" IS NOT NULL;
