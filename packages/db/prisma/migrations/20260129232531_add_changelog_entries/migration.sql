-- CreateEnum
CREATE TYPE "ChangelogPriority" AS ENUM ('critical', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "ChangelogStatus" AS ENUM ('planned', 'in_progress', 'in_review', 'done', 'blocked', 'on_hold');

-- CreateTable
CREATE TABLE "changelog_entries" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entryId" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "priority" "ChangelogPriority" NOT NULL,
    "status" "ChangelogStatus" NOT NULL DEFAULT 'planned',
    "category" TEXT NOT NULL,
    "notes" TEXT,
    "dateAdded" TIMESTAMP(3) NOT NULL,
    "dateStarted" TIMESTAMP(3),
    "dateCompleted" TIMESTAMP(3),
    "version" TEXT,
    "githubIssueNumber" INTEGER,
    "githubIssueUrl" TEXT,

    CONSTRAINT "changelog_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "changelog_entries_entryId_key" ON "changelog_entries"("entryId");

-- CreateIndex
CREATE INDEX "changelog_entries_status_idx" ON "changelog_entries"("status");

-- CreateIndex
CREATE INDEX "changelog_entries_priority_idx" ON "changelog_entries"("priority");

-- CreateIndex
CREATE INDEX "changelog_entries_dateAdded_idx" ON "changelog_entries"("dateAdded");

-- CreateIndex
CREATE INDEX "changelog_entries_githubIssueNumber_idx" ON "changelog_entries"("githubIssueNumber");
