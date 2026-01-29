# GitHub Issues Management Procedure

## Overview
GitHub Issues is the primary requirement tracking tool. User drops ideas/requirements as issues, Steve pulls and works on them systematically.

## Label Structure

### Priority Labels (User Sets)
- `P0-Critical` - Blocking issues, deployment failures, critical bugs
- `P1-High` - Important features, major bugs, urgent work
- `P2-Medium` - Standard features, minor bugs, improvements
- `P3-Low` - Nice-to-have, future enhancements, tech debt

### Category Labels (Auto-Applied by Steve)
- `bug` - Something broken
- `enhancement` - Improve existing feature
- `feature` - New capability
- `infrastructure` - DevOps, deployment, database
- `quality` - Testing, refactoring, code quality
- `documentation` - Docs, comments, guides

### Status Labels (Auto-Applied by Steve)
- `in-progress` - Currently being worked on
- `blocked` - Waiting on dependencies
- Default (no status label) - Not started

## Steve's Workflow with Issues

### Step 1: Check for New Work (Every Request)
```bash
# Check highest priority open issues
gh issue list --label=P0-Critical,P1-High --state=open

# If user hasn't asked for something specific, work on highest priority issue
```

### Step 2: Start Working on Issue
```bash
# Add in-progress label
gh issue edit [number] --add-label "in-progress"

# Add appropriate category label if not present
gh issue edit [number] --add-label "bug|feature|enhancement|infrastructure|quality"
```

### Step 3: Track Progress
- Add comments to issue with updates
- Reference issue in commits: `Fix #123: description`
- Push regularly so user can see progress

### Step 4: Complete Work
```bash
# Close issue with final comment including version
gh issue close [number] --comment "✅ Completed in v[X.Y.Z]

**What was done:**
- [Summary]

**What's live:**
- [User-visible changes]

**Deployed:** v[X.Y.Z]"
```

## User Workflow (Adding Requirements)

### Simple Issue Creation
```bash
# Create new feature request
gh issue create --title "Add dark mode" --label "P1-High,feature" --body "Description here"

# Create bug report
gh issue create --title "Login broken" --label "P0-Critical,bug" --body "Steps to reproduce..."
```

### Web Interface
1. Go to repository → Issues → New Issue
2. Add title and description
3. Set labels (at minimum, set priority: P0/P1/P2/P3)
4. Submit
5. Done - Steve will pick it up

## Steve's Prioritization Rules

1. **Always handle P0-Critical first** (deployment blockers, critical bugs)
2. **Then P1-High** (important features, major bugs)
3. **Then P2-Medium** (standard work)
4. **Then P3-Low** (when nothing else pending)
5. **User's direct requests override** (if user asks for something specific, do it immediately)

## Integration with Existing Procedures

All procedures now include issue management:
- Bug fixes: Close with `Fix #[issue]` in commit
- Features: Close with `Add #[issue]` in commit
- Enhancements: Close with `Update #[issue]` in commit

## Changelog Sync

When closing an issue:
1. Add entry to `apps/web/components/backlog/requirements-table.tsx`
2. Update `.claude/requirements.yaml` for active tracking
3. Close GitHub Issue with version number
4. All three stay in sync

## Issue Templates (Future)

Can add issue templates to `.github/ISSUE_TEMPLATE/`:
- `bug_report.md`
- `feature_request.md`
- `enhancement.md`

## Success Metrics

- All P0 issues resolved within 24 hours
- All P1 issues resolved within 1 week
- No issues left without labels
- All closed issues have version number in final comment
