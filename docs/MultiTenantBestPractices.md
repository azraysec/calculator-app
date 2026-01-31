# Multi-Tenant Best Practices

**Last Updated:** 2026-01-31
**Status:** Active Guidelines

---

## Overview

This document provides guidelines for maintaining multi-tenant isolation in the calculator-app codebase. Every developer must follow these practices to prevent data leakage between users.

---

## Core Principle

**EVERY database query that accesses user data MUST filter by userId.**

This is non-negotiable. A single missed filter can expose all users' data to each other.

---

## API Route Pattern

### Required Pattern

All API routes that access user-specific data MUST use the `withAuth` wrapper:

```typescript
import { withAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export const GET = withAuth(async (request: Request, { userId }) => {
  // userId is guaranteed to be available here

  const data = await prisma.someModel.findMany({
    where: {
      userId,  // CRITICAL: Always filter by userId
      // ... other filters
    }
  });

  return NextResponse.json(data);
});
```

### Anti-Pattern (DO NOT DO THIS)

```typescript
// BAD: No authentication
export async function GET(request: Request) {
  const data = await prisma.someModel.findMany({
    where: { deletedAt: null }  // MISSING userId filter!
  });
  return NextResponse.json(data);
}

// BAD: Authentication but no userId filter
export const GET = withAuth(async (request, { userId }) => {
  const data = await prisma.someModel.findMany({
    where: { deletedAt: null }  // MISSING userId filter!
  });
  return NextResponse.json(data);
});
```

---

## Database Query Patterns

### 1. Finding Records

**ALWAYS include userId in where clause:**

```typescript
// Single record
const person = await prisma.person.findFirst({
  where: {
    id: personId,
    userId,  // REQUIRED
    deletedAt: null
  }
});

// Multiple records
const people = await prisma.person.findMany({
  where: {
    userId,  // REQUIRED
    deletedAt: null
  }
});
```

### 2. Counting Records

```typescript
const count = await prisma.person.count({
  where: {
    userId,  // REQUIRED
    deletedAt: null
  }
});
```

### 3. Creating Records

**ALWAYS set userId when creating:**

```typescript
const person = await prisma.person.create({
  data: {
    userId,  // REQUIRED
    names: ['John Doe'],
    emails: ['john@example.com'],
    // ... other fields
  }
});
```

### 4. Updating Records

**ALWAYS verify ownership before updating:**

```typescript
// GOOD: Verify userId in where clause
const updated = await prisma.person.updateMany({
  where: {
    id: personId,
    userId,  // REQUIRED - prevents updating other users' records
  },
  data: {
    title: newTitle
  }
});

if (updated.count === 0) {
  return NextResponse.json(
    { error: 'Person not found' },
    { status: 404 }
  );
}
```

### 5. Deleting Records

**ALWAYS verify ownership before deleting:**

```typescript
// Soft delete
const deleted = await prisma.person.updateMany({
  where: {
    id: personId,
    userId,  // REQUIRED
  },
  data: {
    deletedAt: new Date()
  }
});
```

---

## Special Cases

### 1. Relationships Between Models

When querying related models, ensure BOTH sides belong to the user:

```typescript
// Getting edges for a person
const edges = await prisma.edge.findMany({
  where: {
    fromPersonId: personId,
    // IMPORTANT: Verify toPerson also belongs to user
    toPerson: { userId }
  }
});
```

### 2. Graph Traversal

When traversing the graph, NEVER cross tenant boundaries:

```typescript
// Filter edges to only include connections between user's people
const userPeople = await prisma.person.findMany({
  where: { userId },
  select: { id: true }
});
const personIds = userPeople.map(p => p.id);

const edges = await prisma.edge.findMany({
  where: {
    fromPersonId: { in: personIds },
    toPersonId: { in: personIds }  // Both sides must be user's people
  }
});
```

### 3. Aggregate Queries

Statistics and aggregations must be scoped to the user:

```typescript
const stats = {
  totalPeople: await prisma.person.count({
    where: { userId, deletedAt: null }
  }),
  totalEdges: await prisma.edge.count({
    where: {
      fromPerson: { userId },
      toPerson: { userId }
    }
  })
};
```

### 4. Search Queries

Search must ALWAYS filter by userId first:

```typescript
// CORRECT: Filter by userId, then search
const results = await prisma.person.findMany({
  where: {
    userId,  // FILTER FIRST
    OR: [
      { names: { hasSome: [query] } },
      { emails: { hasSome: [query] } }
    ]
  }
});

// WRONG: Search without userId filter
const results = await prisma.person.findMany({
  where: {
    OR: [
      { names: { hasSome: [query] } },
      { emails: { hasSome: [query] } }
    ]
  }
});
```

---

## Service Layer Pattern

When creating services that wrap database access, ALWAYS require userId:

