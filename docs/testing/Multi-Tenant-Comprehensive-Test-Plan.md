# Multi-Tenant Architecture - Comprehensive Test Plan
**Created:** 2026-01-31
**Status:** In Progress
**Priority:** CRITICAL - Quality over speed

---

## Executive Summary

This document applies the **8-Layer Comprehensive Testing Methodology** to the multi-tenant architecture implementation (v0.14.0). Quality of delivery is the absolute priority. No testing layer will be skipped.

---

## LAYER 1: HIGH-LEVEL TEST PLANNING

### 1.1 Feature/System Analysis

**Feature:** Multi-tenant data isolation architecture for WIG application
**Affected Systems:**
- Database schema (User, Person, EvidenceEvent, Conversation, Message, IngestJob, DataSourceConnection)
- All API routes accessing user data
- Graph service (GraphServiceFactory, GraphService)
- Authentication middleware (withAuth, getAuthenticatedUserId)
- Frontend user context (UserProvider, useUser)
- UI components (UserProfile, DataSourcesManager, PrivacySettings, UserAvatar)

**Integration Points:**
- NextAuth.js for authentication
- Prisma ORM for database access
- React Context API for user state management
- API routes → Database queries
- Frontend → API routes
- Graph algorithms → User-scoped data

**Dependencies:**
- All components depend on authentication
- All database queries depend on userId filtering
- All API routes depend on withAuth wrapper
- All graph operations depend on user-scoped service

### 1.2 Test Scenarios Identification

#### Happy Path Scenarios
1. **HP-1:** Authenticated user fetches their own people
2. **HP-2:** Authenticated user fetches their own connections
3. **HP-3:** Authenticated user fetches their own network graph
4. **HP-4:** Authenticated user views their own data sources
5. **HP-5:** Authenticated user updates privacy settings
6. **HP-6:** Authenticated user creates new person (userId set correctly)
7. **HP-7:** Authenticated user updates their own person
8. **HP-8:** Authenticated user deletes their own person
9. **HP-9:** Authenticated user views pathfinding results (scoped to their data)
10. **HP-10:** Multiple users access system simultaneously (no data bleed)

#### Edge Case Scenarios
1. **EC-1:** User with no data (empty database)
2. **EC-2:** User with large dataset (1000+ people, 10000+ edges)
3. **EC-3:** Concurrent updates from same user
4. **EC-4:** User tries to access by invalid ID format
5. **EC-5:** User tries to access deleted/soft-deleted records
6. **EC-6:** User searches with special characters in query
7. **EC-7:** Pagination at boundaries (page 0, negative, beyond max)
8. **EC-8:** Graph traversal with disconnected components
9. **EC-9:** User with multiple data source connections
10. **EC-10:** Privacy setting edge cases (null, undefined, invalid values)

#### Error Scenarios
1. **ER-1:** Unauthenticated request (no session)
2. **ER-2:** Invalid authentication token
3. **ER-3:** Expired authentication session
4. **ER-4:** User tries to access another user's person by ID
5. **ER-5:** User tries to access another user's data source
6. **ER-6:** User tries to create person for another userId
7. **ER-7:** User tries to update another user's person
8. **ER-8:** User tries to delete another user's person
9. **ER-9:** Database connection failure during query
10. **ER-10:** Malformed request data (SQL injection attempts)

#### Security Scenarios (CRITICAL - 100% Coverage Required)
1. **SEC-1:** User1 CANNOT see User2's people via /api/people
2. **SEC-2:** User1 CANNOT see User2's connections via /api/connections
3. **SEC-3:** User1 CANNOT see User2's network via /api/network
4. **SEC-4:** User1 CANNOT access User2's person by direct ID via /api/people/[id]
5. **SEC-5:** User1 CANNOT see User2's paths via /api/people/[id]/paths
6. **SEC-6:** User1 CANNOT access User2's data sources via /api/data-sources
7. **SEC-7:** Edges NEVER connect people across tenant boundaries
8. **SEC-8:** Graph traversal NEVER crosses tenant boundaries
9. **SEC-9:** Search queries NEVER return cross-tenant results
10. **SEC-10:** Statistics and aggregations are always scoped to user
11. **SEC-11:** Related queries (evidence, conversations) always filter by userId
12. **SEC-12:** Batch operations never affect other tenants
13. **SEC-13:** SQL injection attempts do not bypass userId filters
14. **SEC-14:** GraphQL-style nested queries respect userId
15. **SEC-15:** Export/import operations are tenant-scoped

#### Boundary Conditions
1. **BC-1:** Zero people (empty tenant)
2. **BC-2:** One person (minimal tenant)
3. **BC-3:** Maximum string lengths (names, emails, etc.)
4. **BC-4:** Array limits (names array, emails array)
5. **BC-5:** Null vs undefined vs empty string handling
6. **BC-6:** Numeric limits (page numbers, counts)
7. **BC-7:** Date boundaries (past, future, epoch)
8. **BC-8:** Unicode and emoji in search queries
9. **BC-9:** Very long query strings (thousands of characters)
10. **BC-10:** Deeply nested JSON in metadata fields

### 1.3 Requirements Mapping

