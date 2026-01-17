# WIG Database Schema Documentation

Complete entity relationship documentation for the Warm Intro Graph database.

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          WIG DATA MODEL                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐           ┌──────────────────────┐
│   Organization       │           │   SyncState          │
├──────────────────────┤           ├──────────────────────┤
│ id          UUID PK  │           │ id          UUID PK  │
│ name        String   │           │ sourceName  String U │
│ domain      String?  │           │ cursor      String?  │
│ metadata    Json?    │           │ lastSyncAt  DateTime?│
│ createdAt   DateTime │           │ status      Enum     │
│ updatedAt   DateTime │           │ metadata    Json?    │
│ deletedAt   DateTime?│           └──────────────────────┘
└──────────────────────┘
         │ 1
         │
         │ has many
         │
         │ N
         ▼
┌──────────────────────┐
│   Person             │◄─────┐
├──────────────────────┤      │
│ id          UUID PK  │      │
│ names       String[] │      │
│ emails      String[] │      │
│ phones      String[] │      │
│ socialHandles Json?  │      │
│ title       String?  │      │
│ organizationId UUID? │      │         ┌──────────────────────┐
│ mergeExplanation Str?│      │         │   Interaction        │
│ previousIds String[] │      │         ├──────────────────────┤
│ metadata    Json?    │      │         │ id          UUID PK  │
│ createdAt   DateTime │      │         │ sourceId    String   │
│ updatedAt   DateTime │      │         │ sourceName  String   │
│ deletedAt   DateTime?│      │         │ timestamp   DateTime │
└──────────────────────┘      │         │ participants String[]│
         │ 1                  │         │ channel     Enum     │
         │                    │         │ direction   Enum?    │
         │ has many edges     │         │ metadata    Json?    │
         │ (from)             │         │ createdAt   DateTime │
         │ N                  │         │ updatedAt   DateTime │
         ▼                    │         └──────────────────────┘
┌──────────────────────┐      │
│   Edge               │      │
├──────────────────────┤      │
│ id          UUID PK  │      │
│ fromPersonId UUID FK─┼──────┘
│ toPersonId   UUID FK─┼──────┐
│ relationshipType Enum│      │
│ strength     Float   │      │
│ strengthFactors Json?│      │
│ sources      String[]│      │
│ channels     String[]│      │
│ firstSeenAt  DateTime│      │
│ lastSeenAt   DateTime│      │
│ interactionCount Int │      │
│ createdAt    DateTime│      │
│ updatedAt    DateTime│      │         ┌──────────────────────┐
└──────────────────────┘      │         │   AuditLog           │
         │ 1                  │         ├──────────────────────┤
         └────────────────────┘         │ id          UUID PK  │
              to many edges (to)        │ correlationId String │
                                         │ action      String   │
                                         │ actorId     String?  │
                                         │ entityType  String   │
                                         │ entityId    String   │
                                         │ metadata    Json?    │
                                         │ createdAt   DateTime │
                                         └──────────────────────┘

Legend:
  PK = Primary Key
  FK = Foreign Key
  U  = Unique
  ? = Nullable
  [] = Array
```

## Model Details

### Person

**Purpose**: Represents individuals in the network with support for entity resolution.

**Key Features**:
- Multiple identity arrays (names, emails, phones) for matching
- Merge tracking with explanation and previous IDs
- Soft delete for GDPR compliance
- Flexible metadata for source-specific data

**Indexes**:
```sql
CREATE INDEX idx_person_emails ON persons USING GIN (emails);
CREATE INDEX idx_person_phones ON persons USING GIN (phones);
CREATE INDEX idx_person_deleted_at ON persons (deleted_at);
```

**Common Queries**:
```typescript
// Find by any email
prisma.person.findFirst({
  where: { emails: { hasSome: ['alice@acme.com'] } }
});

// Active people at organization
prisma.person.findMany({
  where: {
    organizationId: orgId,
    deletedAt: null,
  }
});

