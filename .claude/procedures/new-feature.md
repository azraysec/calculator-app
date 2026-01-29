# NEW FEATURE Procedure

## When to Use
- Building new functionality
- Adding new capabilities
- Creating new UI components

## Priority: MEDIUM

## Steps

### 1. Requirements Analysis (TaskCreate: "Analyze requirements")
- **Agent:** `product-prd-writer`
- Document what needs to be built
- Identify acceptance criteria
- List technical requirements
- Note any constraints

### 2. Architecture Review (TaskCreate: "Design architecture")
- **Agent:** `chief-architect` (REQUIRED for approval)
- Design the solution
- Choose technologies/patterns
- Identify files to create/modify
- Plan database changes if needed
- GET APPROVAL before proceeding

### 3. Implementation Plan (TaskCreate: "Create implementation plan")
- **Agent:** `Plan` agent
- Break down into subtasks
- Identify dependencies
- Sequence the work
- Estimate complexity

### 4. Backend Development (TaskCreate: "Build backend")
- **Agent:** `backend-developer` or language specialist
- Create API endpoints
- Add database models/migrations
- Implement business logic
- Add error handling

### 5. Frontend Development (TaskCreate: "Build frontend")
- **Agent:** `frontend-developer` or `react-specialist`
- Create UI components
- Wire up API calls
- Add user interactions
- Style appropriately

### 6. Testing (TaskCreate: "Add tests")
- **Agent:** `test-automator`
- Write unit tests
- Write integration tests
- Add E2E tests if needed
- Verify all pass

### 7. Code Review (TaskCreate: "Review code")
- **Agent:** `code-reviewer`
- Review for quality
- Check security
- Verify best practices
- Ensure no over-engineering

### 8. Documentation (TaskCreate: "Document feature")
- **Agent:** `documentation-engineer`
- Update README if needed
- Add API documentation
- Update changelog

### 9. Quality Gate
- [ ] `pnpm run build` passes
- [ ] `pnpm test` passes
- [ ] Feature works as specified
- [ ] No TypeScript errors
- [ ] User acceptance criteria met

### 10. Deploy
- Bump minor version (0.7.0 → 0.8.0)
- Commit: "Add: [feature name]"
- Push to master
- Verify deployment succeeds
- Test feature in production

## Success Criteria
- Feature works as requested
- Tests pass
- Documented
- Deployed and accessible
- User satisfied