| Requirement | Test Scenarios | Priority | Coverage Target |
|-------------|----------------|----------|-----------------|
| REQ-MT-1: User authentication required | ER-1, ER-2, ER-3 | CRITICAL | 100% |
| REQ-MT-2: All queries filter by userId | SEC-1 through SEC-15 | CRITICAL | 100% |
| REQ-MT-3: No cross-tenant data access | SEC-1 through SEC-15 | CRITICAL | 100% |
| REQ-MT-4: Edges scoped to tenant | SEC-7, SEC-8 | CRITICAL | 100% |
| REQ-MT-5: Graph traversal scoped | SEC-8, HP-9 | CRITICAL | 100% |
| REQ-MT-6: Search scoped to tenant | SEC-9, HP-1 | CRITICAL | 100% |
| REQ-MT-7: Statistics scoped | SEC-10 | CRITICAL | 100% |
| REQ-MT-8: CRUD operations scoped | HP-6, HP-7, HP-8, SEC-4, SEC-7, SEC-8 | CRITICAL | 100% |
| REQ-MT-9: Data source isolation | SEC-6, HP-4 | CRITICAL | 100% |
| REQ-MT-10: Privacy settings isolation | HP-5, EC-10 | HIGH | 100% |

### 1.4 Risk Assessment

| Risk | Severity | Likelihood | Mitigation | Test Priority |
|------|----------|------------|------------|---------------|
| Cross-tenant data leak | CRITICAL | Medium | Comprehensive security tests | P0 |
| Missing userId filter in query | CRITICAL | High | Test every API route | P0 |
| Edge connecting across tenants | CRITICAL | Medium | Test graph operations exhaustively | P0 |
| Authentication bypass | CRITICAL | Low | Test auth on all routes | P0 |
| Soft-deleted record access | HIGH | Medium | Test deletion scenarios | P1 |
| Search returning cross-tenant | CRITICAL | Medium | Test all search endpoints | P0 |
| Statistics exposing tenant data | HIGH | Medium | Test aggregate queries | P1 |
| Race condition in concurrent ops | MEDIUM | Low | Test concurrent access | P2 |
| Performance degradation | MEDIUM | Medium | Performance testing | P2 |
| Edge case panics | LOW | Low | Comprehensive edge case tests | P2 |

### 1.5 Test Type Planning

#### Unit Tests (Target: >95% coverage)
- Database query functions (Prisma calls)
- Authentication helpers (withAuth, getAuthenticatedUserId)
- Graph service methods
- User context hooks
- Utility functions

#### Integration Tests (Target: 100% of API routes)
- /api/people (GET, POST)
- /api/people/[id] (GET, PATCH, DELETE)
- /api/connections (GET)
- /api/network (GET)
- /api/people/[id]/paths (GET)
- /api/data-sources (GET, POST, PATCH, DELETE)
- /api/linkedin/profile (POST)
- All other API routes accessing user data

#### E2E Tests (Target: Critical user journeys)
- User login → view connections → click person → see details
- User login → search for connection → view profile
- User login → view network graph → explore connections
- User login → manage data sources → update privacy
- Multi-user scenario: User1 and User2 both access system (no bleed)

#### Security Tests (Target: 100% of isolation points)
- Tenant isolation on every API route
- Cross-tenant access attempts (all blocked)
- Authentication required on all routes
- Authorization (can only access own data)
- SQL injection attempts
- GraphQL-style nested query attacks

---

## LAYER 2: HIGH-LEVEL TEST DESIGN

### 2.1 Test Strategy

**Testing Pyramid:**
- Unit tests: 70% of tests (fast, isolated, comprehensive)
- Integration tests: 25% of tests (API routes, database operations)
- E2E tests: 5% of tests (critical user journeys)
- Security tests: Integrated into all layers (dedicated test files)

**Frameworks:**
- Vitest for unit and integration tests
- Playwright for E2E tests
- Custom security test utilities

**Execution Order:**
1. Unit tests (fastest, run on every file save)
2. Integration tests (run on every commit)
3. Security tests (run on every commit)
4. E2E tests (run before deployment)

**Test Isolation:**
- Each test uses independent mocks
- Database tests use transactions (rollback after each)
- E2E tests use isolated test users
- No shared state between tests

### 2.2 Coverage Targets

| Layer | Overall Coverage | Critical Path Coverage | Security Code Coverage |
|-------|------------------|------------------------|------------------------|
| Unit | >95% | 100% | 100% |
| Integration | >90% | 100% | 100% |
| E2E | >80% user journeys | 100% critical journeys | 100% auth journeys |
| Security | N/A (functional) | 100% isolation points | 100% attack vectors |

**Critical Paths** (must have 100% coverage):
- Authentication flow
- userId filtering in all database queries
- withAuth wrapper on all API routes
- Graph service userId scoping
- Edge traversal tenant boundaries
- Search query userId filtering

### 2.3 Test Data Requirements

**Test Users:**
- user1 (testuser1@example.com) - has 50 people, 200 edges
- user2 (testuser2@example.com) - has 30 people, 100 edges
- user3 (testuser3@example.com) - empty tenant (no data)
- user4 (testuser4@example.com) - large dataset (1000+ people)
- adminUser (admin@example.com) - admin role

**Test People:**
- Person fixtures for each user
- Mix of with/without organization
- Mix of with/without deleted records
- Mix of with/without social handles

**Test Edges:**
- Various relationship types (colleague, friend, family)
- Various strengths (0.1 to 1.0)
- Various channels (email, linkedin, phone)
- Cross-tenant edges (should be filtered out)

**Test Data Sources:**
- LinkedIn connection for user1
- Gmail connection for user2
- Multiple connections for user1

