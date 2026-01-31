# Architecture Decision: Vitest Mock Strategy for withAuth Wrapper

**Date:** 2026-01-31 13:20
**Status:** Approved
**Decision Maker:** Steve (Manager Agent)
**Context:** Multi-tenant testing comprehensive coverage initiative

## Problem Statement

12 integration tests for `/api/people/[id]` route are blocked due to Vitest mocking issue. The `withAuth` function from `@/lib/auth-helpers` is not being properly mocked, causing tests to fail with:

```
[vitest] No "withAuth" export is defined on the "@/lib/auth-helpers" mock.
Did you forget to return it from "vi.mock"?
```

Current mock strategy only returns `getAuthenticatedUserId` but API routes use `withAuth` wrapper function.

## Root Cause Analysis

The `auth-helpers.ts` module exports multiple functions:
- `getAuthenticatedUserId()` - async function to get user ID
- `withAuth()` - HOF wrapper for API routes
- `unauthorizedResponse()` - helper function
- `forbiddenResponse()` - helper function

Current test mocks only mock `getAuthenticatedUserId` but routes import and use `withAuth`. When tests run, Vitest cannot find `withAuth` in the mock, causing failures.

## Decision

**Implement comprehensive mock strategy that returns ALL exports from `auth-helpers` module.**

### Solution Architecture

```typescript
// Pattern 1: Full mock with passthrough for withAuth
vi.mock('@/lib/auth-helpers', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth-helpers')>('@/lib/auth-helpers');
  return {
    ...actual,  // Pass through all actual exports (withAuth, unauthorizedResponse, forbiddenResponse)
    getAuthenticatedUserId: vi.fn(),  // Only mock the auth check function
  };
});
```

### Rationale

1. **Minimal mocking**: Only mock what we need to control (authentication state)
2. **Real behavior**: Use actual `withAuth` wrapper logic to test integration
3. **Maintainability**: If `auth-helpers` adds new exports, tests don't break
4. **Test fidelity**: Tests verify actual integration behavior, not mocked behavior

### Alternative Considered (Rejected)

```typescript
// Pattern 2: Mock everything (REJECTED - too brittle)
vi.mock('@/lib/auth-helpers', () => ({
  getAuthenticatedUserId: vi.fn(),
  withAuth: vi.fn((handler) => handler),  // Mock wrapper
  unauthorizedResponse: vi.fn(),
  forbiddenResponse: vi.fn(),
}));
```

**Why rejected:** This approach mocks too much. The `withAuth` wrapper contains critical security logic (error handling, auth flow) that should be tested, not mocked.

## Implementation Plan

### Phase 1: Fix Existing Tests (P0)
1. Update all existing test files to use comprehensive mock pattern
2. Verify 16 passing tests still pass
3. Unblock 12 tests in `route.multi-tenant.test.ts`

### Phase 2: Create Reusable Test Utilities (P0)
Create `apps/web/test-utils/mock-auth.ts`:
```typescript
import { vi } from 'vitest';

/**
 * Setup auth mocks for testing
 * Returns actual withAuth wrapper but mocks getAuthenticatedUserId
 */
export function setupAuthMocks() {
  vi.mock('@/lib/auth-helpers', async () => {
    const actual = await vi.importActual<typeof import('@/lib/auth-helpers')>('@/lib/auth-helpers');
    return {
      ...actual,
      getAuthenticatedUserId: vi.fn(),
    };
  });
}

/**
 * Mock successful authentication
 */
export function mockAuthSuccess(userId: string) {
  const authHelpers = await import('@/lib/auth-helpers');
  vi.mocked(authHelpers.getAuthenticatedUserId).mockResolvedValue(userId);
}

/**
 * Mock authentication failure
 */
export function mockAuthFailure(error = 'Unauthorized') {
  const authHelpers = await import('@/lib/auth-helpers');
  vi.mocked(authHelpers.getAuthenticatedUserId).mockRejectedValue(new Error(error));
}
```

### Phase 3: Apply to All Test Files (P1)
Update all multi-tenant test files:
- `app/api/people/route.multi-tenant.test.ts`
- `app/api/people/[id]/route.multi-tenant.test.ts`
- `app/api/connections/route.multi-tenant.test.ts`
- `app/api/network/route.multi-tenant.test.ts`
- Future test files

## Quality Gates

- All 16 existing passing tests continue to pass
- All 12 blocked tests in `/api/people/[id]` route pass
- Test execution time remains under 5 seconds
- No false positives or false negatives
- Mock strategy documented for future developers

## Impact Assessment

### Benefits
- Unblocks 12 critical security tests
- Provides reusable pattern for all future API route tests
- Tests actual integration behavior, not mocked behavior
- Reduces maintenance burden

### Risks
- Minimal: Using actual `withAuth` means auth logic is tested, not mocked
- Mitigation: Clear documentation of mock pattern

## Success Metrics

- 28 tests passing (16 existing + 12 unblocked)
- 0 test failures related to mocking
- Test coverage increases from 27.6% to >40%
- Foundation laid for implementing remaining 42 tests

## References

- Vitest mocking documentation: https://vitest.dev/guide/mocking.html
- Issue: 12 tests blocked by withAuth mock
- Test plan: `docs/testing/Multi-Tenant-Comprehensive-Test-Plan.md`
- Auth helpers: `apps/web/lib/auth-helpers.ts`

## Approval

**Approved by:** Steve (Manager Agent)
**Date:** 2026-01-31 13:20
**Status:** APPROVED - Proceed with implementation

---

## Implementation Notes

This decision unblocks critical path for comprehensive testing initiative. Quality over speed - we implement correctly, not quickly.
