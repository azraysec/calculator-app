# Project Patterns & Conventions

**Project:** Warm Intro Graph (WIG)

## File Organization

### Monorepo Structure
```
warm-intro-graph/
├── apps/
│   └── web/              # Next.js application
├── packages/
│   ├── shared-types/     # TypeScript interfaces (import first)
│   ├── core/             # Business logic
│   ├── db/               # Prisma client & schema
│   ├── adapters/         # External service integrations
│   ├── brokers/          # Event handling & message queues
│   └── agent-runtime/    # AI agent orchestration
├── docs/                 # All documentation
│   ├── PRD.md
│   ├── Dashboard.md
│   ├── ProjectPlan.md
│   └── ArchitectureDecisions/
├── .claude/
│   ├── agents/           # Build-time agent definitions
│   └── knowledge/        # Persistent learning (THIS!)
└── legacy/               # Original calculator app
```

## Naming Conventions

### Files
- Components: PascalCase (e.g., `UserProfile.tsx`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- API routes: lowercase (e.g., `route.ts` in `app/api/health/`)
- Types: PascalCase with `.types.ts` suffix (e.g., `canonical.types.ts`)

### Database
- Tables: snake_case plural (e.g., `persons`, `audit_logs`)
- Enums: PascalCase (e.g., `InteractionChannel`)
- Fields: camelCase in Prisma, snake_case in SQL

### Packages
- Scope: `@wig/` prefix (e.g., `@wig/shared-types`)
- Names: kebab-case (e.g., `agent-runtime`)

## Code Patterns

### Import Order
1. External packages (React, Next.js, etc.)
2. Internal packages (`@wig/*`)
3. Relative imports (`./`, `../`)
4. Types (if not inline)

### Type Safety
- Use TypeScript strict mode
- Avoid `any` (use `unknown` if truly unknown)
- Define interfaces in `packages/shared-types`
- Export types alongside implementation

### Error Handling
```typescript
// Pattern: Result type for operations that can fail
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// Usage
async function fetchData(): Promise<Result<Data>> {
  try {
    const data = await api.get();
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}
```

### Event Publishing
```typescript
// Pattern: Type-safe domain events
await eventBus.publish({
  type: 'contacts.ingested',
  payload: {
    sourceId: 'gmail',
    count: 123,
    timestamp: new Date()
  }
});
```

## Documentation Patterns

### Code Comments
- WHY not WHAT (code should be self-documenting)
- Explain non-obvious decisions
- Reference PRD sections for requirements (e.g., "// PRD 5.2: Max 3 hops")

### Architecture Decision Records (ADRs)
- Location: `docs/ArchitectureDecisions/`
- Format: `YYYYMMDD-brief-title.md`
- Include: Status, Context, Decision, Consequences, Risks
- Update Dashboard.md when approved

### README Structure
- Overview first (what is this?)
- Quick start (minimal steps to run)
- Architecture (how does it work?)
- API/Usage (how to use it?)
- Development (how to contribute?)

## Git Workflow

### Branches
- `master`: Production code
- Feature branches: `feature/brief-description`
- Hotfix branches: `hotfix/issue-description`

### Commits
- Follow Conventional Commits: `type(scope): message`
- Types: feat, fix, docs, refactor, test, chore
- Include Claude co-author: `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`

### Pull Requests
- Template includes: Summary, Test Plan, Screenshots (if UI)
- All tests must pass
- Manager agent reviews PRs

## Testing Patterns

### Unit Tests
- Co-locate with implementation (`*.test.ts`)
- Use descriptive test names: `describe` + `it` pattern
- AAA pattern: Arrange, Act, Assert

### Integration Tests
- Use Testcontainers for real Postgres
- Seed minimal test data
- Clean up after each test

### E2E Tests
- Location: `apps/web/__tests__/e2e/`
- Test critical user journeys only
- Use Page Object Model pattern

## API Patterns

### REST Endpoints
- Use Next.js route handlers: `app/api/[route]/route.ts`
- Export named functions: `GET`, `POST`, `PUT`, `DELETE`
- Return `Response` objects with proper status codes
- Include rate limiting middleware

### Health Checks
- `/api/health`: Basic liveness (always returns 200)
- `/api/health/ready`: Readiness with DB check
- Include version and timestamp in response

## Logging Patterns

### Structured Logging
```typescript
logger.info('event.name', {
  correlationId: ctx.correlationId,
  userId: ctx.userId,
  duration: elapsed,
  metadata: {...}
});
```

### Log Levels
- `error`: Unrecoverable failures
- `warn`: Recoverable issues
- `info`: Important events (API calls, syncs)
- `debug`: Detailed diagnostics (development only)

## Security Patterns

### Environment Variables
- Never commit `.env` files
- Provide `.env.example` with dummy values
- Document all vars in `docs/Environment.md`
- Use Vercel env vars for production

### Input Validation
- Validate at API boundaries
- Use Zod for runtime type checking
- Sanitize user input before DB queries

### Authentication (Future)
- NextAuth.js for OAuth
- JWT tokens with short expiry
- Refresh token rotation

---

**Pattern Updates**: Add new patterns here as we discover them.