```typescript
// GOOD: Service requires userId
export function createGraphService(userId: string) {
  return {
    getPerson: async (id: string) => {
      return prisma.person.findFirst({
        where: { id, userId }  // userId required
      });
    },

    getAllPeople: async () => {
      return prisma.person.findMany({
        where: { userId }  // userId required
      });
    }
  };
}

// Usage in API route
export const GET = withAuth(async (request, { userId }) => {
  const service = createGraphService(userId);
  const people = await service.getAllPeople();
  return NextResponse.json(people);
});
```

---

## Testing Requirements

Every API route that accesses user data MUST have these tests:

### 1. Tenant Isolation Test

```typescript
it('should only return data belonging to the authenticated user', async () => {
  // Create data for user1 and user2
  const user1Data = await createTestData(user1Id);
  const user2Data = await createTestData(user2Id);

  // User1 makes request
  const response = await fetch('/api/resource', {
    headers: { authorization: user1Token }
  });

  const data = await response.json();

  // Should only contain user1's data
  expect(data).toContainUser1Data();
  expect(data).not.toContainUser2Data();
});
```

### 2. Cross-Tenant Access Test

```typescript
it('should return 404 when accessing another users resource', async () => {
  // User2 creates a resource
  const resource = await createTestResource(user2Id);

  // User1 tries to access it
  const response = await fetch(`/api/resource/${resource.id}`, {
    headers: { authorization: user1Token }
  });

  // Should return 404 (not 403, to avoid information leakage)
  expect(response.status).toBe(404);
});
```

### 3. Authentication Test

```typescript
it('should return 401 when not authenticated', async () => {
  const response = await fetch('/api/resource');

  expect(response.status).toBe(401);
  const data = await response.json();
  expect(data.error).toBe('Unauthorized');
});
```

---

## Code Review Checklist

When reviewing code that touches user data, verify:

- [ ] API route uses `withAuth` wrapper
- [ ] All Prisma queries include `userId` filter
- [ ] Related model queries verify ownership on both sides
- [ ] Create operations set `userId`
- [ ] Update/Delete operations verify ownership
- [ ] Graph traversal doesn't cross tenant boundaries
- [ ] Search queries filter by userId first
- [ ] Statistics are scoped to user's data
- [ ] Tests verify tenant isolation
- [ ] Tests verify cross-tenant access is blocked
- [ ] Tests verify unauthenticated access is blocked

---

## Common Mistakes

### Mistake 1: Forgetting userId in Related Queries

```typescript
// BAD: Missing userId filter in evidence query
const person = await prisma.person.findFirst({
  where: { id, userId }  // Good
});

const evidence = await prisma.evidenceEvent.findMany({
  where: {
    subjectPersonId: person.id
    // MISSING: userId filter!
  }
});

// GOOD: Include userId in evidence query
const evidence = await prisma.evidenceEvent.findMany({
  where: {
    userId,  // Added
    subjectPersonId: person.id
  }
});
```

### Mistake 2: Using findUnique Instead of findFirst

```typescript
// BAD: findUnique doesn't support userId filter
const person = await prisma.person.findUnique({
  where: {
    id,
    userId  // This won't work!
  }
});

// GOOD: Use findFirst for multi-field where clauses
const person = await prisma.person.findFirst({
  where: {
    id,
    userId  // This works
  }
});
```

### Mistake 3: Cross-Tenant Edges

```typescript
// BAD: Only filtering one side of the edge
const edges = await prisma.edge.findMany({
  where: {
    fromPerson: { userId }
    // MISSING: toPerson filter!
  }
});

// GOOD: Filter both sides
const edges = await prisma.edge.findMany({
  where: {
    fromPerson: { userId },
    toPerson: { userId }  // Added
  }
});
```

---

## Emergency Response

If you discover a tenant isolation vulnerability:

1. **Immediately notify the team** - This is a P0 security issue
2. **Document the vulnerability** - What data could be leaked?
3. **Fix the vulnerability** - Add userId filter
4. **Add tests** - Prevent regression
5. **Review similar code** - Are there other instances?
6. **Consider data audit** - Was data actually leaked?

---

## Exceptions

The ONLY routes that should NOT use `withAuth` are:

1. Public health check endpoints (`/api/health`)
2. Webhook handlers with their own authentication (`/api/inngest`)
3. Admin endpoints with separate admin role checks
4. Cron job endpoints with cron-specific authentication

ALL other routes MUST use `withAuth` and filter by `userId`.

---

## Additional Resources

- [Architecture Decision: Multi-Tenant Data Model](./ArchitectureDecisions/)
- [Task Packet: Phase 1c - Backend Multi-Tenant Isolation](./TaskPackets/Phase1c-Backend-Multi-Tenant-Isolation.md)
- [API Routes Audit](./TaskPackets/API-Routes-Audit.md)
