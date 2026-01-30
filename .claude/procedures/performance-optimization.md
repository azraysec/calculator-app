# PERFORMANCE OPTIMIZATION Procedure

## When to Use
- App is slow
- Database queries taking too long
- Page load issues
- API response time problems

## Priority: MEDIUM

## Steps

### 1. Measure Baseline (TaskCreate: "Measure performance")
- **Agent:** `performance-engineer`
- Run performance tests
- Collect metrics
- Identify bottlenecks
- Document current state

### 2. Analysis (TaskCreate: "Analyze bottlenecks")
- **Agent:** `performance-engineer`
- Profile code execution
- Check database queries
- Review network calls
- Identify top 3 issues

### 3. Create Optimization Plan (TaskCreate: "Plan optimizations")
- Prioritize improvements
- Estimate impact
- Identify risks
- Sequence work

### 4. Implement Optimizations (TaskCreate: "Implement optimizations")
- **Agent:** Relevant specialist
- Optimize queries
- Add caching
- Reduce bundle size
- Improve algorithms

### 5. Measure Improvements (TaskCreate: "Verify improvements")
- **Agent:** `performance-engineer`
- Re-run performance tests
- Compare before/after
- Document improvements
- Check for regressions

### 6. Quality Gate
- [ ] Performance improved measurably
- [ ] No functionality broken
- [ ] Tests still pass
- [ ] No new issues introduced

### 7. Version & Changelog (TaskCreate: "Update version and changelog")
- Bump patch version in `apps/web/package.json` (0.7.0 → 0.7.1)
- Add entry to `apps/web/components/backlog/requirements-table.tsx`:
  ```typescript
  {
    id: 'TASK-XXX',
    requirement: '[Brief description of optimization]',
    priority: 'Medium' | 'High',
    status: 'Done',
    category: 'Enhancement',
    notes: '[Performance improvements achieved with metrics]',
    dateAdded: 'YYYY-MM-DD',
    dateStarted: 'YYYY-MM-DD',
    dateCompleted: 'YYYY-MM-DD',
  }
  ```
- Update `.claude/requirements.yaml`:
  - Set status to COMPLETED
  - Set deployed_version to new version
  - Update metadata.current_version

### 8. Deploy & Verify (MANDATORY)
- Commit with performance metrics and version number
- Push to master
- **VERIFY DEPLOYMENT** (wait 1-2 minutes, then):
  ```bash
  vercel ls  # Check most recent deployment status
  vercel inspect [url]  # Get deployment details
  ```
  - Confirm status is "● Ready" (not "● Error")
  - If deployment failed, investigate logs and fix before proceeding
- Monitor production performance
- Verify improvements live

## Success Criteria
- Measurable performance improvement
- No regressions
- Deployed successfully
- User notices improvement
