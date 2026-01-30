-- Step 1: Create new tables first (without foreign keys to existing tables)
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "personId" TEXT,
    "googleRefreshToken" TEXT,
    "googleAccessToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "lastGmailSyncAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- Step 2: Create indexes for new tables
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_personId_key" ON "users"("personId");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- Step 3: Data Migration - Create default user from Person with isMe flag
DO $$
DECLARE
  v_person_id TEXT;
  v_person_email TEXT;
  v_person_name TEXT;
  v_user_id TEXT;
BEGIN
  -- Find the person marked as "me" (single-user mode)
  SELECT id,
         COALESCE(emails[1], 'user@example.com'),
         COALESCE(names[1], 'User')
  INTO v_person_id, v_person_email, v_person_name
  FROM persons
  WHERE metadata->>'isMe' = 'true'
  LIMIT 1;

  -- If no "isMe" person found, try to find any person with an email
  IF v_person_id IS NULL THEN
    SELECT id,
           COALESCE(emails[1], 'user@example.com'),
           COALESCE(names[1], 'User')
    INTO v_person_id, v_person_email, v_person_name
    FROM persons
    WHERE emails IS NOT NULL AND array_length(emails, 1) > 0
    LIMIT 1;
  END IF;

  -- Create the user account
  IF v_person_id IS NOT NULL THEN
    INSERT INTO users (id, email, name, "personId", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), v_person_email, v_person_name, v_person_id, NOW(), NOW())
    RETURNING id INTO v_user_id;

    RAISE NOTICE 'Created user % (%) linked to person %', v_user_id, v_person_email, v_person_id;

    -- Update existing IngestJob records with userId="me" or NULL
    UPDATE "ingest_jobs"
    SET "userId" = v_user_id
    WHERE "userId" IS NULL OR "userId" = 'me';

    RAISE NOTICE 'Updated ingest_jobs for user %', v_user_id;

    -- Clean up the isMe flag from metadata
    UPDATE persons
    SET metadata = metadata - 'isMe'
    WHERE metadata->>'isMe' = 'true';

    RAISE NOTICE 'Migration completed successfully';
  ELSE
    -- No person found, create a placeholder user
    INSERT INTO users (id, email, name, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), 'user@example.com', 'User', NOW(), NOW())
    RETURNING id INTO v_user_id;

    RAISE NOTICE 'No person found - created placeholder user %', v_user_id;

    -- Update existing IngestJob records
    UPDATE "ingest_jobs"
    SET "userId" = v_user_id
    WHERE "userId" IS NULL OR "userId" = 'me';
  END IF;
END $$;

-- Step 4: Alter existing tables to add userId columns
ALTER TABLE "conversations" ADD COLUMN "userId" TEXT;
ALTER TABLE "evidence_events" ADD COLUMN "userId" TEXT;
ALTER TABLE "ingest_jobs" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "messages" ADD COLUMN "userId" TEXT;
ALTER TABLE "persons" ADD COLUMN "userId" TEXT;

-- Step 5: Populate userId in other tables
DO $$
DECLARE
  v_user_id TEXT;
BEGIN
  -- Get the first user ID
  SELECT id INTO v_user_id FROM users LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    UPDATE "evidence_events" SET "userId" = v_user_id WHERE "userId" IS NULL;
    UPDATE "conversations" SET "userId" = v_user_id WHERE "userId" IS NULL;
    UPDATE "messages" SET "userId" = v_user_id WHERE "userId" IS NULL;

    RAISE NOTICE 'Assigned all existing data to user %', v_user_id;
  END IF;
END $$;

-- Step 6: Create indexes for new columns
CREATE INDEX "conversations_userId_idx" ON "conversations"("userId");
CREATE INDEX "evidence_events_userId_timestamp_idx" ON "evidence_events"("userId", "timestamp");
CREATE INDEX "messages_userId_idx" ON "messages"("userId");

-- Step 7: Add foreign key constraints
ALTER TABLE "users" ADD CONSTRAINT "users_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "persons" ADD CONSTRAINT "persons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_events" ADD CONSTRAINT "evidence_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ingest_jobs" ADD CONSTRAINT "ingest_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
