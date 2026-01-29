# DEPLOYMENT FIX Procedure

## When to Use
- Build is failing
- Deployment errors
- Missing dependencies
- Type errors blocking deploy

## Priority: CRITICAL (blocks all other work)

## Steps

### 1. Diagnose Issue (TaskCreate: "Diagnose deployment failure")
- **Agent:** `devops-release` or `debugger`
- Read build logs
- Identify exact error
- Check recent changes
- Determine root cause

### 2. Quick Fix Assessment (30 seconds)
- Can this be fixed in <5 minutes?
- Is it a missing dependency?
- Is it a type error?
- Is it a config issue?

### 3. Implement Fix (TaskCreate: "Fix deployment issue")
- **Agent:** Language specialist or `devops-release`
- Add missing dependencies
- Fix type errors
- Update configurations
- Remove broken imports

### 4. Test Build Locally (TaskCreate: "Test build")
- Run `pnpm run build` locally
- Verify it succeeds completely
- Check all warnings
- Ensure no errors

### 5. Quality Gate
- [ ] `pnpm run build` passes locally
- [ ] No TypeScript errors
- [ ] No missing dependencies
- [ ] Config files correct

### 6. Version & Changelog (TaskCreate: "Update version and changelog")
- Bump patch version in `apps/web/package.json` (0.7.0 → 0.7.1)
- Add entry to `apps/web/components/backlog/requirements-table.tsx`:
  ```typescript
  {
    id: 'BUG-XXX',
    requirement: '[Brief description of deployment fix]',
    priority: 'Critical',
    status: 'Done',
    category: 'Bug Fix',
    notes: '[Details of what was blocking deployment]',
    dateAdded: 'YYYY-MM-DD',
    dateStarted: 'YYYY-MM-DD',
    dateCompleted: 'YYYY-MM-DD',
  }
  ```
- Update `.claude/requirements.yaml`:
  - Set status to COMPLETED
  - Set deployed_version to new version
  - Update metadata.current_version

### 7. Deploy
- Commit: "Fix: deployment issue - [brief description] - v[version]"
- Push to master
- Monitor Vercel deployment
- Verify build succeeds
- Check deployed site works

### 7. Verify Production
- Visit deployed URL
- Test basic functionality
- Check for console errors
- Verify fix is live

## Success Criteria
- Build passes
- Deployment succeeds
- Site is accessible
- No errors in production
- Ready for next feature

## Common Issues & Solutions

### Missing Dependencies
```bash
pnpm add [package] --filter=@wig/web
pnpm add -D @types/[package] --filter=@wig/web
```

### Type Errors
- Add proper type imports
- Fix any/unknown types
- Remove unused imports

### Config Issues
- Check vercel.json
- Verify environment variables
- Update next.config.mjs
