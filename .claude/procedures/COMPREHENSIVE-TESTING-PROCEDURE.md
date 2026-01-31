# COMPREHENSIVE TESTING PROCEDURE
**MANDATORY FOR ALL WORK - QUALITY OVER SPEED**

## Prime Directive
**The only thing that matters is quality of delivery.**
- Spare no time on comprehensive testing
- Test everything, assume nothing
- Multi-layered approach is mandatory
- Never skip testing layers
- Quality > Speed, always

---

## Overview: The 8-Layer Testing Methodology

This procedure defines the exhaustive, multi-layered testing approach required for ALL work. Each layer builds on the previous, creating a comprehensive quality assurance framework.

### The 8 Layers
1. High-Level Test Planning
2. High-Level Test Design
3. Mid-Level Test Design
4. Detailed Test Design
5. Test Preparation
6. Full-Kit Preparation (Expected Results)
7. Test Implementation & Execution
8. Test Verification & Quality Gate

---

## Layer 1: High-Level Test Planning
**Purpose:** Identify what needs to be tested and why

### Steps
1. **Feature/System Analysis**
   - Review the feature/change being implemented
   - Identify all affected systems and components
   - Map all integration points and dependencies
   - Document the scope of testing

2. **Scenario Identification**
   - List all user scenarios (happy path)
   - List all edge cases
   - List all error scenarios
   - List all boundary conditions
   - List all security scenarios (auth, authz, data isolation)

3. **Requirements Mapping**
   - Map each requirement to test scenarios
   - Identify acceptance criteria for each requirement
   - Document business rules that must be validated
   - List compliance requirements (GDPR, multi-tenant isolation, etc.)

4. **Risk Assessment**
   - Identify high-risk areas (security, data integrity, performance)
   - Prioritize testing effort based on risk
   - Document critical paths that must have 100% coverage
   - Identify regression risks

5. **Test Type Planning**
   - Unit tests: Which functions/methods need testing?
   - Integration tests: Which API endpoints? Database operations?
   - E2E tests: Which user journeys?
   - Security tests: Authentication, authorization, data isolation?
   - Performance tests: Bottlenecks, load testing needs?

### Deliverables
- [ ] Test scope document
- [ ] List of all scenarios (happy path, edge cases, errors)
- [ ] Requirements-to-tests traceability matrix
- [ ] Risk assessment with critical path identification
- [ ] Test type breakdown (unit, integration, E2E, security, performance)

---

## Layer 2: High-Level Test Design
**Purpose:** Design the testing strategy and architecture

### Steps
1. **Test Strategy Design**
   - Define testing pyramid (ratio of unit:integration:E2E)
   - Choose testing frameworks and tools
   - Design test execution order
   - Plan test isolation strategy
   - Design test data management approach

2. **Coverage Target Setting**
   - Set coverage targets (aim for >90% overall, 100% critical paths)
   - Define what "critical path" means for this feature
   - Identify coverage gaps in existing tests
   - Plan how to measure coverage

3. **Test Data Requirements**
   - Identify all test data needed
   - Plan test database seeds
   - Design test fixtures structure
   - Plan mock data generation
   - Document data cleanup/rollback strategy

4. **Mock & Stub Strategy**
   - Identify external dependencies to mock
   - Plan API mocking strategy
   - Design stub implementations
   - Plan test doubles for complex services
   - Document mock behavior specifications

5. **Test Environment Planning**
   - Design test environment setup
   - Plan test database configuration
   - Identify environment variables needed
   - Plan CI/CD integration
   - Document cleanup procedures

### Deliverables
- [ ] Test strategy document
- [ ] Coverage targets defined (>90% overall, 100% critical)
- [ ] Test data requirements specification
- [ ] Mock/stub architecture diagram
- [ ] Test environment setup documentation

---

## Layer 3: Mid-Level Test Design
**Purpose:** Break down scenarios into specific test cases

### Steps
1. **Test Case Decomposition**
   - Break each high-level scenario into specific test cases
   - Create test case IDs (TC-001, TC-002, etc.)
   - Document test case descriptions
   - Assign priority to each test case
   - Group related test cases into test suites

2. **Input/Output Specifications**
   - Define input data for each test case
   - Define expected outputs
   - Document pre-conditions
   - Document post-conditions
   - Specify setup and teardown requirements

3. **Boundary Condition Analysis**
   - Identify min/max values
   - Test empty/null/undefined inputs
   - Test boundary edge cases (0, -1, MAX_INT, etc.)
   - Test string length limits
   - Test array size limits

