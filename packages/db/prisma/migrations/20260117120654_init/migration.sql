-- CreateEnum
CREATE TYPE "InteractionChannel" AS ENUM ('email', 'message', 'meeting', 'call', 'other');

-- CreateEnum
CREATE TYPE "InteractionDirection" AS ENUM ('one_way', 'two_way');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('knows', 'connected_to', 'interacted_with', 'worked_at', 'advised', 'invested_in');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('idle', 'running', 'failed', 'success');

-- CreateTable
CREATE TABLE "persons" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "names" TEXT[],
    "emails" TEXT[],
    "phones" TEXT[],
    "socialHandles" JSONB,
    "title" TEXT,
    "organizationId" TEXT,
    "mergeExplanation" TEXT,
    "previousIds" TEXT[],
    "metadata" JSONB,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "metadata" JSONB,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "participants" TEXT[],
    "channel" "InteractionChannel" NOT NULL,
    "direction" "InteractionDirection",
    "metadata" JSONB,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edges" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fromPersonId" TEXT NOT NULL,
    "toPersonId" TEXT NOT NULL,
    "relationshipType" "RelationshipType" NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "strengthFactors" JSONB,
    "sources" TEXT[],
    "channels" TEXT[],
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "interactionCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_states" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceName" TEXT NOT NULL,
    "cursor" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "status" "SyncStatus" NOT NULL DEFAULT 'idle',
    "metadata" JSONB,

    CONSTRAINT "sync_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "persons_deletedAt_idx" ON "persons"("deletedAt");

-- CreateIndex
CREATE INDEX "persons_emails_idx" ON "persons"("emails");

-- CreateIndex
CREATE INDEX "persons_phones_idx" ON "persons"("phones");

-- CreateIndex
CREATE INDEX "organizations_domain_idx" ON "organizations"("domain");

-- CreateIndex
CREATE INDEX "organizations_deletedAt_idx" ON "organizations"("deletedAt");

-- CreateIndex
CREATE INDEX "interactions_timestamp_idx" ON "interactions"("timestamp");

-- CreateIndex
CREATE INDEX "interactions_participants_idx" ON "interactions"("participants");

-- CreateIndex
CREATE INDEX "interactions_sourceName_sourceId_idx" ON "interactions"("sourceName", "sourceId");

-- CreateIndex
CREATE INDEX "edges_fromPersonId_idx" ON "edges"("fromPersonId");

-- CreateIndex
CREATE INDEX "edges_toPersonId_idx" ON "edges"("toPersonId");

-- CreateIndex
CREATE INDEX "edges_lastSeenAt_idx" ON "edges"("lastSeenAt");

-- CreateIndex
CREATE INDEX "edges_strength_idx" ON "edges"("strength");

-- CreateIndex
CREATE UNIQUE INDEX "edges_fromPersonId_toPersonId_key" ON "edges"("fromPersonId", "toPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "sync_states_sourceName_key" ON "sync_states"("sourceName");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_correlationId_idx" ON "audit_logs"("correlationId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edges" ADD CONSTRAINT "edges_fromPersonId_fkey" FOREIGN KEY ("fromPersonId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edges" ADD CONSTRAINT "edges_toPersonId_fkey" FOREIGN KEY ("toPersonId") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
