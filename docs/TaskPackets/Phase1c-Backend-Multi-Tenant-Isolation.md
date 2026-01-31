# Task Packet: Phase 1c - Backend Multi-Tenant Isolation

**Created:** 2026-01-31
**Owner:** Adapter Engineer + DevOps Release
**Priority:** High
**Status:** Ready to Start
**Dependencies:** Phase 1b (Database Migration) - COMPLETE ✅

---

## Objective

Update all backend API routes and database queries to enforce multi-tenant isolation. Every database query must filter by userId to prevent cross-tenant data leakage.

---

## Background

Phase 1b successfully implemented the database schema for multi-tenant architecture:
- ✅ DataSourceConnection model created
- ✅ userId is now NOT NULL on Person, EvidenceEvent, Conversation, Message, IngestJob
- ✅ Foreign key constraints enforce CASCADE delete
- ✅ Multi-tenant indexes created
- ✅ Existing data migrated to default user

The `withAuth` helper already exists in `apps/web/lib/auth-helpers.ts` and provides:
- `getAuthenticatedUserId()` - Returns userId or throws Unauthorized error
- `withAuth()` - Wrapper for API routes that injects userId into handler

---

## Tasks

### Task 1: Audit All API Routes (Owner: Adapter Engineer)

**Acceptance Criteria:**
- Create a list of all API routes that query the database
- Identify which routes need userId filtering
- Document current authentication status (using withAuth or not)

**Files to Check:**
```
apps/web/app/api/people/route.ts
apps/web/app/api/people/[id]/route.ts
apps/web/app/api/connections/route.ts
apps/web/app/api/evidence/route.ts
apps/web/app/api/network/route.ts
apps/web/app/api/linkedin/profile/route.ts
apps/web/app/api/cron/gmail-sync/route.ts
apps/web/app/api/debug/route.ts
apps/web/app/api/debug/linkedin/route.ts
apps/web/app/api/me/route.ts
apps/web/app/api/seed/route.ts
```

**Output:**
Create `docs/TaskPackets/API-Routes-Audit.md` with:
- Route path
- Current auth status (authenticated / unauthenticated)
- Models queried
- Needs userId filter? (yes / no)

---

### Task 2: Update API Routes to Use withAuth (Owner: Adapter Engineer)

**Acceptance Criteria:**
- All API routes that query user data use `withAuth()` wrapper
- All database queries include `where: { userId }` filter
- Error handling for Unauthorized (401) is consistent

**Example Pattern:**

BEFORE:
```typescript
export async function GET(request: NextRequest) {
  const allPeople = await prisma.person.findMany({
    where: { deletedAt: null }
  });
  // ...
}
```

AFTER:
```typescript
export const GET = withAuth(async (request, { userId }) => {
  const allPeople = await prisma.person.findMany({
    where: {
      userId,
      deletedAt: null
    }
  });
  // ...
});
```

**Routes to Update:**
- `apps/web/app/api/people/route.ts` - Add userId filter to person search
- `apps/web/app/api/people/[id]/route.ts` - Add userId filter to person detail
- `apps/web/app/api/connections/route.ts` - Add userId filter to connections query
- `apps/web/app/api/evidence/route.ts` - Add userId filter to evidence query
- `apps/web/app/api/network/route.ts` - Add userId filter to network graph
- Any other routes identified in Task 1

---

### Task 3: Update Graph Service (Owner: Graph Intelligence)

**Acceptance Criteria:**
- `apps/web/lib/graph-service.ts` accepts userId parameter
- All Prisma queries in graph-service filter by userId
- Graph algorithms respect tenant boundaries

**Files to Update:**
```
apps/web/lib/graph-service.ts
```

**Changes Needed:**
1. Add userId parameter to all exported functions
2. Add userId filter to all database queries
3. Ensure graph traversal doesn't cross user boundaries

---

### Task 4: Update LinkedIn Adapter (Owner: Adapter Engineer)

**Acceptance Criteria:**
- LinkedIn archive parser accepts userId parameter
- All records created have userId set
- Ingestion respects user ownership

**Files to Update:**
```
packages/adapters/src/linkedin/archive-parser.ts
packages/core/src/scoring/linkedin-scorer.ts
```

**Changes Needed:**
1. Add userId parameter to `parseLinkedInArchive()` function
2. Set userId on all created Person, EvidenceEvent, Conversation, Message records
3. Update scorer to filter by userId

---

### Task 5: Create Tenant Isolation Tests (Owner: QA Test Engineer)

