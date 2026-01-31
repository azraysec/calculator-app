# API Routes Audit - Multi-Tenant Isolation

**Date:** 2026-01-31
**Purpose:** Identify all API routes that need userId filtering for multi-tenant isolation

---

## Summary

| Category | Count |
|----------|-------|
| **SECURE** - Already uses withAuth + userId filter | 2 |
| **NEEDS UPDATE** - Missing withAuth or userId filter | 5 |
| **NO ACTION** - Admin/public endpoints | 8 |

---

## Routes Requiring Updates

### 1. /api/people - GET (CRITICAL)
- **File:** `apps/web/app/api/people/route.ts`
- **Current Auth:** None
- **Models Queried:** Person, Organization
- **Issue:** Fetches all people without userId filter
- **Action Required:**
  - Add `withAuth` wrapper
  - Add `where: { userId, deletedAt: null }` filter
  - Filter allPeople array by userId

### 2. /api/people/[id] - GET (CRITICAL)
- **File:** `apps/web/app/api/people/[id]/route.ts`
- **Current Auth:** None
- **Models Queried:** Person, Edge, EvidenceEvent, Conversation, Message
- **Issue:** Any user can access any person by ID
- **Action Required:**
  - Add `withAuth` wrapper
  - Add `where: { id, userId, deletedAt: null }` to person lookup
  - Add userId filter to evidence query
  - Add userId filter to conversation query
  - Add userId filter to edge queries

### 3. /api/connections - GET (CRITICAL)
- **File:** `apps/web/app/api/connections/route.ts`
- **Current Auth:** None
- **Models Queried:** Person, Edge
- **Issue:** Returns all connections regardless of user
- **Action Required:**
  - Add `withAuth` wrapper
  - Add `userId` to where clause
  - Add userId filter to edge queries

### 4. /api/network - GET (CRITICAL)
- **File:** `apps/web/app/api/network/route.ts`
- **Current Auth:** None
- **Models Queried:** Person, Edge
- **Issue:** Returns entire network graph without user filter
- **Action Required:**
  - Add `withAuth` wrapper
  - Add `where: { userId, deletedAt: null }` to people query
  - Filter edges to only include edges between user's people

### 5. /api/people/[id]/paths - GET (MEDIUM)
- **File:** `apps/web/app/api/people/[id]/paths/route.ts`
- **Current Auth:** None
- **Models Queried:** Uses GraphService (Person, Edge)
- **Issue:** Uses graph service without userId context
- **Action Required:**
  - Add `withAuth` wrapper
  - Pass userId to `createGraphService(userId)`
  - Update graph service to accept and use userId parameter

### 6. /api/linkedin/profile - POST (LOW)
- **File:** `apps/web/app/api/linkedin/profile/route.ts`
- **Current Auth:** None
- **Models Queried:** Person
- **Issue:** Person lookup doesn't filter by userId
- **Action Required:**
  - Add `withAuth` wrapper
  - Add `userId` to person search query

---

## Already Secure

### 1. /api/evidence - GET ✅
- **File:** `apps/web/app/api/evidence/route.ts`
- **Current Auth:** Uses `withAuth`
- **Tenant Isolation:** Filters by userId in evidence query
- **Status:** SECURE - No changes needed

### 2. /api/me - GET ✅
- **File:** `apps/web/app/api/me/route.ts`
- **Current Auth:** Uses `withAuth`
- **Tenant Isolation:** Only returns current user's data
- **Status:** SECURE - No changes needed

---

## No Action Required (Admin/Public/Non-Tenant Routes)

### 1. /api/health - GET
- **Type:** Health check endpoint
- **Action:** No auth required (public)

### 2. /api/health/ready - GET
- **Type:** Readiness probe
- **Action:** No auth required (public)

### 3. /api/inngest - POST
- **Type:** Inngest webhook handler
- **Action:** Uses webhook auth, not user auth

### 4. /api/admin/linkedin-jobs - GET
- **Type:** Admin endpoint
- **Action:** Requires admin role (separate auth)

### 5. /api/admin/linkedin-jobs/cleanup - POST
- **Type:** Admin endpoint
- **Action:** Requires admin role (separate auth)

### 6. /api/admin/inspect-archive - POST
- **Type:** Admin endpoint
- **Action:** Requires admin role (separate auth)

### 7. /api/cron/gmail-sync - POST
- **Type:** Cron job
- **Action:** Uses cron auth header

### 8. /api/cron/linkedin-process - POST
- **Type:** Cron job
- **Action:** Uses cron auth header

---

## Graph Service Updates Required

The graph service is used by multiple routes and needs userId context:

**Files:**
- `apps/web/lib/graph-service.ts` (factory)
- `packages/core/src/graph-service.ts` (implementation)

**Changes Needed:**
1. Add `userId` parameter to `createGraphService(userId)` factory
2. Update all Prisma queries in factory to filter by userId:
   - `getPerson` - Add `where: { id, userId, deletedAt: null }`
   - `getOutgoingEdges` - Join with Person table to filter by userId
   - `getIncomingEdges` - Join with Person table to filter by userId
   - `getAllPeople` - Add `where: { userId, deletedAt: null }`
   - `getStats` - Add userId filters to all count queries

---

## Priority Matrix

| Route | Risk Level | Impact | Priority |
|-------|------------|--------|----------|
| /api/people | HIGH | Complete data leakage | P0 |
| /api/people/[id] | HIGH | Cross-tenant access | P0 |
| /api/connections | HIGH | Full network exposure | P0 |
| /api/network | HIGH | Complete graph leakage | P0 |
| /api/people/[id]/paths | MEDIUM | Graph traversal leak | P1 |
| /api/linkedin/profile | LOW | Lookup only, no writes | P2 |

---

## Testing Requirements

Each updated route must have:
1. Test: Authenticated user can only see their own data
2. Test: Authenticated user cannot access other user's data (404, not 403)
3. Test: Unauthenticated request returns 401

---

## Next Steps

1. Update P0 routes first: /api/people, /api/people/[id], /api/connections, /api/network
2. Update graph service with userId parameter
3. Update P1/P2 routes
4. Write tenant isolation tests
5. Manual testing with multiple users