4. **Positive vs Negative Testing**
   - Design positive test cases (valid inputs → expected outputs)
   - Design negative test cases (invalid inputs → expected errors)
   - Test error handling and error messages
   - Test validation logic
   - Test graceful degradation

5. **Regression Test Design**
   - Identify existing functionality that could break
   - Design regression test cases
   - Plan regression test suite execution
   - Document regression testing strategy

### Deliverables
- [ ] Complete test case catalog with IDs
- [ ] Input/output specifications for each test case
- [ ] Boundary condition test cases
- [ ] Positive and negative test cases documented
- [ ] Regression test suite designed

---

## Layer 4: Detailed Test Design
**Purpose:** Write precise specifications for each test

### Steps
1. **Test Case Specifications**
   - Write detailed test steps for each test case
   - Define exact assertions for each test
   - Specify mock configurations
   - Document expected vs actual comparisons
   - Create test pseudocode

2. **Assertion Design**
   - Define all assertions (equality, truthiness, type checks)
   - Plan error assertion strategies
   - Design snapshot comparisons
   - Plan DOM/component assertions (for UI tests)
   - Specify database state assertions

3. **Mock Behavior Specification**
   - Define exact mock return values
   - Specify mock function call expectations
   - Design mock error scenarios
   - Document stub implementations
   - Plan spy/mock verification

4. **Expected Results Documentation**
   - Document expected function return values
   - Document expected API responses
   - Document expected database state changes
   - Document expected UI states
   - Create expected result templates

5. **Traceability Matrix**
   - Map requirements → test cases
   - Map test cases → code files
   - Map test cases → assertions
   - Document coverage gaps
   - Create bi-directional traceability

### Deliverables
- [ ] Detailed test specifications (test steps + assertions)
- [ ] Mock behavior specifications
- [ ] Expected results documentation
- [ ] Complete traceability matrix (requirements → tests → code)
- [ ] Coverage gap analysis

---

## Layer 5: Test Preparation
**Purpose:** Build the infrastructure for testing

### Steps
1. **Test Fixtures Creation**
   - Create sample data sets
   - Build database seed scripts
   - Create test JSON/YAML fixtures
   - Design reusable test objects
   - Document fixture usage

2. **Test Utilities Development**
   - Build test helper functions
   - Create test setup/teardown utilities
   - Design assertion helper functions
   - Build mock factories
   - Create test data generators

3. **Test Environment Setup**
   - Configure test databases
   - Set up test environment variables
   - Configure testing frameworks
   - Set up code coverage tools
   - Configure test runners

4. **Mock Infrastructure**
   - Implement mock functions
   - Create stub implementations
   - Build API mock servers (if needed)
   - Set up test doubles
   - Configure mock libraries

5. **Reusable Test Components**
   - Build reusable test components (for UI testing)
   - Create test factories
   - Design test builders
   - Create test object mothers
   - Build test data builders

### Deliverables
- [ ] Test fixtures (data, seeds, JSON files)
- [ ] Test utility functions
- [ ] Test environment configured
- [ ] Mock infrastructure implemented
- [ ] Reusable test components created

---

## Layer 6: Full-Kit Preparation (Expected Results)
**Purpose:** Generate and document expected results for all tests

### Steps
1. **Expected Result Generation**
   - Generate expected outputs for all test cases
   - Create golden master data sets
   - Document known good states
   - Build comparison fixtures
   - Create baseline snapshots

2. **Comparison Fixtures**
   - Create expected API response fixtures
   - Build expected database state fixtures
   - Generate expected UI snapshots
   - Document expected function outputs
   - Create expected error messages

3. **Golden Master Creation**
   - Identify golden master test cases
   - Generate golden master outputs
   - Document golden master usage
   - Plan golden master updates
   - Create golden master versioning strategy

4. **Known Good States**
   - Document valid initial states
   - Document valid end states
   - Create state transition maps
   - Document state invariants
   - Plan state verification strategy

5. **Rollback/Cleanup Procedures**
   - Design database rollback procedures
   - Plan test data cleanup
   - Create teardown scripts
   - Document cleanup order
   - Plan test isolation cleanup

### Deliverables
- [ ] Expected results for all test cases
- [ ] Comparison fixtures (API, DB, UI)
- [ ] Golden master data sets
- [ ] Known good state documentation
- [ ] Rollback/cleanup procedures

---

## Layer 7: Test Implementation & Execution
**Purpose:** Write and run all tests

