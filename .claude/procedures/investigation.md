# INVESTIGATION Procedure

## When to Use
- Need to understand how something works
- Debug complex issues
- Research solutions
- Analyze codebase

## Priority: MEDIUM

## Steps

### 1. Define Scope (TaskCreate: "Define investigation scope")
- What are we trying to understand?
- What questions need answers?
- What's the end goal?
- Time constraints?

### 2. Explore Codebase (TaskCreate: "Explore codebase")
- **Agent:** `Explore` agent (medium/thorough)
- Find relevant files
- Understand structure
- Trace execution flow
- Document findings

### 3. Run Debug Scripts (TaskCreate: "Run diagnostics")
- **Agent:** `debugger`
- Execute existing debug tools
- Check logs and data
- Reproduce scenarios
- Collect evidence

### 4. Analyze Data (TaskCreate: "Analyze findings")
- **Agent:** `data-researcher` or domain specialist
- Review all collected info
- Identify patterns
- Draw conclusions
- Document insights

### 5. Create Report (TaskCreate: "Document investigation")
- **Agent:** `documentation-engineer`
- Summary of findings
- Root cause if bug
- Recommendations
- Next steps

### 6. Present to User
- Clear summary
- Key findings
- Recommendations
- Proposed solutions if applicable

### 7. Update Tracking (if investigation led to code changes)
If any code/documentation was created or modified:
- Add entry to `apps/web/components/backlog/requirements-table.tsx`:
  ```typescript
  {
    id: 'TASK-XXX',
    requirement: '[Investigation topic]',
    priority: 'Medium',
    status: 'Done',
    category: 'Investigation',
    notes: '[Key findings and recommendations]',
    dateAdded: 'YYYY-MM-DD',
    dateStarted: 'YYYY-MM-DD',
    dateCompleted: 'YYYY-MM-DD',
  }
  ```
- Update `.claude/requirements.yaml` if tracking

## Quality Checks
- [ ] All questions answered
- [ ] Findings documented
- [ ] Evidence collected
- [ ] Recommendations clear

## Outputs
- Investigation report
- Debug scripts (if created)
- Recommendations document
- Action items for follow-up