// People with LinkedIn profiles
prisma.person.findMany({
  where: {
    socialHandles: { path: ['linkedin'], not: Prisma.JsonNull }
  }
});
```

### Organization

**Purpose**: Companies and institutions that people work for.

**Key Features**:
- Domain matching for email-based association
- Metadata for enrichment data (LinkedIn, Clearbit, etc.)
- Soft delete support

**Indexes**:
```sql
CREATE INDEX idx_organization_domain ON organizations (domain);
CREATE INDEX idx_organization_deleted_at ON organizations (deleted_at);
```

**Common Queries**:
```typescript
// Find by domain
prisma.organization.findFirst({
  where: { domain: 'acme.com' }
});

// Organizations with people count
prisma.organization.findMany({
  include: {
    _count: { select: { people: true } }
  }
});
```

### Edge

**Purpose**: Directed relationship between two people with strength scoring.

**Key Features**:
- Relationship type classification
- Computed strength score (0.0-1.0)
- Explainability through strengthFactors
- Multi-source provenance
- Temporal tracking (first/last seen)
- Interaction count

**Indexes**:
```sql
CREATE INDEX idx_edge_from_person_id ON edges (from_person_id);
CREATE INDEX idx_edge_to_person_id ON edges (to_person_id);
CREATE INDEX idx_edge_last_seen_at ON edges (last_seen_at);
CREATE INDEX idx_edge_strength ON edges (strength);
CREATE UNIQUE INDEX idx_edge_unique_pair ON edges (from_person_id, to_person_id);
```

**Relationship Types**:
- `knows`: General acquaintance
- `connected_to`: Explicit connection (LinkedIn)
- `interacted_with`: Based on communication
- `worked_at`: Professional relationship
- `advised`: Mentor/advisor
- `invested_in`: Investor relationship

**Strength Factors** (JSON structure):
```json
{
  "recency": 0.95,      // How recent the last interaction
  "frequency": 0.88,    // How often they interact
  "mutuality": 1.0,     // Bidirectional vs unidirectional
  "channels": 0.9       // Diversity of communication channels
}
```

**Common Queries**:
```typescript
// Find person's connections
prisma.edge.findMany({
  where: {
    fromPersonId: personId,
    strength: { gte: 0.7 }
  },
  include: { toPerson: true },
  orderBy: { strength: 'desc' }
});

// Find mutual connections
const outgoing = await prisma.edge.findMany({
  where: { fromPersonId: personA.id },
  select: { toPersonId: true }
});

const mutual = await prisma.edge.findMany({
  where: {
    fromPersonId: personB.id,
    toPersonId: { in: outgoing.map(e => e.toPersonId) }
  }
});

// Recent interactions
prisma.edge.findMany({
  where: {
    lastSeenAt: { gte: new Date('2024-01-01') }
  }
});
```

### Interaction

**Purpose**: Individual communication events between people.

**Key Features**:
- Source tracking (system and message ID)
- Participant array (emails/identifiers)
- Channel classification
- Direction (one-way vs two-way)
- Flexible metadata

**Indexes**:
```sql
CREATE INDEX idx_interaction_timestamp ON interactions (timestamp);
CREATE INDEX idx_interaction_participants ON interactions USING GIN (participants);
CREATE INDEX idx_interaction_source ON interactions (source_name, source_id);
```

**Channels**:
- `email`: Email messages
- `message`: Chat/IM (Slack, Teams, etc.)
- `meeting`: Calendar events
- `call`: Phone/video calls
- `other`: Other interaction types

**Metadata Examples**:

Email:
```json
{
  "subject": "Re: Partnership Discussion",
  "threadId": "thread-abc-123",
  "hasAttachments": true,
  "labels": ["work", "important"]
}
```

Meeting:
```json
{
  "title": "Engineering Weekly Sync",
  "duration": 60,
  "location": "Conference Room A",
  "recurring": true
}
```

Message:
```json
{
  "channelName": "engineering",
  "messageCount": 15,
  "hasThreads": true
}
```

**Common Queries**:
```typescript
// Person's interactions
prisma.interaction.findMany({
  where: {
    participants: { has: 'alice@acme.com' }
  },
  orderBy: { timestamp: 'desc' }
});

