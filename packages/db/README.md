# @wig/db - WIG Database Layer

Database layer for the **WIG (Warm Intro Graph)** project. Built with Prisma ORM and PostgreSQL.

## Overview

This package provides the complete data model for the WIG networking system, supporting:

- **Graph Relationships**: Person-to-Person edges with relationship strength scoring
- **Entity Resolution**: Multiple emails, phones, and names per person with merge tracking
- **Multi-Source Integration**: LinkedIn, Gmail, Calendar, Slack, and more
- **Audit Trail**: Complete operation history with correlation tracking
- **GDPR Compliance**: Soft deletes and data retention policies
- **Performance**: Optimized indexes for graph traversal and queries

## Schema Design

### Core Models

#### Person
Represents individuals in the network with support for entity resolution.

```prisma
model Person {
  id                String    @id @default(uuid())
  names             String[]  // Multiple name variations
  emails            String[]  // All email addresses
  phones            String[]  // Phone numbers
  socialHandles     Json?     // { linkedin, twitter, github, ... }
  title             String?
  organizationId    String?
  mergeExplanation  String?   // Why persons were merged
  previousIds       String[]  // For merge undo
  metadata          Json?     // Source-specific data
  deletedAt         DateTime? // Soft delete (GDPR)
}
```

#### Organization
Companies and institutions.

```prisma
model Organization {
  id        String    @id @default(uuid())
  name      String
  domain    String?   // For email matching
  metadata  Json?     // Source-specific data
  deletedAt DateTime? // Soft delete
  people    Person[]
}
```

#### Edge
Relationship connections between people with strength scoring.

```prisma
model Edge {
  id               String           @id @default(uuid())
  fromPersonId     String
  toPersonId       String
  relationshipType RelationshipType // knows, worked_at, etc.
  strength         Float            // 0.0-1.0 computed score
  strengthFactors  Json?            // Explainability data
  sources          String[]         // ["linkedin", "gmail"]
  channels         String[]         // ["email", "meeting"]
  firstSeenAt      DateTime
  lastSeenAt       DateTime
  interactionCount Int
}
```

#### Interaction
Communication events (emails, meetings, calls, messages).

```prisma
model Interaction {
  id           String               @id @default(uuid())
  sourceId     String               // Source system ID
  sourceName   String               // e.g., "gmail", "slack"
  timestamp    DateTime
  participants String[]             // Email addresses
  channel      InteractionChannel   // email, meeting, call, etc.
  direction    InteractionDirection? // one_way, two_way
  metadata     Json?                // Event-specific data
}
```

### System Models

#### SyncState
Tracks synchronization status for each data source.

```prisma
model SyncState {
  id            String     @id @default(uuid())
  sourceName    String     @unique
  cursor        String?    // For incremental sync
  lastSyncAt    DateTime?
  lastSuccessAt DateTime?
  lastError     String?
  status        SyncStatus // idle, running, failed, success
  metadata      Json?
}
```

#### AuditLog
Complete audit trail for compliance and debugging.

```prisma
model AuditLog {
  id            String   @id @default(uuid())
  correlationId String   // Group related operations
  action        String   // e.g., "person.merged"
  actorId       String?  // User/system ID
  entityType    String   // "Person", "Edge", etc.
  entityId      String
  metadata      Json?    // Event-specific data
  createdAt     DateTime @default(now())
}
```

## Setup

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL 14+ database
- Docker (optional, for local database)

### Installation

```bash
cd packages/db
npm install
```

### Environment Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Configure your database connection in `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wig_dev?schema=public"
NODE_ENV="development"
```

### Database Setup

```bash
# Generate Prisma Client
npm run generate

# Create database and run migrations
npm run migrate

# Seed with development data
npm run seed
```

## Usage

### Import Prisma Client

```typescript
import { prisma } from '@wig/db';

// Query people
const people = await prisma.person.findMany({
  where: {
    deletedAt: null, // Exclude soft-deleted
  },
  include: {
    organization: true,
    outgoingEdges: true,
  },
});

// Create an edge
const edge = await prisma.edge.create({
  data: {
    fromPersonId: personA.id,
    toPersonId: personB.id,
    relationshipType: 'knows',
    strength: 0.85,
    sources: ['linkedin', 'gmail'],
    channels: ['email'],
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    interactionCount: 5,
  },
});
```

### Health Check

```typescript
import { isDatabaseHealthy } from '@wig/db';

const healthy = await isDatabaseHealthy();
if (!healthy) {
  console.error('Database connection failed');
}
```

### Graceful Shutdown

```typescript
import { disconnectDatabase } from '@wig/db';

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run generate` | Generate Prisma Client from schema |
| `npm run migrate` | Create and apply migrations (dev) |
| `npm run migrate:deploy` | Apply migrations (production) |
| `npm run migrate:reset` | Reset database and re-run migrations |
| `npm run studio` | Open Prisma Studio (GUI) |
| `npm run seed` | Populate database with development data |
| `npm run db:push` | Push schema changes without migrations |
| `npm run format` | Format schema file |
| `npm run validate` | Validate schema syntax |

## Development

### Prisma Studio

Launch the visual database browser:

```bash
npm run studio
```

Access at `http://localhost:5555`

