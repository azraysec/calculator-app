# MASTER PROCEDURE - Steve's Universal Workflow

## ZEROTH DIRECTIVE: MANDATORY MODEL REQUIREMENTS (PERMANENT)
**HIGHEST PRIORITY - CHECKED BEFORE ALL OTHER WORK**

### 1. Required Model: Claude Opus 4.5 (or Latest Available)
- **Current Required Model**: Claude Opus 4.5 (model ID: `claude-opus-4-5-20251101`)
- All work MUST be performed using Opus 4.5 or the newest available model
- If running on an older model, STOP and switch immediately
- No exceptions - this is a permanent user directive

### 2. Daily Model Check Requirement
**At the start of EVERY session/day, BEFORE any other work:**

1. **Check Current Model**: Verify you are running on Opus 4.5 or newer
   - Model info is in system context: "You are powered by the model named..."
   - Current model ID should be `claude-opus-4-5-20251101` or newer

2. **Check for Newer Models**: Search for any newer Claude models
   - Methods to check:
     - Review system context for model information
     - Check Anthropic's model documentation/announcements
     - User may inform of newer models
   - If a newer model exists (e.g., Opus 5.0, a new flagship model):
     - IMMEDIATELY inform the user
     - Request to switch to the newer model
     - Do not proceed with work on outdated model

3. **Document Model Status**: At session start, confirm:
   - "Running on: [model name and ID]"
   - "Model check complete: [Latest available / Newer model available]"
   - If newer model available: "ALERT: Switch to [new model] required"

### 3. Model Upgrade Protocol
When a newer model becomes available:
1. Notify user immediately
2. Pause current work
3. Request model switch
4. Resume work on new model
5. Update this document with new model requirements

**This directive supersedes all other priorities - quality of work depends on using the best available model.**

---

## PRIME DIRECTIVE: QUALITY OVER SPEED
**THE ONLY PRIORITY IS QUALITY OF DELIVERY**
- Spare no time on comprehensive testing
- Speed is secondary to thoroughness
- Every feature must be battle-tested before deployment
- Multi-layered testing is mandatory for ALL work

## CRITICAL RULE: COMPREHENSIVE MULTI-LAYERED TESTING
**MANDATORY - NO EXCEPTIONS - QUALITY ABOVE ALL**
After completing ANY step of ANY process, execute the **FULL MULTI-LAYERED TESTING APPROACH**:

### Layer 1: High-Level Test Planning
1. Identify all test scenarios at the feature/system level
2. Document expected behaviors and edge cases
3. Map dependencies and integration points
4. Define acceptance criteria
5. Identify security, performance, and data integrity requirements

### Layer 2: High-Level Test Design
1. Design test strategy (unit, integration, E2E, security, performance)
2. Identify test data requirements
3. Plan test fixtures, mocks, and stubs
4. Define test coverage targets (aim for 100% of critical paths)
5. Document test architecture

### Layer 3: Mid-Level Test Design
1. Break down high-level scenarios into specific test cases
2. Define input/output specifications for each test
3. Identify boundary conditions and error scenarios
4. Plan positive and negative test cases
5. Design regression test scenarios

### Layer 4: Detailed Test Design
1. Write precise test specifications for each test case
2. Document exact test steps and assertions
3. Define mock behaviors and stub responses
4. Specify expected results in detail
5. Create traceability matrix (requirements → tests)

### Layer 5: Test Preparation
1. Create test fixtures (sample data, database seeds)
2. Build test utilities and helper functions
3. Set up test environments
4. Configure test runners and frameworks
5. Create reusable test components

### Layer 6: Full-Kit Preparation
1. Generate expected results for all test cases
2. Create comparison fixtures
3. Build golden master data sets
4. Document known good states
5. Prepare rollback/cleanup procedures

### Layer 7: Test Implementation & Execution
1. Write all tests (unit, integration, E2E)
2. Execute all test layers
3. Verify 100% of tests pass
4. Document test results
5. Create test reports