// Interactions between two people
prisma.interaction.findMany({
  where: {
    participants: {
      hasEvery: ['alice@acme.com', 'bob@startup.io']
    }
  }
});

// Meetings in date range
prisma.interaction.findMany({
  where: {
    channel: 'meeting',
    timestamp: {
      gte: startDate,
      lte: endDate
    }
  }
});
```

### SyncState

**Purpose**: Track synchronization status for each data source.

**Key Features**:
- Per-source cursor for incremental sync
- Status tracking (idle, running, failed, success)
- Error logging
- Last sync timestamps

**Common Queries**:
```typescript
// Get sync state
const state = await prisma.syncState.findUnique({
  where: { sourceName: 'gmail' }
});

// Update after successful sync
await prisma.syncState.update({
  where: { sourceName: 'gmail' },
  data: {
    cursor: newCursor,
    lastSyncAt: new Date(),
    lastSuccessAt: new Date(),
    status: 'success',
    lastError: null,
    metadata: { totalRecords: 1234 }
  }
});

// Failed sources
prisma.syncState.findMany({
  where: { status: 'failed' }
});
```

### AuditLog

**Purpose**: Complete audit trail for compliance and debugging.

**Key Features**:
- Correlation ID for tracing multi-step operations
- Actor tracking (user or system)
- Entity reference
- Flexible metadata

**Indexes**:
```sql
CREATE INDEX idx_audit_log_created_at ON audit_logs (created_at);
CREATE INDEX idx_audit_log_correlation_id ON audit_logs (correlation_id);
CREATE INDEX idx_audit_log_entity ON audit_logs (entity_type, entity_id);
```

**Common Actions**:
- `person.created`
- `person.updated`
- `person.merged`
- `person.deleted`
- `edge.created`
- `edge.updated`
- `data.synced`
- `entity.resolved`

**Metadata Examples**:

Person merge:
```json
{
  "sourcePerson": "uuid-123",
  "targetPerson": "uuid-456",
  "reason": "duplicate_detection",
  "matchConfidence": 0.95
}
```

Data sync:
```json
{
  "source": "gmail",
  "recordsProcessed": 123,
  "newRecords": 45,
  "updatedRecords": 78,
  "duration": 4521
}
```

**Common Queries**:
```typescript
// Trace operation
prisma.auditLog.findMany({
  where: { correlationId: 'merge-123' },
  orderBy: { createdAt: 'asc' }
});

// Entity history
prisma.auditLog.findMany({
  where: {
    entityType: 'Person',
    entityId: personId
  },
  orderBy: { createdAt: 'desc' }
});