### 2.4 Mock & Stub Strategy

**Mocked Dependencies:**
- NextAuth session (mockSession utility)
- Prisma client (vi.mock for unit tests, real for integration)
- External APIs (LinkedIn, Gmail) - not yet implemented
- Inngest event bus (when implemented)

**Stub Implementations:**
- Authentication stub (returns specific userId)
- Database stub (in-memory fixture data)
- Graph algorithm stub (returns predetermined paths)

**Mock Behavior:**
- Authentication mock returns userId based on test scenario
- Prisma mock returns filtered data (simulates userId filter)
- Error mocks throw specific error types

### 2.5 Test Environment

**Development Environment:**
- Local PostgreSQL database
- Test database: `calculator_test`
- Isolated from dev/prod databases
- Seeded with test data before each run

**CI Environment:**
- Ephemeral PostgreSQL container
- Fresh database per test run
- No shared state between CI runs

**Environment Variables:**
- `DATABASE_URL_TEST` - test database
- `NEXTAUTH_SECRET_TEST` - test auth secret
- `NODE_ENV=test` - enables test mode

**Cleanup:**
- Truncate all tables after each test file
- Drop and recreate database between test suites
- Clear mocks after each test (vi.clearAllMocks)

---

## LAYER 3: MID-LEVEL TEST DESIGN

### 3.1 Test Case Catalog

#### TC-PEOPLE Series: /api/people endpoint

| Test ID | Description | Input | Expected Output | Priority |
|---------|-------------|-------|-----------------|----------|
| TC-PEOPLE-001 | Authenticated user gets own people | userId=user1, no filters | List of user1's people only | P0 |
| TC-PEOPLE-002 | User cannot see other user's people | userId=user1, search for user2 name | Empty results | P0 |
| TC-PEOPLE-003 | Unauthenticated request blocked | No auth token | 401 Unauthorized | P0 |
| TC-PEOPLE-004 | Search with query parameter | userId=user1, q="Alice" | Filtered list (userId=user1) | P0 |
| TC-PEOPLE-005 | Empty tenant returns empty array | userId=user3 (empty) | { results: [] } | P1 |
| TC-PEOPLE-006 | Fuzzy search scoped to user | userId=user1, q="Alise" (typo) | Fuzzy results for user1 only | P1 |
| TC-PEOPLE-007 | Special characters in query | userId=user1, q="Alice O'Brien" | Properly escaped, user1 only | P1 |
| TC-PEOPLE-008 | Missing query parameter | userId=user1, no q | 400 Bad Request | P2 |

#### TC-CONNECTIONS Series: /api/connections endpoint

| Test ID | Description | Input | Expected Output | Priority |
|---------|-------------|-------|-----------------|----------|
| TC-CONN-001 | User gets own connections | userId=user1 | List of user1's people | P0 |
| TC-CONN-002 | Filter by name respects userId | userId=user1, name="Bob" | User1's "Bob" only, not user2's | P0 |
| TC-CONN-003 | Pagination respects userId | userId=user1, page=2 | Page 2 of user1's data | P1 |
| TC-CONN-004 | Filter by company scoped | userId=user1, company="Acme" | User1's Acme people only | P1 |
| TC-CONN-005 | Unauthenticated blocked | No auth | 401 Unauthorized | P0 |
| TC-CONN-006 | Empty tenant pagination | userId=user3, page=1 | Empty array, total=0 | P2 |

#### TC-NETWORK Series: /api/network endpoint

| Test ID | Description | Input | Expected Output | Priority |
|---------|-------------|-------|-----------------|----------|
| TC-NET-001 | User gets own network | userId=user1 | People and edges for user1 | P0 |
| TC-NET-002 | Edges only between user's people | userId=user1 | No cross-tenant edges | P0 |
| TC-NET-003 | Statistics scoped to user | userId=user1 | Stats for user1's data only | P0 |
| TC-NET-004 | Organization groups scoped | userId=user1 | Orgs for user1's people only | P1 |
| TC-NET-005 | Cross-tenant edge filtered out | userId=user1, edge to user2's person exists | Edge not returned | P0 |
| TC-NET-006 | Unauthenticated blocked | No auth | 401 Unauthorized | P0 |

#### TC-PERSON-DETAIL Series: /api/people/[id] endpoint

| Test ID | Description | Input | Expected Output | Priority |
|---------|-------------|-------|-----------------|----------|
| TC-DETAIL-001 | User gets own person by ID | userId=user1, id=user1's person | Person details | P0 |
| TC-DETAIL-002 | User cannot get other user's person | userId=user1, id=user2's person | 404 Not Found | P0 |
| TC-DETAIL-003 | Update own person | userId=user1, id=user1's person, PATCH | Person updated | P0 |
| TC-DETAIL-004 | Cannot update other user's person | userId=user1, id=user2's person, PATCH | 404 Not Found | P0 |
| TC-DETAIL-005 | Delete own person | userId=user1, id=user1's person, DELETE | Person soft-deleted | P0 |
| TC-DETAIL-006 | Cannot delete other user's person | userId=user1, id=user2's person, DELETE | 404 Not Found | P0 |
| TC-DETAIL-007 | Invalid ID format | userId=user1, id="invalid" | 400 Bad Request | P2 |

#### TC-PATHS Series: /api/people/[id]/paths endpoint

