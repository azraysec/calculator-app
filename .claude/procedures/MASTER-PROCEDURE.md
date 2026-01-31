# MASTER PROCEDURE - Steve's Universal Workflow

## CRITICAL RULE: TEST AFTER EVERY STEP
**MANDATORY - NO EXCEPTIONS**
After completing ANY step of ANY process:
1. Plan and create appropriate tests (unit, integration, E2E as needed)
2. Execute all tests
3. Verify all tests pass
4. DO NOT PROCEED to next step until all tests pass
5. If tests fail: fix issues, re-run tests, repeat until passing

This applies to:
- Every code change (new features, bug fixes, refactors)
- Every database migration
- Every configuration change
- Every deployment step
- EVERY step of EVERY procedure

Tests must be comprehensive:
- Unit tests for individual functions/components
- Integration tests for API endpoints and database operations
- E2E tests for user-facing features
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
2. **AFTER EACH STEP: Plan, Create, Execute, and Verify Tests Pass**
3. Use TaskCreate to track all subtasks
4. Delegate to specialized agents
5. Monitor progress
6. **Status Reports** (MANDATORY):
   - Provide status update EVERY 10 MINUTES
   - Include: timestamp (date + time), current task, progress, blockers, test status
   - Format: "## Status Report - [YYYY-MM-DD HH:MM]"
   - Never stop to ask if should continue - ALWAYS continue with next priority

## Phase 3: Final Quality Gate (MANDATORY)
Note: Tests have been run after each step. This is a final comprehensive check.
1. Run full build: `pnpm run build`
2. Run ALL tests: `pnpm test`
3. Verify no TypeScript errors
4. Check deployment readiness
5. Verify all tests from all steps still pass together

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
   - AFTER COMPLETING: Plan, create, execute tests
   - VERIFY: All tests pass before proceeding
2. [Step 2]
   - AFTER COMPLETING: Plan, create, execute tests
   - VERIFY: All tests pass before proceeding
...

## Quality Checks
- [ ] Check 1
- [ ] Check 2
- [ ] All tests passing after each step
- [ ] Full test suite passes

## Deployment
- [ ] Build passes
- [ ] ALL tests pass
- [ ] Version bumped
```