### Schema Changes

1. Update `prisma/schema.prisma`
2. Create migration:
```bash
npm run migrate
```
3. Regenerate client:
```bash
npm run generate
```

### Adding Indexes

For query performance, add indexes to frequently queried fields:

```prisma
model Person {
  emails String[]

  @@index([emails]) // Add index
}
```

### Seeding Strategies

The seed script (`src/seed.ts`) creates realistic development data:

- 3 Organizations (tech companies)
- 8 People (professionals with various roles)
- 8 Edges (relationships with varying strengths)
- 5 Interactions (emails, meetings, calls)
- 4 SyncStates (configured data sources)
- 3 AuditLogs (sample operations)

Customize for your needs or add production seed data.

## Common Patterns

### Entity Resolution

Find or create a person from multiple possible emails:

```typescript
const person = await prisma.person.findFirst({
  where: {
    emails: {
      hasSome: ['alice@acme.com', 'alice@gmail.com'],
    },
  },
});
```

### Merge Tracking

When merging persons, preserve history:

```typescript
await prisma.person.update({
  where: { id: targetPerson.id },
  data: {
    names: [...targetPerson.names, ...sourcePerson.names],
    emails: [...targetPerson.emails, ...sourcePerson.emails],
    previousIds: [...targetPerson.previousIds, sourcePerson.id],
    mergeExplanation: 'Same person confirmed via email match',
  },
});
```

### Graph Traversal

Find second-degree connections:

```typescript
const firstDegree = await prisma.edge.findMany({
  where: { fromPersonId: userId },
  include: { toPerson: true },
});

const secondDegree = await prisma.edge.findMany({
  where: {
    fromPersonId: {
      in: firstDegree.map(e => e.toPersonId),
    },
  },
  include: { toPerson: true },
});
```

### Audit Trail

Log important operations with correlation:

```typescript
const correlationId = `merge-${Date.now()}`;

await prisma.auditLog.create({
  data: {
    correlationId,
    action: 'person.merged',
    actorId: currentUser.id,
    entityType: 'Person',
    entityId: targetPerson.id,
    metadata: {
      sourcePerson: sourcePerson.id,
      reason: 'duplicate_detection',
    },
  },
});
```

### GDPR Compliance

Soft delete instead of hard delete:

```typescript
await prisma.person.update({
  where: { id: personId },
  data: {
    deletedAt: new Date(),
  },
});

// Always filter out deleted records
const activePeople = await prisma.person.findMany({
  where: { deletedAt: null },
});
```

## Performance Considerations

### Indexed Fields

The schema includes indexes on:

- `Person`: emails, phones, deletedAt
- `Interaction`: timestamp, participants
- `Edge`: fromPersonId, toPersonId, lastSeenAt, strength
- `AuditLog`: createdAt, correlationId, entityId

### Query Optimization

```typescript
// Bad: N+1 query problem
const people = await prisma.person.findMany();
for (const person of people) {
  const edges = await prisma.edge.findMany({
    where: { fromPersonId: person.id }
  });
}

// Good: Single query with include
const people = await prisma.person.findMany({
  include: {
    outgoingEdges: true,
  },
});
```

### Connection Pooling

Configure in `DATABASE_URL`:
```
postgresql://user:pass@host:5432/db?connection_limit=10
```

## Troubleshooting

### Migration Issues

Reset database:
```bash
npm run migrate:reset
```

### Client Generation

If types are not updating:
```bash
rm -rf node_modules/.prisma
npm run generate
```

### Connection Errors

Verify PostgreSQL is running:
```bash
psql $DATABASE_URL
```

## Architecture Decisions

### Why PostgreSQL?

- Native JSONB support for flexible metadata
- Excellent indexing for graph queries
- ACID compliance for data integrity
- Battle-tested at scale

### Why Arrays Instead of Junction Tables?

For `emails[]`, `phones[]`, `sources[]`:
- Simpler queries (no joins)
- Better performance for small arrays
- Native PostgreSQL array operations
- Easier entity resolution

### Why Soft Deletes?

- GDPR compliance (audit trail)
- Undo capability
- Preserves referential integrity
- Analytics on deleted data

### Why UUID Primary Keys?

- No coordination needed across services
- Can generate client-side
- Better for distributed systems
- No sequential ID leakage

## Contributing

When adding models or fields:

1. Update `schema.prisma`
2. Add appropriate indexes
3. Update seed data in `src/seed.ts`
4. Document in this README
5. Create migration: `npm run migrate`

## License

Private - WIG Project
