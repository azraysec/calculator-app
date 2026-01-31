# ADR-20260131-MULTI-TENANT-ARCHITECTURE: Multi-Tenant Architecture with Privacy Controls

**Date:** 2026-01-31
**Status:** APPROVED
**Decision Maker:** Chief Architect / Manager Agent
**Context:** Adding multi-tenant support to WIG system to enable multiple users with data isolation and privacy controls

---

## Decision

**APPROVED**

The WIG system will implement multi-tenant architecture with the following design:

### 1. New Database Model: DataSourceConnection
Replace global LinkedIn data access with per-user data source management:

```prisma
model DataSourceConnection {
  id               String   @id @default(cuid())
  userId           String
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  sourceType       DataSourceType // enum: LINKEDIN, FACEBOOK, EMAIL (future)
  connectionStatus ConnectionStatus // enum: CONNECTED, DISCONNECTED, ERROR

  authData         String?  // Encrypted JSON with tokens/credentials
  metadata         Json?    // Profile info, connection stats, last sync time

  privacyLevel     PrivacyLevel @default(PRIVATE) // enum: PRIVATE, CONNECTIONS_ONLY, PUBLIC

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  lastSyncedAt     DateTime?

  @@index([userId])
  @@index([userId, sourceType])
  @@unique([userId, sourceType])
}

enum DataSourceType {
  LINKEDIN
  FACEBOOK
  EMAIL
}

enum ConnectionStatus {
  CONNECTED
  DISCONNECTED
  ERROR
}

enum PrivacyLevel {
  PRIVATE           // Only visible to owner
  CONNECTIONS_ONLY  // Visible to direct connections
  PUBLIC            // Visible to all users
}
```

### 2. Data Isolation Schema Changes
Add userId foreign keys to existing models:

```prisma
model Person {
  id        String   @id @default(cuid())
  userId    String   // NEW: owner of this person record
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ... existing fields ...

  @@index([userId])
  @@index([userId, email]) // for fast lookups within user context
}

model Message {
  id        String   @id @default(cuid())
  userId    String   // NEW: owner of this message record
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ... existing fields ...

  @@index([userId])
  @@index([userId, personId])
}

model MessageEvidence {
  id        String   @id @default(cuid())
  userId    String   // NEW: owner of this evidence record
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ... existing fields ...

  @@index([userId])
}

model InteractionHistory {
  id        String   @id @default(cuid())
  userId    String   // NEW: owner of this interaction record
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ... existing fields ...

  @@index([userId])
  @@index([userId, personId])
}
```

### 3. Privacy Controls (MVP Defaults)

Based on user-specified defaults:

1. **Default Privacy Level**: PRIVATE
   - All new DataSourceConnections default to PRIVATE
   - User data is only visible to the owner
   - Metadata may be visible based on privacyLevel setting

2. **Sharing Model**: All-or-nothing for MVP
   - No granular per-user sharing in MVP
   - Future enhancement: add SharePermission model for granular control
   - Users either share all data or none

3. **Message Storage**: Always store all messages
   - All messages stored regardless of evidence usage
   - Ensures complete history for relationship scoring
   - Enables retroactive evidence discovery

4. **Cross-User Introductions**: Blocked completely for MVP
   - No warm intro paths that traverse multiple users' data
   - Future enhancement: add notification/consent system
   - MVP focuses on single-user paths only

5. **Organization Accounts**: Deferred
   - No shared organizational accounts in MVP
   - Focus on individual user accounts only
   - Future enhancement: add Organization model with team sharing

---

## Rationale

### Strengths
1. **Clear data ownership**: Every record has explicit userId
2. **Database-level isolation**: Foreign key constraints enforce boundaries
3. **Scalable privacy model**: PrivacyLevel enum allows future extensions
4. **Security-first**: Default PRIVATE prevents accidental data leakage
5. **Migration-friendly**: Can seed existing data to default user

### Technology Choices

**DataSourceConnection Model**: Centralizes authentication and metadata for all data sources, enabling future multi-platform support (Facebook, email, etc.) without schema changes.