// Recent activity
prisma.auditLog.findMany({
  where: {
    createdAt: { gte: yesterday }
  },
  orderBy: { createdAt: 'desc' }
});
```

## Data Patterns

### Entity Resolution

Multiple persons may represent the same individual. Use arrays for matching:

```typescript
// Find potential duplicates
const potentialDupes = await prisma.person.findMany({
  where: {
    OR: [
      { emails: { hasSome: person.emails } },
      { phones: { hasSome: person.phones } }
    ],
    id: { not: person.id }
  }
});
```

### Merge Tracking

When merging, preserve history:

```typescript
const merged = await prisma.person.update({
  where: { id: targetId },
  data: {
    names: { push: sourcePerson.names },
    emails: { push: sourcePerson.emails },
    phones: { push: sourcePerson.phones },
    previousIds: { push: sourceId },
    mergeExplanation: 'Same person - email match with 95% confidence'
  }
});
```

### Graph Traversal

Find paths between people:

```typescript
// BFS for shortest path
async function findPath(fromId: string, toId: string, maxDepth = 3) {
  const visited = new Set([fromId]);
  let frontier = [{ id: fromId, path: [] }];

  for (let depth = 0; depth < maxDepth; depth++) {
    const nextFrontier = [];

    for (const { id, path } of frontier) {
      const edges = await prisma.edge.findMany({
        where: { fromPersonId: id },
        include: { toPerson: true }
      });

      for (const edge of edges) {
        if (edge.toPersonId === toId) {
          return [...path, edge];
        }

        if (!visited.has(edge.toPersonId)) {
          visited.add(edge.toPersonId);
          nextFrontier.push({
            id: edge.toPersonId,
            path: [...path, edge]
          });
        }
      }
    }

    frontier = nextFrontier;
  }

  return null; // No path found
}
```

### Relationship Strength

Calculate strength score from multiple factors:

```typescript
function calculateStrength(factors: {
  recency: number;      // 0-1, recent interactions weighted higher
  frequency: number;    // 0-1, based on interaction count
  mutuality: number;    // 0-1, bidirectional = 1.0
  channels: number;     // 0-1, multiple channels = higher
}): number {
  const weights = {
    recency: 0.35,
    frequency: 0.30,
    mutuality: 0.20,
    channels: 0.15
  };

  return Object.entries(factors).reduce(
    (sum, [key, value]) => sum + value * weights[key],
    0
  );
}
```

### GDPR Compliance

Soft delete and data export:

```typescript
// Right to erasure (soft delete)
await prisma.person.update({
  where: { id: personId },
  data: { deletedAt: new Date() }
});

// Right to data portability
async function exportPersonData(personId: string) {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: {
      organization: true,
      outgoingEdges: { include: { toPerson: true } },
      incomingEdges: { include: { fromPerson: true } }
    }
  });

  const interactions = await prisma.interaction.findMany({
    where: {
      participants: {
        hasSome: person.emails
      }
    }
  });

  return { person, interactions };
}
```

## Performance Tips

### Use Appropriate Indexes

The schema includes indexes for common queries. Monitor slow queries:

```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s

-- Find missing indexes
SELECT schemaname, tablename, attname, correlation
FROM pg_stats
WHERE schemaname = 'public'
AND abs(correlation) < 0.5
ORDER BY abs(correlation);
```

### Batch Operations

Use transactions for consistency:

```typescript
await prisma.$transaction(async (tx) => {
  const person = await tx.person.create({ data: personData });

  await tx.edge.createMany({
    data: connections.map(c => ({
      fromPersonId: person.id,
      toPersonId: c.id,
      relationshipType: 'knows',
      strength: c.strength,
      sources: ['import'],
      firstSeenAt: new Date(),
      lastSeenAt: new Date()
    }))
  });

  await tx.auditLog.create({
    data: {
      correlationId: generateId(),
      action: 'person.imported',
      entityType: 'Person',
      entityId: person.id
    }
  });
});
```

### Pagination

For large result sets:

```typescript
// Cursor-based pagination
const pageSize = 100;
let cursor = undefined;

while (true) {
  const people = await prisma.person.findMany({
    take: pageSize,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'asc' }
  });

  if (people.length === 0) break;

  // Process people...

  cursor = people[people.length - 1].id;
}
```

## Migration Strategy

### Adding Fields

1. Add to schema:
```prisma
model Person {
  // ... existing fields
  newField String?
}
```

2. Create migration:
```bash
npm run migrate
```

3. Backfill if needed:
```typescript
await prisma.person.updateMany({
  where: { newField: null },
  data: { newField: 'default' }
});
```

### Changing Field Types

Use SQL in migration file:

```sql
-- Migration: 20240101000000_change_field_type

-- Step 1: Add new column
ALTER TABLE persons ADD COLUMN new_field_temp jsonb;

-- Step 2: Copy and transform data
UPDATE persons SET new_field_temp = old_field::jsonb;

-- Step 3: Drop old column
ALTER TABLE persons DROP COLUMN old_field;

-- Step 4: Rename new column
ALTER TABLE persons RENAME COLUMN new_field_temp TO old_field;
```

## See Also

- [Quick Start Guide](./QUICKSTART.md)
- [Main README](./README.md)
- [Prisma Documentation](https://www.prisma.io/docs)
