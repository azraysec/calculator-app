-- Migration: Add Multi-Tenant Architecture
-- Description: Add DataSourceConnection model and enforce userId constraints
-- Date: 2026-01-31

-- ============================================================================
-- Step 1: Create new enums for DataSourceConnection
-- ============================================================================

CREATE TYPE "DataSourceType" AS ENUM ('LINKEDIN', 'FACEBOOK', 'EMAIL', 'TWITTER', 'GITHUB', 'CALENDAR');
CREATE TYPE "ConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR', 'PENDING');
CREATE TYPE "PrivacyLevel" AS ENUM ('PRIVATE', 'CONNECTIONS_ONLY', 'PUBLIC');

-- ============================================================================
-- Step 2: Create DataSourceConnection table
-- ============================================================================

CREATE TABLE "data_source_connections" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" "DataSourceType" NOT NULL,
    "connectionStatus" "ConnectionStatus" NOT NULL,
    "authData" TEXT,
    "metadata" JSONB,
    "privacyLevel" "PrivacyLevel" NOT NULL DEFAULT 'PRIVATE',
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "data_source_connections_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- Step 3: Create indexes for DataSourceConnection
-- ============================================================================

CREATE UNIQUE INDEX "data_source_connections_userId_sourceType_key" ON "data_source_connections"("userId", "sourceType");
CREATE INDEX "data_source_connections_userId_idx" ON "data_source_connections"("userId");
CREATE INDEX "data_source_connections_userId_sourceType_idx" ON "data_source_connections"("userId", "sourceType");
CREATE INDEX "data_source_connections_connectionStatus_idx" ON "data_source_connections"("connectionStatus");

-- ============================================================================
-- Step 4: Add foreign key constraint for DataSourceConnection
-- ============================================================================

ALTER TABLE "data_source_connections" ADD CONSTRAINT "data_source_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Step 5: Ensure all existing records have userId (safety check)
-- ============================================================================

DO $$
DECLARE
  v_user_id TEXT;
  v_persons_without_user INTEGER;
  v_evidence_without_user INTEGER;
  v_conversations_without_user INTEGER;
  v_messages_without_user INTEGER;
  v_ingest_jobs_without_user INTEGER;
BEGIN
  -- Get the first user ID
  SELECT id INTO v_user_id FROM users LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found in database. Cannot proceed with migration. Please create a user first.';
  END IF;

  -- Count and update records without userId
  SELECT COUNT(*) INTO v_persons_without_user FROM persons WHERE "userId" IS NULL;
  IF v_persons_without_user > 0 THEN
    UPDATE persons SET "userId" = v_user_id WHERE "userId" IS NULL;
    RAISE NOTICE 'Updated % persons records with userId', v_persons_without_user;
  END IF;

  SELECT COUNT(*) INTO v_evidence_without_user FROM evidence_events WHERE "userId" IS NULL;
  IF v_evidence_without_user > 0 THEN
    UPDATE evidence_events SET "userId" = v_user_id WHERE "userId" IS NULL;
    RAISE NOTICE 'Updated % evidence_events records with userId', v_evidence_without_user;
  END IF;

  SELECT COUNT(*) INTO v_conversations_without_user FROM conversations WHERE "userId" IS NULL;
  IF v_conversations_without_user > 0 THEN
    UPDATE conversations SET "userId" = v_user_id WHERE "userId" IS NULL;
    RAISE NOTICE 'Updated % conversations records with userId', v_conversations_without_user;
  END IF;

  SELECT COUNT(*) INTO v_messages_without_user FROM messages WHERE "userId" IS NULL;
  IF v_messages_without_user > 0 THEN
    UPDATE messages SET "userId" = v_user_id WHERE "userId" IS NULL;
    RAISE NOTICE 'Updated % messages records with userId', v_messages_without_user;
  END IF;

  SELECT COUNT(*) INTO v_ingest_jobs_without_user FROM ingest_jobs WHERE "userId" IS NULL;
  IF v_ingest_jobs_without_user > 0 THEN
    UPDATE ingest_jobs SET "userId" = v_user_id WHERE "userId" IS NULL;
    RAISE NOTICE 'Updated % ingest_jobs records with userId', v_ingest_jobs_without_user;
  END IF;

  RAISE NOTICE 'All existing records now have userId assigned';
END $$;

-- ============================================================================
-- Step 6: Make userId NOT NULL and change foreign key constraints
-- ============================================================================

-- Persons: Change from SET NULL to CASCADE delete
ALTER TABLE "persons" DROP CONSTRAINT IF EXISTS "persons_userId_fkey";
ALTER TABLE "persons" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "persons" ADD CONSTRAINT "persons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Evidence Events: Already has CASCADE, just make NOT NULL
ALTER TABLE "evidence_events" ALTER COLUMN "userId" SET NOT NULL;

-- Conversations: Already has CASCADE, just make NOT NULL
ALTER TABLE "conversations" ALTER COLUMN "userId" SET NOT NULL;

-- Messages: Already has CASCADE, just make NOT NULL
ALTER TABLE "messages" ALTER COLUMN "userId" SET NOT NULL;

-- Ingest Jobs: Already has CASCADE, just make NOT NULL
ALTER TABLE "ingest_jobs" ALTER COLUMN "userId" SET NOT NULL;

-- ============================================================================
-- Step 7: Add multi-tenant indexes for optimized queries (only if they don't exist)
-- ============================================================================

-- Person indexes (userId-specific queries)
CREATE INDEX IF NOT EXISTS "persons_userId_idx" ON "persons"("userId");
CREATE INDEX IF NOT EXISTS "persons_userId_emails_idx" ON "persons"("userId", "emails");
CREATE INDEX IF NOT EXISTS "persons_userId_phones_idx" ON "persons"("userId", "phones");

-- Ingest Jobs index (may already exist from previous migration)
CREATE INDEX IF NOT EXISTS "ingest_jobs_userId_createdAt_idx" ON "ingest_jobs"("userId", "createdAt");

-- ============================================================================
-- Migration complete
-- ============================================================================