**Enum-based Privacy**: Using database enums provides type safety and clear semantics for privacy levels, avoiding magic strings or boolean flags.

**All-or-Nothing Sharing (MVP)**: Simplifies implementation and reduces complexity while establishing foundation for granular sharing later.

**Block Cross-User Intros (MVP)**: Eliminates complex consent flows and privacy edge cases, allowing focus on core single-user functionality.

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Migration of existing data | Medium | Create seed script to associate all data with default user |
| Performance of userId queries | Low | Add compound indexes on (userId, otherFields) |
| Privacy level edge cases | Medium | Start with most restrictive (PRIVATE), document future enhancements |
| Cross-user feature requests | Low | Document limitation in MVP, plan Phase 2 enhancement |

---

## Implementation Plan

### Phase 1: Database Schema Migration (This ADR)
**Owner:** Postgres Pro / DevOps Release
**Duration:** 2-3 days

Tasks:
1. Create migration adding User model (if not exists)
2. Create DataSourceConnection model with enums
3. Add userId columns to Person, Message, MessageEvidence, InteractionHistory
4. Create indexes for multi-tenant queries
5. Create seed script to associate existing data with default user
6. Update Prisma client

### Phase 2: Backend Logic Isolation
**Owner:** Adapter Engineer / Graph Intelligence
**Duration:** 2-3 days

Tasks:
1. Add userId context to all repository methods
2. Update all queries to filter by userId
3. Add middleware to inject userId from session
4. Update adapter interfaces to accept userId
5. Add tests for tenant isolation

### Phase 3: Frontend User Context
**Owner:** Frontend Developer / React Specialist
**Duration:** 1-2 days

Tasks:
1. Add user session context provider
2. Update all API calls to include user context
3. Add user profile UI (view/edit privacy settings)
4. Update existing components to respect userId

### Phase 4: Privacy UI Controls
**Owner:** UI Designer / Frontend Developer
**Duration:** 1-2 days

Tasks:
1. Add DataSourceConnection management UI
2. Add privacy level selector for connections
3. Add data source status indicators
4. Add connection/disconnection flows

---

## Required Changes

### 1. Database Migration Script
```typescript
// prisma/migrations/.../migration.sql
-- Add User model if not exists
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "name" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Add DataSourceConnection model
CREATE TYPE "DataSourceType" AS ENUM ('LINKEDIN', 'FACEBOOK', 'EMAIL');
CREATE TYPE "ConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');
CREATE TYPE "PrivacyLevel" AS ENUM ('PRIVATE', 'CONNECTIONS_ONLY', 'PUBLIC');

CREATE TABLE "DataSourceConnection" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "sourceType" "DataSourceType" NOT NULL,
  "connectionStatus" "ConnectionStatus" NOT NULL,
  "authData" TEXT,
  "metadata" JSONB,
  "privacyLevel" "PrivacyLevel" DEFAULT 'PRIVATE',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "lastSyncedAt" TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  UNIQUE("userId", "sourceType")
);

-- Add indexes
CREATE INDEX "DataSourceConnection_userId_idx" ON "DataSourceConnection"("userId");
CREATE INDEX "DataSourceConnection_userId_sourceType_idx" ON "DataSourceConnection"("userId", "sourceType");

-- Add userId to existing models
ALTER TABLE "Person" ADD COLUMN "userId" TEXT;
ALTER TABLE "Message" ADD COLUMN "userId" TEXT;
ALTER TABLE "MessageEvidence" ADD COLUMN "userId" TEXT;
ALTER TABLE "InteractionHistory" ADD COLUMN "userId" TEXT;

-- Create default user and associate existing data
INSERT INTO "User" ("id", "email", "name")
VALUES ('default-user-id', 'default@example.com', 'Default User')
ON CONFLICT DO NOTHING;

UPDATE "Person" SET "userId" = 'default-user-id' WHERE "userId" IS NULL;
UPDATE "Message" SET "userId" = 'default-user-id' WHERE "userId" IS NULL;
UPDATE "MessageEvidence" SET "userId" = 'default-user-id' WHERE "userId" IS NULL;
UPDATE "InteractionHistory" SET "userId" = 'default-user-id' WHERE "userId" IS NULL;

-- Make userId NOT NULL after seeding
ALTER TABLE "Person" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Message" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "MessageEvidence" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "InteractionHistory" ALTER COLUMN "userId" SET NOT NULL;

-- Add foreign keys
ALTER TABLE "Person" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "Message" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "MessageEvidence" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "InteractionHistory" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- Add indexes for multi-tenant queries
CREATE INDEX "Person_userId_idx" ON "Person"("userId");
CREATE INDEX "Person_userId_email_idx" ON "Person"("userId", "email");
CREATE INDEX "Message_userId_idx" ON "Message"("userId");
CREATE INDEX "Message_userId_personId_idx" ON "Message"("userId", "personId");
CREATE INDEX "MessageEvidence_userId_idx" ON "MessageEvidence"("userId");
CREATE INDEX "InteractionHistory_userId_idx" ON "InteractionHistory"("userId");
CREATE INDEX "InteractionHistory_userId_personId_idx" ON "InteractionHistory"("userId", "personId");
```