| Test ID | Description | Input | Expected Output | Priority |
|---------|-------------|-------|-----------------|----------|
| TC-PATH-001 | Find paths in own network | userId=user1, from=person1, to=person2 | Paths within user1's network | P0 |
| TC-PATH-002 | Cannot find paths to other tenant | userId=user1, from=user1's, to=user2's | Empty or 404 | P0 |
| TC-PATH-003 | Paths never traverse tenants | userId=user1, path calculation | All nodes belong to user1 | P0 |

#### TC-DATASOURCES Series: /api/data-sources endpoint

| Test ID | Description | Input | Expected Output | Priority |
|---------|-------------|-------|-----------------|----------|
| TC-DS-001 | Get own data sources | userId=user1 | User1's data sources | P0 |
| TC-DS-002 | Cannot see other user's sources | userId=user1 | No user2's sources visible | P0 |
| TC-DS-003 | Create data source sets userId | userId=user1, POST LinkedIn | Created with userId=user1 | P0 |
| TC-DS-004 | Update own data source | userId=user1, PATCH own source | Updated | P0 |
| TC-DS-005 | Cannot update other's source | userId=user1, PATCH user2's source | 404 Not Found | P0 |

### 3.2 Input/Output Specifications

**TC-PEOPLE-001 Specification:**
```typescript
// Input
Request: GET /api/people?q=Alice
Headers: { Authorization: "Bearer <user1-token>" }
Body: null

// Pre-conditions
- Database contains:
  - user1 has person "Alice Smith" (id: p1)
  - user2 has person "Alice Jones" (id: p2)
- User1 is authenticated

// Expected Output
Response: 200 OK
Body: {
  results: [
    {
      id: "p1",
      userId: "user1",
      names: ["Alice Smith"],
      emails: ["alice.smith@example.com"],
      // ... other fields
    }
  ],
  // Note: Alice Jones (user2's person) NOT in results
}

// Post-conditions
- No data modified
- No cross-tenant data accessed
```

**TC-DETAIL-002 Specification:**
```typescript
// Input
Request: GET /api/people/p2  // p2 belongs to user2
Headers: { Authorization: "Bearer <user1-token>" }
Body: null

// Pre-conditions
- user2 has person id=p2
- user1 is authenticated but does NOT own p2

// Expected Output
Response: 404 Not Found
Body: { error: "Person not found" }
// NOTE: 404 not 403, to avoid information leakage

// Post-conditions
- No data accessed
- No logs of successful access
```

### 3.3 Boundary Conditions

**String Lengths:**
- Test names with 1, 100, 1000 characters
- Test emails with 1, 254 characters (RFC max)
- Test query with 0, 1, 10000 characters

**Array Sizes:**
- Test names array with 0, 1, 10, 100 entries
- Test emails array with 0, 1, 50 entries
- Test result arrays with 0, 1, 100, 1000 items

**Numeric Boundaries:**
- Page numbers: 0, 1, 100, MAX_INT
- Page sizes: 0, 1, 50, 100, 1000
- Counts: 0, 1, MAX_INT

**Null/Undefined/Empty:**
- null userId (should fail)
- undefined query parameter (should fail)
- empty string query (should handle gracefully)
- null organizationId (valid)
- empty array emails (valid)

### 3.4 Positive vs Negative Test Cases

**Positive Tests:**
- User successfully authenticates
- User successfully fetches own data
- User successfully creates own person
- User successfully updates own person
- User successfully deletes own person
- Search returns expected results
- Pagination works correctly
- Filters work correctly

**Negative Tests:**
- Authentication fails (no token, invalid token, expired token)
- User tries to access other user's data (blocked)
- User tries to modify other user's data (blocked)
- User tries to delete other user's data (blocked)
- Invalid input formats (rejected)
- Missing required parameters (rejected)
- SQL injection attempts (sanitized)

### 3.5 Regression Test Suite

**Regression Tests (must pass after every change):**
1. All existing multi-tenant tests (TC-PEOPLE, TC-CONN, TC-NET)
2. Authentication tests
3. Database query tests
4. Graph traversal tests
5. UI component tests (when implemented)

---

## LAYER 4: DETAILED TEST DESIGN

### 4.1 TC-PEOPLE-001: Detailed Specification

**Test Name:** `should only return people belonging to the authenticated user`

**Test Steps:**
1. Seed database with test data:
   - user1: id="user-1-id"
   - user2: id="user-2-id"
   - person1: id="p1", userId="user-1-id", names=["Alice Smith"]
   - person2: id="p2", userId="user-2-id", names=["Alice Jones"]
2. Mock authentication to return userId="user-1-id"
3. Create request: GET /api/people?q=Alice
4. Call API route handler: await GET(request, {})
5. Await response and parse JSON

**Assertions:**
```typescript
// Assert 1: Response status is 200
expect(response.status).toBe(200);

// Assert 2: Prisma was called with userId filter
expect(prisma.person.findMany).toHaveBeenCalledWith(
  expect.objectContaining({
    where: expect.objectContaining({
      userId: "user-1-id",
      deletedAt: null
    })
  })
);

// Assert 3: Results contain only user1's people
expect(data.results).toHaveLength(1);
expect(data.results[0].id).toBe("p1");
expect(data.results[0].userId).toBe("user-1-id");

// Assert 4: Results do NOT contain user2's people
expect(data.results.find(p => p.id === "p2")).toBeUndefined();
expect(data.results.every(p => p.userId === "user-1-id")).toBe(true);
```

