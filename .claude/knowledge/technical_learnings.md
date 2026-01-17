# Technical Learnings

**Project:** Warm Intro Graph (WIG)
**Started:** 2026-01-17

## Architecture Patterns

### Monorepo Structure
- Using pnpm workspaces + Turborepo
- Clean separation: `apps/` for deployables, `packages/` for libraries
- packages/shared-types prevents circular dependencies

### Event-Driven Architecture
- EventBus pattern with Inngest backend
- Domain events for loose coupling
- Enables async processing of long-running operations

### Database Design
- Neon Postgres for serverless-native features
- Prisma ORM with comprehensive schema
- Entity resolution through array fields (emails[], phones[], names[])
- Audit logging with correlationId for tracing
- Soft deletes (deletedAt) for GDPR compliance

## Tech Stack Decisions

### Why Neon over other Postgres providers?
- Serverless-native design
- Built-in connection pooling (handles Vercel cold starts)
- Database branching for preview environments
- Better cold-start performance than traditional Postgres

### Why React Flow for MVP?
- React-native integration (Next.js compatibility)
- Interactive features out-of-the-box
- Sufficient for path visualization (< 500 nodes)
- Documented scalability boundary for future migration to Cytoscape if needed

### Why LangGraph.js?
- Aligns with PRD recommendation for agentic workflows
- Type-safe TypeScript implementation
- Fallback to Vercel AI SDK available if issues arise

## Scalability Boundaries

### React Flow
- **Limit**: 500 nodes (documented in ADR)
- **Reason**: Performance degrades with larger graphs
- **Mitigation**: Plan Cytoscape migration if exceeded
- **MVP Impact**: None (path visualization typically < 10 nodes)

### Prisma Cold Starts
- **Expected**: 200-500ms on Vercel
- **Mitigation**: Neon's connection pooling reduces this
- **Monitoring**: Track p95 latency in health checks

## Security Patterns

### Rate Limiting
- Conservative MVP: 100 req/min per IP
- Use Vercel rate limiting or Upstash Redis
- Apply to all API routes via middleware

### Token Management
- Store encrypted in database
- Never log credentials
- Audit log all access

### Default-Safe Operations
- Draft-only by default (email/message composition)
- Explicit user approval required for sends
- WhatsApp requires compliance verification before auto-send

## Testing Strategy

### Test Pyramid
- **Unit**: Vitest for business logic
- **Integration**: Testcontainers for database tests
- **E2E**: Playwright for user journeys
- **CI/CD**: All tests must pass before merge

### Testcontainers Benefits
- Real Postgres in tests (catches schema issues)
- Isolated test environments
- No mocking of database layer

## Performance Optimizations

### Prisma Best Practices
- Use indexes for common queries (emails, phones, timestamps)
- Batch operations in transactions
- Cursor-based pagination for large result sets
- GIN indexes for array fields

### Next.js App Router
- Server components by default (reduced client JS)
- Streaming for long-running operations
- Route handlers for API endpoints

## Deployment

### Vercel Integration
- Automatic deployments from main branch
- Preview deployments per PR
- Neon branching provides isolated DB per preview
- Inngest handles background jobs (bypasses Vercel timeouts)

## Lessons Learned

### Entity Resolution
- Email/phone exact matching for deterministic merge
- Probabilistic merging requires ML agent + human review queue
- Store mergeExplanation for transparency
- Track previousIds for undo capability

### Graph Traversal
- Max 3 hops for warm intro paths (PRD requirement)
- BFS for shortest path
- Edge strength scoring (recency, frequency, mutuality, channels)

## Inngest Integration

### Event Bus Pattern
- Type-safe discriminated union for all domain events
- Correlation IDs for distributed tracing across operations
- Inngest provides automatic retries, persistence, and observability

### Inngest Benefits for Vercel
- Bypasses Vercel's 10-second timeout limit
- Background jobs run independently
- Built-in retry mechanism with exponential backoff
- Event retention for 30 days

### Event Handler Pattern
```typescript
// Define event in shared-types
export interface ContactsIngestedEvent {
  type: 'contacts.ingested';
  payload: { ... };
}

// Handle in Inngest function
export const handleContactsIngested = inngest.createFunction(
  { id: 'handle-contacts-ingested', retries: 3 },
  { event: 'contacts.ingested' },
  async ({ event, step }) => { ... }
);
```

## Rate Limiting

### MVP Approach
- In-memory token bucket algorithm
- 100 requests/minute per IP (configurable)
- Resets on deployment (stateless)

### Production Requirements
- Migrate to Upstash Redis or Vercel KV for persistence
- Distributed rate limiting across edge functions
- Per-user limits (not just per-IP)

### Rate Limit Headers
Standard headers returned:
- `X-RateLimit-Limit`: Max requests per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Timestamp when limit resets
- `Retry-After`: Seconds until retry (429 only)

## Health Checks

### Two Endpoint Pattern
1. `/api/health`: Liveness probe (always returns 200 if process is alive)
2. `/api/health/ready`: Readiness probe (checks DB connectivity)

### Why Two Endpoints?
- Liveness: Restart process if unhealthy (crash loop detection)
- Readiness: Don't send traffic if not ready (DB down, startup lag)

### Integration with K8s/Vercel
```yaml
livenessProbe:
  httpGet:
    path: /api/health
readinessProbe:
  httpGet:
    path: /api/health/ready
```

---

**Last Learning Session:** 2026-01-17 (Evening - Phase 1 Complete)
