-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('linkedin_connection', 'linkedin_message_sent', 'linkedin_message_received', 'linkedin_post_authored', 'linkedin_invitation_sent', 'linkedin_invitation_received', 'linkedin_comment_authored', 'linkedin_reaction', 'email_sent', 'email_received', 'calendar_meeting', 'phone_call', 'human_confirmed_connection', 'manual_note');

-- CreateEnum
CREATE TYPE "IngestJobStatus" AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');

-- AlterTable
ALTER TABLE "edges" ADD COLUMN     "topEvidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "evidence_events" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subjectPersonId" TEXT NOT NULL,
    "objectPersonId" TEXT,
    "type" "EvidenceType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "rawRef" JSONB,
    "metadata" JSONB,

    CONSTRAINT "evidence_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "participants" TEXT[],
    "metadata" JSONB,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "content" TEXT,
    "metadata" JSONB,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest_jobs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "status" "IngestJobStatus" NOT NULL DEFAULT 'queued',
    "fileMetadata" JSONB,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "resultMetadata" JSONB,
    "logs" TEXT,

    CONSTRAINT "ingest_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evidence_events_subjectPersonId_timestamp_idx" ON "evidence_events"("subjectPersonId", "timestamp");

-- CreateIndex
CREATE INDEX "evidence_events_objectPersonId_timestamp_idx" ON "evidence_events"("objectPersonId", "timestamp");

-- CreateIndex
CREATE INDEX "evidence_events_type_timestamp_idx" ON "evidence_events"("type", "timestamp");

-- CreateIndex
CREATE INDEX "evidence_events_source_idx" ON "evidence_events"("source");

-- CreateIndex
CREATE INDEX "conversations_sourceName_externalId_idx" ON "conversations"("sourceName", "externalId");

-- CreateIndex
CREATE INDEX "conversations_participants_idx" ON "conversations"("participants");

-- CreateIndex
CREATE INDEX "messages_conversationId_timestamp_idx" ON "messages"("conversationId", "timestamp");

-- CreateIndex
CREATE INDEX "messages_senderId_timestamp_idx" ON "messages"("senderId", "timestamp");

-- CreateIndex
CREATE INDEX "ingest_jobs_userId_createdAt_idx" ON "ingest_jobs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ingest_jobs_status_idx" ON "ingest_jobs"("status");

-- CreateIndex
CREATE INDEX "ingest_jobs_sourceName_idx" ON "ingest_jobs"("sourceName");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