### 2. Middleware for User Context
```typescript
// middleware/auth.ts
export async function withUserContext(req: Request) {
  const session = await getSession(req);
  if (!session?.userId) {
    throw new Error('Unauthorized');
  }
  return { userId: session.userId };
}
```

### 3. Repository Pattern Updates
```typescript
// Example: PersonRepository
class PersonRepository {
  async findByEmail(userId: string, email: string) {
    return prisma.person.findFirst({
      where: { userId, email }
    });
  }

  async findAll(userId: string) {
    return prisma.person.findMany({
      where: { userId }
    });
  }
}
```

---

## Consequences

### Immediate Actions (Phase 1)
1. Create Prisma migration with User and DataSourceConnection models
2. Add userId columns to existing models
3. Create seed script for existing data
4. Update Prisma schema file
5. Generate new Prisma client
6. Test migration on development database

### Architectural Patterns Established
- **Multi-tenant by default**: All queries filtered by userId
- **Privacy-first**: Default PRIVATE prevents data leakage
- **Extensible sharing**: PrivacyLevel enum supports future enhancements
- **Data source abstraction**: DataSourceConnection enables multi-platform
- **Cascade deletes**: User deletion automatically removes all data

### Development Workflow
- All new models must include userId foreign key
- All queries must filter by userId context
- Tests must verify tenant isolation
- Migration testing required before production

### Future Enhancements (Post-MVP)
- Granular per-user sharing with SharePermission model
- Cross-user intro paths with consent system
- Organization accounts with team sharing
- Privacy level enforcement in graph algorithms
- Data export/deletion for GDPR compliance

---

## Follow-Up Tasks

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Create Prisma migration | Postgres Pro | High | Pending |
| Add User model to schema | Postgres Pro | High | Pending |
| Add DataSourceConnection model | Postgres Pro | High | Pending |
| Add userId to existing models | Postgres Pro | High | Pending |
| Create seed script | DevOps Release | High | Pending |
| Update repository methods | Adapter Engineer | High | Pending |
| Add auth middleware | DevOps Release | High | Pending |
| Update frontend API calls | Frontend Developer | Medium | Pending |
| Add privacy UI controls | UI Designer | Medium | Pending |
| Document privacy model | Manager | Low | Pending |
| Update Dashboard & ProjectPlan | Manager | High | Pending |

---

## References

- docs/PRD.md (privacy requirements)
- docs/ArchitectureDecisions/20260117-mvp-architecture.md (base architecture)
- Prisma Multi-tenancy Guide: https://www.prisma.io/docs/guides/database/multi-tenancy
- Row-Level Security: https://neon.tech/docs/guides/row-level-security

---

**Approved by:** Chief Architect / Manager Agent
**Documented by:** Manager Agent
**Next Review:** After Phase 1 completion (database migration)