### Steps
1. **Unit Test Implementation**
   - Write unit tests for all functions/methods
   - Test individual components in isolation
   - Mock all external dependencies
   - Test edge cases and boundaries
   - Aim for 100% coverage of critical functions

2. **Integration Test Implementation**
   - Write API endpoint tests
   - Test database operations
   - Test service interactions
   - Test authentication/authorization flows
   - Test multi-tenant data isolation

3. **E2E Test Implementation**
   - Write user journey tests
   - Test complete workflows
   - Test UI interactions
   - Test cross-component behavior
   - Test real-world scenarios

4. **Security Test Implementation**
   - Test authentication (valid/invalid credentials)
   - Test authorization (role-based access)
   - Test data isolation (multi-tenant security)
   - Test injection vulnerabilities
   - Test input validation

5. **Test Execution**
   - Run all unit tests: `pnpm test`
   - Run all integration tests: `pnpm test:integration`
   - Run all E2E tests: `pnpm test:e2e`
   - Run security tests
   - Generate coverage reports

### Deliverables
- [ ] All unit tests implemented and passing
- [ ] All integration tests implemented and passing
- [ ] All E2E tests implemented and passing
- [ ] All security tests implemented and passing
- [ ] Coverage reports generated

---

## Layer 8: Test Verification & Quality Gate
**Purpose:** Verify comprehensive testing and enforce quality standards

### Steps
1. **Coverage Review**
   - Review coverage reports
   - Verify >90% overall coverage
   - Verify 100% coverage for critical paths
   - Identify uncovered code
   - Document coverage gaps

2. **Test Quality Review**
   - Review test assertions (are they meaningful?)
   - Check for false positives
   - Check for false negatives
   - Verify tests are independent
   - Verify tests are deterministic

3. **Missing Scenario Identification**
   - Review test case catalog
   - Identify missing edge cases
   - Identify missing error scenarios
   - Identify missing security tests
   - Document gaps

4. **Regression Test Verification**
   - Run full regression test suite
   - Verify existing functionality still works
   - Check for unintended side effects
   - Verify backward compatibility
   - Document regression findings

5. **Quality Gate Enforcement**
   - **ALL TESTS MUST PASS** (no exceptions)
   - Coverage must meet targets (>90% overall, 100% critical)
   - No known bugs or failing tests
   - All critical scenarios covered
   - **DO NOT PROCEED until quality gate passes**

### Deliverables
- [ ] Coverage review report (>90% overall, 100% critical)
- [ ] Test quality assessment
- [ ] Gap analysis and remediation plan
- [ ] Regression test results (all passing)
- [ ] **QUALITY GATE PASS/FAIL decision**

---

## Quality Gate Criteria (MANDATORY)
**ALL criteria must be met before proceeding:**

### Coverage Requirements
- [ ] >90% overall test coverage
- [ ] 100% coverage for critical paths
- [ ] 100% coverage for security-sensitive code
- [ ] 100% coverage for data access layer

### Test Passing Requirements
- [ ] All unit tests pass (0 failures)
- [ ] All integration tests pass (0 failures)
- [ ] All E2E tests pass (0 failures)
- [ ] All security tests pass (0 failures)
- [ ] All regression tests pass (0 failures)

### Test Quality Requirements
- [ ] No false positives/negatives
- [ ] Tests are independent (can run in any order)
- [ ] Tests are deterministic (same input → same result)
- [ ] Tests are fast (unit tests <1s, integration <10s)
- [ ] Tests are maintainable (clear, well-documented)

### Scenario Coverage Requirements
- [ ] All happy path scenarios tested
- [ ] All edge cases tested
- [ ] All error scenarios tested
- [ ] All security scenarios tested
- [ ] All boundary conditions tested

### Documentation Requirements
- [ ] Test plan documented
- [ ] Test cases documented
- [ ] Expected results documented
- [ ] Traceability matrix complete
- [ ] Coverage gaps documented (if any)

---

## When to Apply This Procedure
**ALWAYS. NO EXCEPTIONS.**

Apply comprehensive multi-layered testing to:
- Every new feature
- Every bug fix
- Every refactor
- Every database migration
- Every API endpoint
- Every component
- Every service
- Every configuration change
- EVERY code change, no matter how small

---

## Test Types by Layer

### Unit Tests (Layer 7)
- Test individual functions/methods in isolation
- Mock all external dependencies
- Fast execution (<1s per test)
- High coverage (aim for >95%)

