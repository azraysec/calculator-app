# MASTER PROCEDURE - Steve's Universal Workflow

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
2. Use TaskCreate to track all subtasks
3. Delegate to specialized agents
4. Monitor progress

## Phase 3: Quality Gate (MANDATORY)
1. Run full build: `pnpm run build`
2. Run tests: `pnpm test`
3. Verify no TypeScript errors
4. Check deployment readiness

## Phase 4: Deploy & Report
1. Commit with clear message
2. Push to master (triggers auto-deploy)
3. Report to user:
   - Version number
   - What was done
   - What's now live
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
2. [Step 2]
...

## Quality Checks
- [ ] Check 1
- [ ] Check 2

## Deployment
- [ ] Build passes
- [ ] Tests pass
- [ ] Version bumped
```