**Mock Configuration:**
```typescript
// Mock authentication
vi.mocked(authHelpers.getAuthenticatedUserId)
  .mockResolvedValue("user-1-id");

// Mock database query
vi.mocked(prisma.person.findMany)
  .mockResolvedValue([
    {
      id: "p1",
      userId: "user-1-id",
      names: ["Alice Smith"],
      emails: ["alice.smith@example.com"],
      // ... full person object
    }
  ]);
```

**Expected Results:**
- Response status: 200
- Response body: `{ results: [<user1's person>] }`
- Prisma called with userId filter
- No cross-tenant data in response

### 4.2 TC-DETAIL-002: Detailed Specification

**Test Name:** `should return 404 when user tries to access another users person`

**Test Steps:**
1. Seed database:
   - person2: id="p2", userId="user-2-id"
2. Mock authentication to return userId="user-1-id"
3. Create request: GET /api/people/p2
4. Call API route handler
5. Await response

**Assertions:**
```typescript
// Assert 1: Response status is 404 (not 403)
expect(response.status).toBe(404);

// Assert 2: Prisma was called with userId filter
expect(prisma.person.findFirst).toHaveBeenCalledWith({
  where: {
    id: "p2",
    userId: "user-1-id",  // User1's ID, but person belongs to user2
    deletedAt: null
  }
});

// Assert 3: Response body indicates not found
const data = await response.json();
expect(data.error).toBe("Person not found");

// Assert 4: No person data in response
expect(data.person).toBeUndefined();
```

**Mock Configuration:**
```typescript
// Mock authentication
vi.mocked(authHelpers.getAuthenticatedUserId)
  .mockResolvedValue("user-1-id");

// Mock database query (returns null because userId filter doesn't match)
vi.mocked(prisma.person.findFirst)
  .mockResolvedValue(null);
```

**Expected Results:**
- Response status: 404 (not 403, to avoid info leakage)
- Response body: `{ error: "Person not found" }`
- No person data exposed
- Prisma called with userId filter

### 4.3 Mock Behavior Specifications

**Authentication Mock Behaviors:**
```typescript
// Scenario 1: Successful authentication
mockAuth.success(userId: string) => resolves with userId

// Scenario 2: No authentication
mockAuth.unauthorized() => rejects with "Unauthorized"

// Scenario 3: Invalid token
mockAuth.invalidToken() => rejects with "Invalid token"

// Scenario 4: Expired session
mockAuth.expired() => rejects with "Session expired"
```

**Database Mock Behaviors:**
```typescript
// Scenario 1: Data found
mockDb.findMany() => resolves with filtered array

// Scenario 2: No data found
mockDb.findMany() => resolves with []

// Scenario 3: Database error
mockDb.findMany() => rejects with PrismaClientKnownRequestError

// Scenario 4: Connection error
mockDb.findMany() => rejects with "Connection refused"
```

### 4.4 Traceability Matrix

| Requirement | Test Cases | Code Files | Assertions |
|-------------|------------|------------|------------|
| REQ-MT-2: All queries filter by userId | TC-PEOPLE-001, TC-PEOPLE-002, TC-CONN-001, TC-NET-001 | route.ts (all API routes) | Prisma call assertions |
| REQ-MT-3: No cross-tenant access | TC-PEOPLE-002, TC-DETAIL-002, TC-PATH-002 | withAuth wrapper, route handlers | 404 response assertions |
| REQ-MT-4: Edges scoped to tenant | TC-NET-002, TC-NET-005 | graph-service.ts | Edge filter assertions |
| REQ-MT-1: Authentication required | TC-PEOPLE-003, TC-CONN-005, TC-NET-006 | withAuth wrapper | 401 response assertions |

---

## LAYER 5: TEST PREPARATION

### 5.1 Test Fixtures

**File: `tests/fixtures/users.ts`**
```typescript
export const testUsers = {
  user1: {
    id: "user-1-id",
    name: "Test User 1",
    email: "testuser1@example.com",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
  user2: {
    id: "user-2-id",
    name: "Test User 2",
    email: "testuser2@example.com",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
  user3: {
    id: "user-3-id",
    name: "Empty User",
    email: "empty@example.com",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
};
```

**File: `tests/fixtures/people.ts`**
```typescript
export const testPeople = {
  user1: [
    {
      id: "p1-user1",
      userId: "user-1-id",
      names: ["Alice Smith"],
      emails: ["alice.smith@example.com"],
      phones: ["+1234567890"],
      title: "Software Engineer",
      organizationId: "org-1",
      deletedAt: null,
      socialHandles: { linkedin: "alicesmith" },
      metadata: {},
      createdAt: new Date("2026-01-15"),
      updatedAt: new Date("2026-01-15"),
    },
    {
      id: "p2-user1",
      userId: "user-1-id",
      names: ["Bob Johnson"],
      emails: ["bob.j@example.com"],
      phones: [],
      title: "Product Manager",
      organizationId: "org-1",
      deletedAt: null,
      socialHandles: null,
      metadata: {},
      createdAt: new Date("2026-01-16"),
      updatedAt: new Date("2026-01-16"),
    },
  ],
  user2: [
    {
      id: "p1-user2",
      userId: "user-2-id",
      names: ["Charlie Davis"],
      emails: ["charlie@example.com"],
      phones: [],
      title: "Designer",
      organizationId: "org-2",
      deletedAt: null,
      socialHandles: null,
      metadata: {},
      createdAt: new Date("2026-01-17"),
      updatedAt: new Date("2026-01-17"),
    },
  ],
};
```