### Integration Tests (Layer 7)
- Test API endpoints end-to-end
- Test database operations
- Test service interactions
- Test authentication/authorization
- Slower execution (<10s per test)

### E2E Tests (Layer 7)
- Test complete user journeys
- Test UI interactions
- Test real-world workflows
- Slowest execution (10-60s per test)
- Lower quantity, high value

### Security Tests (Layer 7)
- Test authentication flows
- Test authorization rules
- Test multi-tenant data isolation
- Test injection vulnerabilities
- Test input validation

### Performance Tests (Optional, as needed)
- Load testing
- Stress testing
- Bottleneck identification
- Scalability testing

---

## Testing Anti-Patterns to Avoid
- ❌ Skipping testing layers
- ❌ Writing tests after deployment
- ❌ Accepting low coverage (<90%)
- ❌ Ignoring failing tests
- ❌ Testing only happy paths
- ❌ Not testing edge cases
- ❌ Not testing error scenarios
- ❌ Not testing security scenarios
- ❌ Writing flaky tests
- ❌ Writing tests that depend on execution order
- ❌ Not documenting expected results
- ❌ Prioritizing speed over quality

---

## Testing Best Practices
- ✅ Test first, code second (TDD)
- ✅ Write clear, descriptive test names
- ✅ One assertion per test (or related group)
- ✅ Use AAA pattern: Arrange, Act, Assert
- ✅ Keep tests independent
- ✅ Use test fixtures and factories
- ✅ Mock external dependencies
- ✅ Test edge cases and boundaries
- ✅ Test error scenarios
- ✅ Test security scenarios
- ✅ Aim for 100% coverage of critical paths
- ✅ Run tests frequently
- ✅ Keep tests fast
- ✅ Document expected results
- ✅ Review test quality regularly

---

## Example: Multi-Layered Testing for Multi-Tenant API Endpoint

### Layer 1: High-Level Planning
- **Feature:** Multi-tenant `/api/people` endpoint
- **Scenarios:**
  - Happy path: User fetches their own people
  - Edge case: User tries to access another user's people
  - Error case: Unauthenticated request
  - Security: Data isolation between tenants
- **Critical path:** Multi-tenant data isolation (100% coverage required)

### Layer 2: High-Level Design
- **Strategy:** Unit tests for route handler, integration tests for API, E2E tests for UI
- **Coverage targets:** >95% overall, 100% for tenant isolation logic
- **Test data:** Seed database with users user1, user2, each with people
- **Mocks:** Mock NextAuth session

### Layer 3: Mid-Level Design
- **Test cases:**
  - TC-001: Authenticated user gets only their people
  - TC-002: Unauthenticated request returns 401
  - TC-003: User cannot access other user's people
  - TC-004: Empty people list returns []
  - TC-005: Database error returns 500

### Layer 4: Detailed Design
- **TC-001 Assertions:**
  - Expect status 200
  - Expect response.length === 3 (user1 has 3 people)
  - Expect all people have userId === "user1"
  - Expect no people with userId === "user2"

### Layer 5: Test Preparation
- **Fixtures:** Create `test-users.ts` with user1, user2
- **Seed:** Create `seed-people.ts` to populate test data
- **Utilities:** Create `mockSession()` helper

### Layer 6: Full-Kit Prep
- **Expected results:**
  - user1 people: [{ id: "p1", name: "Alice", userId: "user1" }, ...]
  - user2 people: [{ id: "p4", name: "Bob", userId: "user2" }, ...]

### Layer 7: Implementation
```typescript
describe('/api/people', () => {
  it('TC-001: returns only current user people', async () => {
    // Arrange
    mockSession({ userId: 'user1' });
    // Act
    const res = await GET();
    const data = await res.json();
    // Assert
    expect(res.status).toBe(200);
    expect(data.length).toBe(3);
    expect(data.every(p => p.userId === 'user1')).toBe(true);
  });
});
```

### Layer 8: Verification
- Coverage: 100% of tenant isolation logic
- All 5 test cases passing
- Regression tests passing
- **Quality gate: PASS**

---

## Summary
**Quality is the only priority. Testing is mandatory. Multi-layered approach is non-negotiable.**

The 8-layer methodology ensures:
1. Comprehensive planning (what to test)
2. Strategic design (how to test)
3. Detailed specifications (exact tests)
4. Proper infrastructure (tools and fixtures)
5. Complete expected results (golden masters)
6. Thorough implementation (all test types)
7. Rigorous verification (quality gate)
8. Continuous quality (no compromises)

**Never skip layers. Never skip tests. Quality over speed, always.**
