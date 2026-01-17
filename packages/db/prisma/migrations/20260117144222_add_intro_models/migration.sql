-- CreateEnum
CREATE TYPE "IntroStatus" AS ENUM ('draft', 'sent', 'responded', 'completed', 'declined');

-- CreateEnum
CREATE TYPE "IntroOutcome" AS ENUM ('meeting_scheduled', 'intro_made', 'declined', 'no_response');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('generated', 'selected', 'sent', 'discarded');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('follow_up', 'reminder', 'outreach');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('pending', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "intro_attempts" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fromPersonId" TEXT NOT NULL,
    "targetPersonId" TEXT NOT NULL,
    "introducerId" TEXT NOT NULL,
    "pathSnapshot" JSONB NOT NULL,
    "message" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" "IntroStatus" NOT NULL DEFAULT 'draft',
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "outcome" "IntroOutcome",

    CONSTRAINT "intro_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drafts" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "introAttemptId" TEXT,
    "targetPersonId" TEXT NOT NULL,
    "introducerId" TEXT,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "tone" TEXT,
    "generatedBy" TEXT NOT NULL,
    "model" TEXT,
    "status" "DraftStatus" NOT NULL DEFAULT 'generated',
    "selectedAt" TIMESTAMP(3),

    CONSTRAINT "drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "TaskType" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'pending',
    "priority" "TaskPriority" NOT NULL DEFAULT 'medium',
    "relatedPersonId" TEXT,
    "introAttemptId" TEXT,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "intro_attempts_fromPersonId_idx" ON "intro_attempts"("fromPersonId");

-- CreateIndex
CREATE INDEX "intro_attempts_targetPersonId_idx" ON "intro_attempts"("targetPersonId");

-- CreateIndex
CREATE INDEX "intro_attempts_status_idx" ON "intro_attempts"("status");

-- CreateIndex
CREATE INDEX "intro_attempts_createdAt_idx" ON "intro_attempts"("createdAt");

-- CreateIndex
CREATE INDEX "drafts_targetPersonId_idx" ON "drafts"("targetPersonId");

-- CreateIndex
CREATE INDEX "drafts_status_idx" ON "drafts"("status");

-- CreateIndex
CREATE INDEX "tasks_status_dueAt_idx" ON "tasks"("status", "dueAt");

-- CreateIndex
CREATE INDEX "tasks_relatedPersonId_idx" ON "tasks"("relatedPersonId");

-- AddForeignKey
ALTER TABLE "intro_attempts" ADD CONSTRAINT "intro_attempts_fromPersonId_fkey" FOREIGN KEY ("fromPersonId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intro_attempts" ADD CONSTRAINT "intro_attempts_targetPersonId_fkey" FOREIGN KEY ("targetPersonId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intro_attempts" ADD CONSTRAINT "intro_attempts_introducerId_fkey" FOREIGN KEY ("introducerId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_relatedPersonId_fkey" FOREIGN KEY ("relatedPersonId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