**Acceptance Criteria:**
- Tests verify no cross-tenant data leakage
- Tests verify all queries filter by userId
- Tests verify proper 401 responses for unauthenticated requests

**Test Cases:**

1. **Test: People Search - Tenant Isolation**
```typescript
// Given: Two users with separate data
const user1 = await createTestUser();
const user2 = await createTestUser();
await createTestPerson({ userId: user1.id, name: "Alice" });
await createTestPerson({ userId: user2.id, name: "Bob" });

// When: User1 searches for people
const response = await fetch('/api/people?q=Bob', {
  headers: { auth: user1.token }
});

// Then: User1 should not see User2's data
expect(response.results).toHaveLength(0);
```

2. **Test: Person Detail - Cross-Tenant Access Blocked**
```typescript
// Given: User2 creates a person
const user2 = await createTestUser();
const person = await createTestPerson({ userId: user2.id });

// When: User1 tries to access User2's person
const response = await fetch(`/api/people/${person.id}`, {
  headers: { auth: user1.token }
});

// Then: Should return 404 (not found in user's context)
expect(response.status).toBe(404);
```

3. **Test: Unauthenticated Request Returns 401**
```typescript
const response = await fetch('/api/people?q=test');
expect(response.status).toBe(401);
expect(response.body.error).toBe('Unauthorized');
```

**Test Files to Create:**
```
apps/web/app/api/people/route.multi-tenant.test.ts
apps/web/app/api/connections/route.multi-tenant.test.ts
apps/web/app/api/evidence/route.multi-tenant.test.ts
```

---

### Task 6: Update Seed Scripts (Owner: DevOps Release)

**Acceptance Criteria:**
- Seed scripts create test users
- Seed data is properly associated with user accounts
- Seed scripts demonstrate multi-tenant data

**Files to Update:**
```
packages/db/src/seed.ts
packages/db/prisma/seed.ts
apps/web/app/api/seed/route.ts
```

**Changes Needed:**
1. Create multiple test users
2. Assign seed data to specific users
3. Demonstrate data isolation in seed data

---

### Task 7: Update Documentation (Owner: Manager)

**Acceptance Criteria:**
- Document userId filtering pattern
- Update API documentation with authentication requirements
- Add multi-tenant best practices guide

**Documents to Create/Update:**
- `docs/MultiTenantBestPractices.md` - Guidelines for writing multi-tenant code
- `docs/API.md` - Document authentication requirements for each endpoint
- Update `README.md` with multi-tenant architecture overview

---

## Definition of Done

- [ ] All API routes that query user data use `withAuth()` wrapper
- [ ] All database queries include `where: { userId }` filter
- [ ] Graph service respects tenant boundaries
- [ ] LinkedIn adapter sets userId on all created records
- [ ] Tenant isolation tests pass (3+ test cases)
- [ ] Seed scripts create multi-user test data
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Manual testing verified no cross-tenant leaks

---

## Testing Strategy

### Unit Tests
- Test each API route with multiple users
- Verify userId filter is applied
- Verify 401 for unauthenticated requests

### Integration Tests
- Test complete user flows (signup → upload → query)
- Verify data isolation between users
- Test edge cases (shared emails, similar names)

### Manual Testing
1. Create two test users
2. Upload LinkedIn archive for each user
3. Search for people as User1 - should only see User1's data
4. Try to access User2's person ID as User1 - should return 404
5. Logout and access API - should return 401

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Missing userId filter in a route | High - Data leakage | Comprehensive test coverage + code review |
| Breaking existing functionality | Medium | Incremental updates + extensive testing |
| Performance degradation | Low | Indexes already created in Phase 1b |
| Auth middleware errors | Medium | Error handling + fallback to 401 |

---

## Estimated Time

- Task 1 (Audit): 2 hours
- Task 2 (Update Routes): 6 hours
- Task 3 (Graph Service): 3 hours
- Task 4 (LinkedIn Adapter): 2 hours
- Task 5 (Tests): 4 hours
- Task 6 (Seed Scripts): 2 hours
- Task 7 (Documentation): 2 hours

**Total:** ~21 hours (2-3 days with one engineer)

---

## Success Metrics

- 100% of API routes use `withAuth()` for user data queries
- 100% of database queries filter by userId
- 0 cross-tenant data leaks in testing
- All tenant isolation tests pass
- No performance regression (query times similar to before)

---

## Next Steps After Completion

After Phase 1c is complete, proceed to:
- **Phase 1d:** Frontend User Context (Add user session to React components)
- **Phase 2:** Core Domain Implementation (Continue with original roadmap)