### Layer 8: Test Verification & Quality Gate
1. Review test coverage reports
2. Verify all edge cases are tested
3. Check for missing scenarios
4. Validate test quality (no false positives/negatives)
5. **DO NOT PROCEED until all tests pass and coverage is comprehensive**

**This comprehensive approach applies to:**
- Every code change (new features, bug fixes, refactors)
- Every database migration
- Every configuration change
- Every API endpoint
- Every component
- Every deployment step
- EVERY step of EVERY procedure

**Tests must be exhaustive:**
- Unit tests for individual functions/components/services
- Integration tests for API endpoints, database operations, service interactions
- E2E tests for complete user journeys
- Security tests for authentication, authorization, data isolation
- Performance tests for bottlenecks and scalability
- Regression tests to ensure existing functionality remains intact
- All existing tests must continue passing

## Phase 1: Request Classification (10 seconds)
1. Read user request
2. Identify request type:
   - `BUG_FIX` - Something is broken
   - `NEW_FEATURE` - Build new functionality
   - `ENHANCEMENT` - Improve existing feature
   - `DATABASE_WORK` - Schema changes, migrations, data fixes
   - `DEPLOYMENT_ISSUE` - Build/deploy problems
   - `REFACTOR` - Code quality improvement
   - `DOCUMENTATION` - Docs, comments, guides
   - `INVESTIGATION` - Debug, research, analyze
   - `OPTIMIZATION` - Performance, speed improvements
   - `OTHER` - Undefined type (create new procedure)

3. Load appropriate specialized procedure from `.claude/procedures/`
4. If no procedure exists → create one and save it

## Phase 2: Execute Specialized Procedure
1. Follow the loaded procedure step-by-step
2. **AFTER EACH STEP: Execute Full Multi-Layered Testing (8 Layers)**
   - See COMPREHENSIVE-TESTING-PROCEDURE.md for complete methodology
   - High-level planning → Detailed design → Full-kit prep → Execution
   - Quality over speed - spare no time on testing
3. Use TaskCreate to track all subtasks
4. Delegate to specialized agents
5. Monitor progress
6. **Status Reports** (MANDATORY - ENFORCED):

   ⚠️ **CRITICAL: 10-MINUTE REPORTING REQUIREMENT** ⚠️

   - **MANDATORY**: Provide status update EVERY 10 MINUTES without exception
   - Set a mental timer - if 10 minutes pass, STOP current work and report
   - Reports are NON-NEGOTIABLE even during complex debugging or implementation
   - If a task takes longer than 10 minutes, report progress mid-task

   **Report Format:**
   ```
   ## Status Report - [YYYY-MM-DD HH:MM]

   **Time Elapsed:** [X] minutes since last report
   **Current Task:** [What you're working on]
   **Progress:** [Percentage or milestone]
   **Blockers:** [Any issues] or None
   **Test Status:** [Layer X of 8, X% passing]
   **Next Steps:** [What will happen in next 10 min]
   ```

   - Include current testing layer and coverage metrics
   - Never stop to ask if should continue - ALWAYS continue with next priority
   - **Failure to report every 10 minutes is a procedure violation**

## Phase 3: Final Quality Gate (MANDATORY)
Note: Comprehensive multi-layered tests have been run after each step. This is a final integration check.
1. **Run comprehensive test suite**:
   - Unit tests: `pnpm test` (verify >90% coverage)
   - Integration tests: `pnpm test:integration`
   - E2E tests: `pnpm test:e2e`
   - Security tests: verify tenant isolation, authentication, authorization
2. Run full build: `pnpm run build`
3. Verify no TypeScript errors
4. Check deployment readiness
5. Verify all tests from all steps still pass together
6. Generate and review test coverage report
7. Document any gaps and create follow-up tests if needed
8. **Quality threshold: 100% of critical paths must have tests**

