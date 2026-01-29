# BUG FIX Procedure

## When to Use
- Something is broken or not working as expected
- Error messages appearing
- Features not functioning correctly

## Priority: HIGH

## Steps

### 1. Reproduce & Investigate (TaskCreate: "Investigate bug")
- **Agent:** `debugger` or `error-detective`
- Read error messages/logs
- Identify root cause
- Document the bug clearly

### 2. Create Fix Plan (TaskCreate: "Create fix plan")
- Identify files to change
- Determine scope of fix
- Check for similar issues elsewhere
- Plan testing approach

### 3. Implement Fix (TaskCreate: "Implement fix")
- **Agent:** Language specialist (typescript-pro, python-pro, etc.)
- Make minimal changes to fix issue
- Update tests to prevent regression
- Add comments explaining fix

### 4. Test Fix (TaskCreate: "Test fix")
- **Agent:** `test-automator`
- Run existing tests
- Add new test cases
- Verify fix works
- Check for side effects

### 5. Code Review (TaskCreate: "Review fix")
- **Agent:** `code-reviewer`
- Review changes for quality
- Check for security issues
- Verify no over-engineering

### 6. Quality Gate
- [ ] `pnpm run build` passes
- [ ] `pnpm test` passes
- [ ] No TypeScript errors
- [ ] Bug is actually fixed
- [ ] No new bugs introduced

### 7. Version & Changelog (TaskCreate: "Update version and changelog")
- Bump patch version in `apps/web/package.json` (0.7.0 → 0.7.1)
- Add entry to `apps/web/components/backlog/requirements-table.tsx`:
  ```typescript
  {
    id: 'BUG-XXX',
    requirement: '[Brief description of bug fix]',
    priority: 'Critical' | 'High' | 'Medium',
    status: 'Done',
    category: 'Bug Fix',
    notes: '[Detailed explanation of fix]',
    dateAdded: 'YYYY-MM-DD',
    dateStarted: 'YYYY-MM-DD',
    dateCompleted: 'YYYY-MM-DD',
  }
  ```
- Update `.claude/requirements.yaml`:
  - Set status to COMPLETED
  - Set deployed_version to new version
  - Update metadata.current_version

### 8. Deploy
- Commit: "Fix: [brief description] - v[version]"
- Push to master
- Verify deployment succeeds
- Test fix in production

## Success Criteria
- Bug no longer reproduces
- Tests pass
- No regressions
- Deployed and working
