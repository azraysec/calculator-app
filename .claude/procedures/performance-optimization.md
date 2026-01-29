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

### 7. Deploy
- Commit with performance metrics
- Push to master
- Monitor production performance
- Verify improvements live

## Success Criteria
- Measurable performance improvement
- No regressions
- Deployed successfully
- User notices improvement