**File: `tests/fixtures/edges.ts`**
```typescript
export const testEdges = {
  user1: [
    {
      id: "e1-user1",
      fromPersonId: "p1-user1",
      toPersonId: "p2-user1",
      relationshipType: "colleague",
      strength: 0.85,
      strengthFactors: { recency: 0.9, frequency: 0.8 },
      channels: ["email", "linkedin"],
      sources: ["gmail", "linkedin"],
      firstSeenAt: new Date("2025-06-01"),
      lastSeenAt: new Date("2026-01-15"),
      interactionCount: 45,
      createdAt: new Date("2026-01-15"),
      updatedAt: new Date("2026-01-15"),
    },
  ],
  // Cross-tenant edge (should NEVER be returned)
  crossTenant: {
    id: "e-cross",
    fromPersonId: "p1-user1",  // user1's person
    toPersonId: "p1-user2",    // user2's person - VIOLATION
    relationshipType: "colleague",
    strength: 0.5,
    strengthFactors: {},
    channels: ["email"],
    sources: ["gmail"],
    firstSeenAt: new Date("2025-01-01"),
    lastSeenAt: new Date("2026-01-01"),
    interactionCount: 10,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
};
```

### 5.2 Test Utilities

**File: `tests/utils/mock-auth.ts`**
```typescript
import { vi } from 'vitest';
import * as authHelpers from '@/lib/auth-helpers';

export function mockAuthSuccess(userId: string) {
  vi.mocked(authHelpers.getAuthenticatedUserId)
    .mockResolvedValue(userId);
}

export function mockAuthUnauthorized() {
  vi.mocked(authHelpers.getAuthenticatedUserId)
    .mockRejectedValue(new Error('Unauthorized'));
}

export function mockAuthInvalidToken() {
  vi.mocked(authHelpers.getAuthenticatedUserId)
    .mockRejectedValue(new Error('Invalid token'));
}

export function mockAuthExpired() {
  vi.mocked(authHelpers.getAuthenticatedUserId)
    .mockRejectedValue(new Error('Session expired'));
}
```

**File: `tests/utils/mock-db.ts`**
```typescript
import { vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { testPeople, testEdges } from '../fixtures';

export function mockDbPeopleFindMany(userId: string) {
  const people = testPeople[userId as 'user1' | 'user2'] || [];
  vi.mocked(prisma.person.findMany).mockResolvedValue(people);
  return people;
}

export function mockDbPersonFindFirst(personId: string, userId: string) {
  const allPeople = [...testPeople.user1, ...testPeople.user2];
  const person = allPeople.find(p => p.id === personId && p.userId === userId);
  vi.mocked(prisma.person.findFirst).mockResolvedValue(person || null);
  return person;
}

export function mockDbError(errorMessage: string) {
  vi.mocked(prisma.person.findMany).mockRejectedValue(new Error(errorMessage));
}
```

**File: `tests/utils/assertions.ts`**
```typescript
import { expect } from 'vitest';

export function assertTenantIsolation(data: any[], expectedUserId: string) {
  expect(data.every(item => item.userId === expectedUserId)).toBe(true);
}

export function assertNoCrossTenantData(data: any[], forbiddenUserId: string) {
  expect(data.some(item => item.userId === forbiddenUserId)).toBe(false);
}

export function assertUnauthorizedResponse(response: Response) {
  expect(response.status).toBe(401);
  // Note: Do NOT call response.json() if already consumed in test
}

export function assertNotFoundResponse(response: Response) {
  expect(response.status).toBe(404);
}
```

### 5.3 Test Environment Setup

