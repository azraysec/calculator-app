# Key Decisions Log

**Project:** Warm Intro Graph (WIG)

## 2026-01-17

### Knowledge Base System
**Decision**: Implement persistent knowledge base in `.claude/knowledge/`
**Rationale**: User values learning and wants insights to persist across agent sessions
**Structure**:
- `user_profile.md`: User preferences and working style
- `technical_learnings.md`: Technical insights and patterns
- `project_patterns.md`: Conventions and code patterns
- `decisions.md`: Key decisions with rationale (this file)

**Impact**: All agents can learn from past work, reducing repeated mistakes and questions

---

### Implementation Order for Chief Architect Conditions
**Decision**: Implement in this order:
1. Knowledge base system (FIRST)
2. EventBus interface with Inngest
3. Health check endpoints
4. Rate limiting middleware
5. React Flow documentation

**Rationale**:
- Knowledge base enables learning during implementation
- EventBus is foundational for brokers package
- Health checks needed before production deployment
- Rate limiting is security-critical but not blocking for dev
- Documentation can be written anytime (least blocking)

**Impact**: Sets up learning infrastructure before tackling technical work

---

### Autonomous Execution Approach
**Decision**: Make technical decisions without asking user for approval
**Rationale**: User explicitly requested full autonomy: "you decide how to work on them - I don't want to know"
**Guidelines**:
- Choose reasonable defaults
- Document decisions here
- Only ask user for truly ambiguous business requirements

**Impact**: Faster execution, reduced back-and-forth

---

## Architecture Decisions (from ADR)

### Tech Stack
See: `docs/ArchitectureDecisions/20260117-mvp-architecture.md`
- **Frontend**: Next.js 14+ App Router
- **Database**: Neon Postgres + Prisma
- **Runtime**: Vercel AI SDK + LangGraph.js
- **Background Jobs**: Inngest
- **Graph Viz**: React Flow (MVP), Cytoscape (future)

### Data Source Priority for MVP
**Decision**: Start with Gmail/Google Contacts + HubSpot + Manual CSV
**Rationale**: Most common in B2B; LinkedIn export covered by CSV
**Deferred**: LinkedIn API, Outlook, WhatsApp, Calendar (post-MVP)

### Draft-Only Default
**Decision**: All message composition creates drafts by default
**Rationale**: Safety-first approach; prevent accidental sends
**Exception**: Explicit user approval required for auto-send features

---

### Rate Limiting Strategy
**Decision**: Use in-memory rate limiting for MVP, migrate to Upstash Redis for production
**Rationale**:
- MVP: Simple, no external dependencies, good enough for limited traffic
- Production: Need persistence across deployments and edge locations
**Configuration**: 100 req/min per IP (conservative for MVP)
**Migration Trigger**: When deploying to production or receiving > 1000 req/day

---

### Health Check Implementation
**Decision**: Two separate endpoints - /api/health (liveness) and /api/health/ready (readiness)
**Rationale**:
- Different failure modes require different responses
- Liveness: Process crash → restart container
- Readiness: Temporary unavailability → stop routing traffic
**Monitoring**: Track p95 latency and failure rates

---

### Phase 1 Completion
**Date**: 2026-01-17
**Status**: ✅ Complete
**Deliverables**:
- Knowledge base system for persistent learning
- EventBus interface with Inngest implementation
- Health check endpoints with DB connectivity test
- Rate limiting middleware (MVP version)
- React Flow scalability documentation
**Impact**: All Chief Architect conditions satisfied, ready for Phase 2

---

## Future Decision Template

```markdown
### [Decision Title]
**Decision**: [What was decided]
**Rationale**: [Why this choice]
**Alternatives Considered**: [What else was evaluated]
**Impact**: [Consequences of this decision]
**Revisit Date**: [When to reassess, if applicable]
```

---

**Note**: Always update this file when making significant architectural or product decisions.
