# ADR-20260117-MVP-ARCHITECTURE: MVP Architecture for Warm Intro Graph System

**Date:** 2026-01-17
**Status:** APPROVED WITH CONDITIONS
**Decision Maker:** Chief Architect
**Context:** Establishing the foundational architecture for transforming calculator app into WIG system

---

## Decision

**APPROVED WITH CONDITIONS**

The MVP will use:
- **Frontend:** Next.js 14+ with App Router, React 18+, TailwindCSS
- **Runtime:** Vercel AI SDK + LangGraph.js for agentic workflows
- **Database:** Neon Postgres + Prisma ORM
- **Background Jobs:** Inngest for long-running operations
- **Graph Visualization:** React Flow (with documented 500-node scalability boundary)
- **Testing:** Vitest (unit), Playwright (e2e), Testcontainers (integration)
- **Deployment:** Vercel with GitHub Actions CI/CD

---

## Rationale

### Strengths
1. Tech stack aligns with PRD recommendations and Vercel deployment model
2. Monorepo structure provides clean separation of concerns
3. Generic adapter/broker interfaces enable extensibility
4. Test pyramid with CI/CD gates enforces quality
5. Security-first design (encrypted tokens, audit logs, draft-only defaults)
6. Appropriate MVP scope deferring complex integrations

### Technology Choices

**Neon Postgres:** Selected for serverless-native design, built-in connection pooling, database branching for preview environments, and superior cold-start performance on Vercel.

**React Flow:** Chosen for MVP graph visualization due to React-native integration, interactive features out-of-the-box, and sufficient capacity for path visualization. Documented 500-node scalability boundary for future assessment.

**LangGraph.js:** Aligns with PRD recommendation for agentic workflows. Fallback to direct Vercel AI SDK available if workflow issues arise.

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| React Flow scalability | Medium | Document 500-node boundary; plan Cytoscape migration if exceeded |
| Prisma cold-start latency | Low | Monitor and add connection pooling if needed (200-500ms typical) |
| Inngest vendor lock-in | Low | Simple API enables migration to Temporal if required |
| Monorepo complexity | Low | Use turborepo/nx for build caching |
| LangGraph.js maturity | Medium | Newer than Python version; fallback to direct Vercel AI SDK |

---

## Required Changes (Conditions)

### 1. Add packages/shared-types Package
Create dedicated package for:
- TypeScript interfaces shared across packages
- Canonical data models (CanonicalContact, CanonicalInteraction)
- Event type definitions
- **Purpose:** Prevent circular dependencies

### 2. Explicit Event Bus Pattern
Implement EventBus interface:
```typescript
export type DomainEvent =
  | { type: 'contacts.ingested'; payload: {...} }
  | { type: 'interactions.ingested'; payload: {...} }
  | { type: 'entities.merged'; payload: {...} }
  | { type: 'graph.updated'; payload: {...} };

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType, handler): void;
}
```
**MVP Implementation:** Use Inngest events. Document migration path to Upstash Kafka if scale requires.

### 3. Database Provider: Neon
Approved for serverless-native features, connection pooling, and branching capabilities.

### 4. Health Check & Observability
Add endpoints:
- `/api/health` - Basic health check
- `/api/health/ready` - Readiness probe with DB connectivity
- Structured logging with correlation IDs

### 5. Prisma Schema Additions
```prisma
model Person {
  mergeExplanation String?  // Required: "why we merged"
  previousIds      String[] // For merge undo capability
}

model AuditLog {
  correlationId String  // For tracing
  metadata      Json    // Flexible event data
}
```

### 6. Rate Limiting
Add rate limiting middleware to all API routes:
- Use Vercel rate limiting or Upstash
- Conservative limits: 100 requests/minute per IP during MVP

### 7. React Flow Scalability Documentation
Document 500-node boundary. Create tech debt ticket for Cytoscape assessment if exceeded.

---

## Consequences

### Immediate Actions
1. Create `packages/shared-types` before Phase 2
2. Set up Neon Postgres with connection pooling (Day 1 of Phase 2)
3. Implement EventBus interface with Inngest backend
4. Add required Prisma schema fields
5. Implement health check endpoints
6. Add rate limiting middleware
7. Document React Flow scalability boundary

### Architectural Patterns Established
- Event-driven architecture via EventBus
- CQRS-lite with read (adapters) / write (brokers) separation
- Generic interfaces for extensibility
- Safe-by-default (draft-only, encrypted secrets, audit logs)

### Development Workflow
- Test pyramid with CI/CD gates
- Testcontainers for integration testing
- Preview deployments with isolated databases (Neon branching)

---

## Follow-Up Tasks

| Task | Owner | Priority | Status |
|------|-------|----------|--------|
| Create packages/shared-types | Adapter Engineer | High | Pending |
| Set up Neon Postgres | DevOps Release | High | Pending |
| Implement EventBus interface | DevOps Release | High | Pending |
| Add Prisma schema fields | Adapter Engineer | High | Pending |
| Add health check endpoints | DevOps Release | Medium | Pending |
| Implement rate limiting | DevOps Release | Medium | Pending |
| Document React Flow boundary | UI Engineer | Medium | Pending |
| Update Project Plan with conditions | Manager | High | Pending |

---

## References

- docs/PRD.md (sections 4-7 for requirements)
- PRD Doc 3, Section 1: Framework selection rationale
- Neon Postgres: https://neon.tech/
- React Flow: https://reactflow.dev/
- LangGraph.js: https://github.com/langchain-ai/langgraphjs

---

**Approved by:** Chief Architect Agent
**Documented by:** Manager Agent
**Next Review:** After Phase 2 completion