## Phase 4: Version & Changelog Management (MANDATORY - EVERY DEPLOYMENT)
1. **Bump Version ALWAYS** (in `apps/web/package.json`):
   ⚠️ CRITICAL: Bump version on EVERY code change before commit, no exceptions
   - BUG_FIX → Patch (0.7.0 → 0.7.1)
   - NEW_FEATURE/ENHANCEMENT → Minor (0.7.0 → 0.8.0)
   - BREAKING_CHANGE → Major (0.7.0 → 1.0.0)
   - Even logging/debug changes → Patch
   - ANY deployment = version bump (makes tracking possible)

2. **Update Changelog** (in `apps/web/components/backlog/requirements-table.tsx`):
   - Add new entry to REQUIREMENTS array
   - Set appropriate ID (REQ-XXX, TASK-XXX, BUG-XXX)
   - Set priority: Critical, High, Medium, Low
   - Set status: Done (if completed)
   - Set category: Feature, Enhancement, Bug Fix, Infrastructure, Quality
   - Include clear notes describing what was done
   - Add dateAdded, dateStarted, dateCompleted

3. **Update Requirements Tracker** (`.claude/requirements.yaml`):
   - Update metadata.last_updated
   - Update metadata.current_version
   - Mark requirement as COMPLETED with deployed_version

## Phase 5: Deploy & Verify (MANDATORY)
1. Commit with clear message including version number
2. Push to master (triggers auto-deploy)
3. **VERIFY DEPLOYMENT** (wait 1-2 minutes, then):
   ```bash
   vercel ls  # Check most recent deployment status
   vercel inspect [url]  # Get deployment details
   ```
   - Confirm status is "● Ready" (not "● Error")
   - Verify deployment target is "Production"
   - Check deployment created time is recent
   - If deployment failed:
     - Get logs: `gh run list` then `gh run view [id] --log`
     - Investigate TypeScript/build errors
     - Fix and redeploy
     - DO NOT proceed until deployment succeeds
4. Report to user:
   - ✅ Deployment status (version X.X.X is live)
   - What was done
   - What features are now available
   - Any follow-up needed

## Available Procedures
- `COMPREHENSIVE-TESTING-PROCEDURE.md` - **MANDATORY** Multi-layered testing methodology
- `bug-fix.md` - Fix broken functionality
- `new-feature.md` - Build new capability
- `database-migration.md` - Schema/data changes
- `deployment-fix.md` - Build/deploy issues
- `performance-optimization.md` - Speed improvements
- `refactor.md` - Code quality improvements
- `investigation.md` - Debug/research tasks

## Creating New Procedures
When request type is new:
1. Create `.claude/procedures/[type].md`
2. Document the step-by-step process
3. Include agent assignments
4. Include quality checks
5. Commit the new procedure
6. Use it for current request

## Procedure Template
```markdown
# [Request Type] Procedure

## When to Use
[Description of when this applies]

## Agents Required
- Primary: [main agent]
- Supporting: [other agents]

## Steps
1. [Step 1]
   - AFTER COMPLETING: Execute COMPREHENSIVE MULTI-LAYERED TESTING
     - Layer 1: High-level test planning
     - Layer 2: High-level test design
     - Layer 3: Mid-level test design
     - Layer 4: Detailed test design
     - Layer 5: Test preparation
     - Layer 6: Full-kit prep (expected results)
     - Layer 7: Test implementation & execution
     - Layer 8: Test verification & quality gate
   - VERIFY: All 8 testing layers complete and all tests pass
   - DO NOT PROCEED until comprehensive testing complete
2. [Step 2]
   - AFTER COMPLETING: Execute COMPREHENSIVE MULTI-LAYERED TESTING (all 8 layers)
   - VERIFY: All tests pass before proceeding
...

## Quality Checks
- [ ] Check 1
- [ ] Check 2
- [ ] Multi-layered testing completed after each step (8 layers)
- [ ] Test coverage >90% for new code, 100% for critical paths
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] All security tests pass
- [ ] Full test suite passes

## Deployment
- [ ] Build passes
- [ ] ALL tests pass (unit, integration, E2E, security)
- [ ] Test coverage verified (>90% overall, 100% critical)
- [ ] Version bumped
- [ ] Changelog updated
```