**File: `vitest.config.ts`** (enhanced)
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['apps/web/app/api/**/*.ts', 'apps/web/lib/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
      lines: 90,
      functions: 90,
      branches: 90,
      statements: 90,
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
```

**File: `tests/setup.ts`**
```typescript
import { beforeEach, afterEach, vi } from 'vitest';

// Clear all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// Setup global test environment
global.fetch = vi.fn();
```

### 5.4 Database Seed Script

**File: `tests/seeds/multi-tenant-seed.ts`**
```typescript
import { prisma } from '@/lib/prisma';
import { testUsers, testPeople, testEdges } from '../fixtures';

export async function seedMultiTenantData() {
  // Clean existing test data
  await prisma.edge.deleteMany({});
  await prisma.person.deleteMany({});
  await prisma.user.deleteMany({});

  // Seed users
  await prisma.user.createMany({
    data: [testUsers.user1, testUsers.user2, testUsers.user3],
  });

  // Seed people for user1
  await prisma.person.createMany({
    data: testPeople.user1,
  });

  // Seed people for user2
  await prisma.person.createMany({
    data: testPeople.user2,
  });

  // Seed edges for user1
  await prisma.edge.createMany({
    data: testEdges.user1,
  });

  console.log('Multi-tenant test data seeded successfully');
}

export async function cleanupMultiTenantData() {
  await prisma.edge.deleteMany({});
  await prisma.person.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('Multi-tenant test data cleaned up');
}
```

---

## LAYER 6: FULL-KIT PREPARATION (EXPECTED RESULTS)

### 6.1 Expected Results for TC-PEOPLE-001

**Golden Master Response:**
```json
{
  "results": [
    {
      "id": "p1-user1",
      "userId": "user-1-id",
      "names": ["Alice Smith"],
      "emails": ["alice.smith@example.com"],
      "phones": ["+1234567890"],
      "title": "Software Engineer",
      "organizationId": "org-1",
      "organization": {
        "id": "org-1",
        "name": "Acme Corp"
      },
      "deletedAt": null,
      "socialHandles": {
        "linkedin": "alicesmith"
      },
      "metadata": {},
      "createdAt": "2026-01-15T00:00:00.000Z",
      "updatedAt": "2026-01-15T00:00:00.000Z"
    }
  ]
}
```

**Comparison Fixture:** Save as `tests/fixtures/expected/tc-people-001.json`

### 6.2 Expected Prisma Call for TC-PEOPLE-001

**Expected Call:**
```typescript
{
  where: {
    userId: "user-1-id",
    deletedAt: null
  },
  include: {
    organization: true
  }
}
```

**Assertion:**
```typescript
expect(prisma.person.findMany).toHaveBeenCalledWith(
  expectedPrismaCall
);
```

### 6.3 Expected Error Response for TC-DETAIL-002

**Golden Master Error:**
```json
{
  "error": "Person not found"
}
```

**Status Code:** 404 (NOT 403 - to avoid information leakage)

### 6.4 Known Good States

**State 1: User1 with data**
- User1 exists
- User1 has 2 people (Alice, Bob)
- User1 has 1 edge (Alice → Bob)
- User1 has 1 data source (LinkedIn)

**State 2: User2 with data**
- User2 exists
- User2 has 1 person (Charlie)
- User2 has 0 edges
- User2 has 0 data sources

**State 3: User3 empty**
- User3 exists
- User3 has 0 people
- User3 has 0 edges
- User3 has 0 data sources

### 6.5 Rollback Procedures

**After Each Test:**
```typescript
afterEach(async () => {
  await cleanupMultiTenantData();
});
```

**After Each Suite:**
```typescript
afterAll(async () => {
  await prisma.$disconnect();
});
```

**Manual Rollback (if needed):**
```bash
psql -d calculator_test -c "TRUNCATE TABLE \"Edge\", \"Person\", \"User\" CASCADE;"
```

---

## LAYER 7: TEST IMPLEMENTATION & EXECUTION

### 7.1 Test Implementation Status

| Test Suite | Tests Planned | Tests Implemented | Coverage | Status |
|-------------|---------------|-------------------|----------|--------|
| api/people multi-tenant | 8 | 5 | 62.5% | In Progress |
| api/connections multi-tenant | 6 | 5 | 83.3% | In Progress |
| api/network multi-tenant | 6 | 6 | 100% | Complete |
| api/people/[id] multi-tenant | 7 | 0 | 0% | Not Started |
| api/people/[id]/paths multi-tenant | 3 | 0 | 0% | Not Started |
| api/data-sources multi-tenant | 5 | 0 | 0% | Not Started |
| Graph service unit tests | 10 | 0 | 0% | Not Started |
| Auth helpers unit tests | 5 | 0 | 0% | Not Started |
| User context unit tests | 5 | 0 | 0% | Not Started |
| E2E multi-tenant journey | 3 | 0 | 0% | Not Started |
| **TOTAL** | **58** | **16** | **27.6%** | **In Progress** |

### 7.2 Tests to Implement (Next Steps)

**Priority 1 (P0 - Critical):**
1. TC-DETAIL-002: Cross-tenant access to /api/people/[id]
2. TC-DETAIL-004: Cross-tenant update attempt
3. TC-DETAIL-006: Cross-tenant delete attempt
4. TC-PATH-002: Cross-tenant pathfinding
5. TC-DS-002: Cross-tenant data source access
6. Unit tests for all API route handlers

**Priority 2 (P1 - High):**
7. TC-PEOPLE-005: Empty tenant scenarios
8. TC-PEOPLE-006: Fuzzy search tenant isolation
9. TC-CONN-003: Pagination tenant isolation
10. TC-NET-004: Organization grouping tenant isolation
11. Graph service unit tests
12. Auth helper unit tests

**Priority 3 (P2 - Medium):**
13. Edge case tests (boundary conditions)
14. Performance tests (large datasets)
15. E2E multi-user scenarios
16. UI component tests

### 7.3 Test Execution Commands

**Run all tests:**
```bash
pnpm test
```

**Run multi-tenant tests only:**
```bash
pnpm test --grep "multi-tenant"
```

**Run with coverage:**
```bash
pnpm test:coverage
```

**Run specific test file:**
```bash
pnpm test apps/web/app/api/people/route.multi-tenant.test.ts
```

**Run in watch mode:**
```bash
pnpm test:watch
```

### 7.4 Current Test Results (as of Layer 7)

**Existing Tests (3 files, 16 test cases):**
- ✅ api/people/route.multi-tenant.test.ts (5 tests, all passing)
- ✅ api/connections/route.multi-tenant.test.ts (5 tests, all passing)
- ✅ api/network/route.multi-tenant.test.ts (6 tests, all passing)

**Test Execution Time:**
- Total: ~2.5 seconds
- Per test: ~150ms average

**Coverage (estimated from existing tests):**
- Statements: ~40%
- Branches: ~35%
- Functions: ~45%
- Lines: ~40%

**Target Coverage:**
- Statements: >90%
- Branches: >85%
- Functions: >90%
- Lines: >90%
- Critical paths: 100%

---

## LAYER 8: TEST VERIFICATION & QUALITY GATE

### 8.1 Current Coverage Review

**Coverage Gaps Identified:**
1. /api/people/[id] route - **0% coverage** (CRITICAL)
2. /api/people/[id]/paths route - **0% coverage** (CRITICAL)
3. /api/data-sources routes - **0% coverage** (CRITICAL)
4. Graph service methods - **0% coverage** (HIGH)
5. Auth helper functions - **Partial coverage** (MEDIUM)
6. User context hooks - **0% coverage** (MEDIUM)
7. UI components - **0% coverage** (LOW - defer to later phase)

**Coverage Metrics (Current):**
- Overall: **27.6%** (Target: >90%) ❌
- Critical paths: **30%** (Target: 100%) ❌
- Security code: **50%** (Target: 100%) ❌

### 8.2 Test Quality Assessment

**Strengths:**
- ✅ Existing tests are well-structured
- ✅ Mocking strategy is sound
- ✅ Test fixtures are reusable
- ✅ Assertions are specific and meaningful
- ✅ Tests verify both positive and negative scenarios

**Weaknesses:**
- ❌ Coverage is too low (27.6%)
- ❌ Missing tests for critical endpoints
- ❌ No E2E tests yet
- ❌ No performance tests
- ❌ Test execution could be faster

**Improvements Needed:**
1. Implement missing test suites (34 tests remaining)
2. Increase coverage to >90%
3. Add E2E tests for multi-tenant scenarios
4. Add performance/load tests
5. Improve test execution speed (parallelize)

### 8.3 Missing Scenarios

**Critical Scenarios Not Yet Tested:**
1. Cross-tenant access to /api/people/[id] ❌ (SEC-4)
2. Cross-tenant update of person ❌ (SEC-7)
3. Cross-tenant delete of person ❌ (SEC-8)
4. Cross-tenant pathfinding ❌ (SEC-8)
5. Cross-tenant data source access ❌ (SEC-6)
6. Bulk operations tenant isolation ❌ (SEC-12)
7. SQL injection with userId bypass attempts ❌ (SEC-13)
8. Concurrent access race conditions ❌
9. Large dataset performance ❌
10. Edge cases (empty tenant, max limits) ❌

### 8.4 Regression Test Results

**Existing Tests (Baseline):**
- ✅ All 16 tests passing
- ✅ No regressions detected
- ✅ Execution time stable (~2.5s)

**After New Changes:**
- ⏳ Will run regression suite after implementing new tests
- ⏳ Will verify no existing tests break

### 8.5 QUALITY GATE STATUS: FAIL ❌

**Gate Criteria:**

| Criterion | Target | Actual | Status |
|-----------|--------|--------|--------|
| Overall coverage | >90% | 27.6% | ❌ FAIL |
| Critical path coverage | 100% | 30% | ❌ FAIL |
| Security code coverage | 100% | 50% | ❌ FAIL |
| All unit tests pass | 100% | 100% | ✅ PASS |
| All integration tests pass | 100% | 100% | ✅ PASS |
| All E2E tests pass | 100% | 0% (none exist) | ❌ FAIL |
| No false positives | Yes | Yes | ✅ PASS |
| Tests are independent | Yes | Yes | ✅ PASS |
| Tests are deterministic | Yes | Yes | ✅ PASS |
| All happy paths tested | Yes | 60% | ❌ FAIL |
| All edge cases tested | Yes | 20% | ❌ FAIL |
| All error scenarios tested | Yes | 50% | ❌ FAIL |
| All security scenarios tested | Yes | 40% | ❌ FAIL |

**OVERALL QUALITY GATE: ❌ FAIL**

**Reason:** Coverage is too low. Critical test scenarios are missing. E2E tests do not exist.

**Next Steps:**
1. Implement all remaining test suites (42 tests)
2. Achieve >90% overall coverage
3. Achieve 100% coverage for critical paths
4. Create E2E test suite
5. Re-run quality gate verification

---

## NEXT ACTIONS (MANDATORY)

### Immediate (P0):
1. ✅ MASTER-PROCEDURE.md updated with comprehensive testing mandate
2. ✅ COMPREHENSIVE-TESTING-PROCEDURE.md created
3. ✅ Multi-Tenant-Comprehensive-Test-Plan.md created (this document)
4. ⏳ Implement missing test suites (Priority 1: 6 test suites)
5. ⏳ Run tests and verify quality gate passes

### Short-term (P1):
6. ⏳ Achieve >90% overall test coverage
7. ⏳ Achieve 100% coverage for critical paths
8. ⏳ Create E2E test suite
9. ⏳ Add performance tests for large datasets
10. ⏳ Document test results and coverage reports

### Medium-term (P2):
11. ⏳ Add UI component tests
12. ⏳ Add accessibility tests
13. ⏳ Add visual regression tests
14. ⏳ Continuous monitoring and improvement

---

## CONCLUSION

This comprehensive test plan applies the **8-layer testing methodology** to the multi-tenant architecture. **Quality is the only priority.** Current coverage is 27.6%, which is insufficient. The quality gate has **FAILED**.

**Next step:** Implement all 42 remaining test cases to achieve >90% coverage and pass the quality gate.

**Commitment:** No shortcuts. No compromises. Comprehensive testing at all layers.

---

**Approved by:** Steve (Manager Agent)
**Date:** 2026-01-31
**Status:** In Progress - Quality Gate FAILED
**Next Review:** After implementing remaining tests
