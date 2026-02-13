# ADR-20260214-PRD-V12-ADOPTION: Contact Intelligence PRD v1.2 Adoption Strategy

**Date:** 2026-02-14
**Status:** APPROVED WITH CONDITIONS
**Decision Maker:** Chief Architect Agent
**Approval Date:** 2026-02-14
**Context:** Evaluating alignment between Contact Intelligence PRD v1.2 and current WIG implementation

---

## Executive Summary

A comprehensive Product Requirements Document (PRD v1.2) for "Unified Contact Intelligence Platform" has been received. This ADR analyzes the gap between our current WIG implementation (v0.21.0) and the PRD requirements, then proposes an adoption strategy.

**Key Finding:** PRD v1.2 represents a significant architectural evolution requiring 6 major new subsystems. Recommend phased adoption over 2-3 phases rather than immediate full adoption.

---

## Current State Analysis

### WIG v0.21.0 Capabilities

| Component | Status | Implementation |
|-----------|--------|----------------|
| Multi-tenant Architecture | COMPLETE | userId isolation on all models |
| Database Sessions (NextAuth v5) | COMPLETE | JWT strategy with Prisma |
| LinkedIn Archive Import | COMPLETE | ZIP upload, parse connections/messages |
| Person/Connection Models | COMPLETE | Basic Prisma models |
| Privacy Controls UI | COMPLETE | DataSourceConnection management |
| Network Graph Visualization | COMPLETE | React Flow with search |
| Pathfinding (Basic) | IN PROGRESS | BFS with scoring planned |
| E2E Test Suite | COMPLETE | 100/102 passing (98%) |
| Unit Test Suite | COMPLETE | 421/421 passing (100%) |
| CI/CD Pipeline | COMPLETE | GitHub Actions + Vercel |

### Phase 2 In-Progress Work

- RelationshipScore and IntroductionPath schema (designed, not migrated)
- Scoring algorithm (recency, frequency, bidirectional, channel diversity)
- Additional adapters (Gmail, HubSpot, Calendar)
- Enhanced privacy controls

---

## PRD v1.2 Gap Analysis

### GAP 1: Event Ingestion Layer (CRITICAL)

**PRD Requirement:**
- All data sources emit canonical events (`contact.created`, `contact.updated`, `interaction.logged`)
- EventIngestionService with idempotent deduplication
- Event log as source of truth

**Current State:** Direct database writes from adapters. No event abstraction layer.

**Gap Severity:** HIGH - Architectural shift required

**Effort Estimate:** 1-2 weeks

### GAP 2: Entity Resolution (ER) Engine (CRITICAL)

**PRD Requirement:**
- `ProfileCluster` model with multi-profile linking
- Link-first, merge-later approach
- Confidence scoring on profile links (0.0-1.0)
- Manual override capabilities

**Current State:** Simple Person model with no profile clustering or resolution.

**Gap Severity:** HIGH - New subsystem required

**Effort Estimate:** 2-3 weeks

### GAP 3: Field-Level Confidence Scores (MODERATE)

**PRD Requirement:**
- Every field has a confidence score (0.0-1.0)
- Source attribution per field
- Conflict resolution with confidence-based selection

**Current State:** No confidence tracking. Last-write-wins for updates.

**Gap Severity:** MEDIUM - Schema changes + business logic

**Effort Estimate:** 1 week

### GAP 4: Analyzer Registry (MODERATE)

**PRD Requirement:**
- Pluggable analyzers (email patterns, company enrichment, communication frequency)
- Declarative analyzer definitions
- Versioned analyzer outputs
- Selective re-analysis capability

**Current State:** No analyzer abstraction. Scoring logic embedded in algorithms.

**Gap Severity:** MEDIUM - Extensibility improvement

**Effort Estimate:** 1-2 weeks

### GAP 5: Explainability System (MODERATE)

**PRD Requirement:**
- Every recommendation includes rationale chain
- Evidence linking to source data
- Audit trail for all inferences

**Current State:** Basic "explanation" string field on IntroductionPath. No structured evidence.

**Gap Severity:** MEDIUM - UX and trust requirement

**Effort Estimate:** 1 week

### GAP 6: Transparency UI (LOW-MEDIUM)

**PRD Requirement:**
- Profile provenance timeline
- Why-was-this-suggested drill-down
- Data source contribution visualization

**Current State:** Basic network graph. No provenance or explanation UI.

**Gap Severity:** LOW-MEDIUM - Frontend enhancement

**Effort Estimate:** 1-2 weeks

---

## Gap Summary Matrix

| Gap | PRD Priority | Current Gap | Effort | Dependencies |
|-----|--------------|-------------|--------|--------------|
| Event Ingestion | P0 | HIGH | 2 weeks | None |
| Entity Resolution | P0 | HIGH | 3 weeks | Event Ingestion |
| Field Confidence | P1 | MEDIUM | 1 week | ER Engine |
| Analyzer Registry | P1 | MEDIUM | 2 weeks | Event Ingestion |
| Explainability | P2 | MEDIUM | 1 week | ER, Analyzers |
| Transparency UI | P2 | LOW | 2 weeks | Explainability |

**Total Estimated Effort:** 8-11 weeks for full PRD alignment

---

## Decision Options

### Option A: Immediate Full PRD Adoption

**Description:** Pause Phase 2 work, pivot to full PRD v1.2 implementation.

**Pros:**
- Cleaner architecture from the start
- No technical debt from partial implementation
- Full PRD compliance

**Cons:**
- 8-11 weeks to MVP features users expect
- Existing Phase 2 work abandoned
- High risk if PRD requirements change
- LinkedIn import (working feature) may need refactoring

**Recommendation:** NOT RECOMMENDED

### Option B: Phased PRD Integration (RECOMMENDED)

**Description:** Complete Phase 2 core features, then integrate PRD components in Phase 3-4.

**Proposed Timeline:**

**Phase 2 (Current, 2 weeks remaining):**
- Complete RelationshipScore/IntroductionPath migrations
- Implement scoring and basic pathfinding
- Ship working warm intro feature
- Add CSV and Gmail adapters

**Phase 3 (3 weeks): Event Foundation**
- Implement EventIngestionService alongside existing writes
- Migrate adapters to emit events (dual-write during transition)
- Add idempotency and deduplication
- Begin Entity Resolution engine

**Phase 4 (3 weeks): Intelligence Layer**
- Complete ER with ProfileCluster model
- Implement Analyzer Registry
- Add field-level confidence
- Explainability system

**Phase 5 (2 weeks): Transparency**
- Transparency UI components
- Profile provenance timeline
- Full PRD compliance achieved

**Pros:**
- Deliver user value incrementally
- Lower risk - working features at each phase
- Existing work preserved
- PRD gaps addressed systematically

**Cons:**
- Some refactoring in Phases 3-4
- Temporary architectural inconsistency

**Recommendation:** RECOMMENDED

### Option C: PRD as Long-Term Vision Only

**Description:** Continue current roadmap. Reference PRD for future direction but don't commit to specific adoption.

**Pros:**
- Maximum flexibility
- Focus on immediate user needs
- No disruption to current plan

**Cons:**
- Risk of architectural drift
- May accumulate technical debt
- PRD compliance unclear/delayed

**Recommendation:** NOT RECOMMENDED (risks coherent product vision)

---

## Recommended Decision: Option B - Phased PRD Integration

### Rationale

1. **User Value First:** Phase 2 delivers warm intro paths - the core user feature. Delaying this for architectural purity is premature optimization.

2. **Proven Foundation:** Current architecture (multi-tenant, NextAuth, React Flow) is solid. PRD doesn't invalidate it - it extends it.

3. **Risk Mitigation:** Phased approach allows learning. If PRD requirements evolve, we adapt.

4. **Technical Alignment:** PRD's event-driven model enhances rather than replaces our adapter pattern. Inngest already provides event infrastructure.

5. **Test Investment Protected:** 100/102 E2E tests and 421 unit tests remain valid. Phased approach preserves this.

### Updated Roadmap

```
Current: v0.21.0 (Phase 2 in progress)
         ↓
v0.25.0: Phase 2 Complete (Warm Intro MVP)
         - Scoring algorithm
         - Pathfinding
         - Gmail/CSV adapters
         - ~2 weeks
         ↓
v0.30.0: Phase 3 Complete (Event Foundation)
         - EventIngestionService
         - Adapter event migration
         - ER Engine (basic)
         - ~3 weeks
         ↓
v0.35.0: Phase 4 Complete (Intelligence Layer)
         - ProfileCluster model
         - Analyzer Registry
         - Field confidence
         - Explainability
         - ~3 weeks
         ↓
v1.0.0:  Phase 5 Complete (PRD Compliance)
         - Transparency UI
         - Full PRD v1.2 alignment
         - ~2 weeks
```

### Migration Strategy for Event Layer

To minimize disruption, implement dual-write pattern:

```typescript
// Phase 3 migration approach
async function importLinkedInConnection(data: LinkedInConnection) {
  // Existing direct write (preserved for Phase 2)
  const person = await prisma.person.upsert({ ... });

  // New: Emit event for future ER processing
  await eventBus.emit({
    type: 'contact.created',
    source: 'linkedin',
    payload: data,
    idempotencyKey: `linkedin:${data.profileId}`
  });

  return person;
}
```

This allows gradual migration without breaking existing functionality.

---

## Testing Requirements for PRD Integration

### Phase 3 Tests
- EventIngestionService unit tests (idempotency, deduplication)
- Event emission from adapters
- ER basic matching tests

### Phase 4 Tests
- ProfileCluster merge logic
- Analyzer registry plugin tests
- Confidence score calculations

### Phase 5 Tests
- Transparency UI E2E tests
- Full user journey with provenance

---

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Phase 2/3 scope creep | HIGH | Strict feature freeze per phase |
| ER algorithm complexity | MEDIUM | Start with simple matching, iterate |
| Event storage costs | LOW | Event retention policy (90 days) |
| PRD changes mid-implementation | MEDIUM | Phase gates allow pivot points |

---

## Decision Required

**Chief Architect:** Please review and approve/modify this PRD adoption strategy.

**Key decisions needed:**
1. Approve Option B (Phased PRD Integration)
2. Approve updated roadmap timeline
3. Confirm Phase 2 completion scope
4. Validate Phase 3 event architecture approach

---

## Chief Architect Decision

### Decision: APPROVED WITH CONDITIONS

**Date:** 2026-02-14
**Signed:** Chief Architect Agent

### Rationale

Option B (Phased PRD Integration) correctly balances user value delivery with architectural evolution. The existing event infrastructure (`InngestEventBus`), adapter pattern (`BaseAdapter`), and scoring foundation (`LinkedInRelationshipScorer`) provide a solid base for PRD v1.2 alignment.

### Effort Estimate Refinements

| Gap | Original Estimate | Revised Estimate | Rationale |
|-----|-------------------|------------------|-----------|
| Event Ingestion | 2 weeks | **1 week** | Already have `InngestEventBus` and typed `DomainEvent` definitions |
| Entity Resolution | 3 weeks | **2-3 weeks** | Current `Person` model has `mergeExplanation`, `previousIds` arrays |
| Field Confidence | 1 week | **1-2 weeks** | Schema changes require careful migration for existing data |
| Analyzer Registry | 2 weeks | **2 weeks** | Accurate |
| Explainability | 1 week | **1 week** | Already have `strengthFactors`, `topEvidenceIds` on scoring |
| Transparency UI | 2 weeks | **2 weeks** | Accurate |

**Revised Total:** 8-11 weeks remains valid; lower bound (8 weeks) more achievable.

### Required Changes (RC)

#### RC-1: Define Event Transition Criteria

Add explicit Phase 3 completion gate:
- All adapters emit events for 100% of writes
- Event-based writes pass 95%+ of existing E2E tests
- Dual-write can be disabled without data loss

#### RC-2: ProfileCluster Design Spec Required

Before Phase 4 begins, Chief Architect must approve a ProfileCluster schema design including:
- Relationship to existing `Person` model (1:many or 1:1)
- Confidence score storage pattern
- Manual override mechanism
- Index strategy for lookup performance

#### RC-3: Analyzer Registry Interface Definition

Add to Phase 4 deliverables:
```typescript
interface Analyzer<T> {
  readonly name: string;
  readonly version: string;
  readonly inputSchema: z.ZodSchema<T>;

  analyze(input: T): Promise<AnalyzerResult>;
  canReanalyze(lastRun: Date, newData: boolean): boolean;
}
```

#### RC-4: Vercel Constraint Enforcement

Explicitly state in Phase 3 plan:
- Entity Resolution processing MUST use Inngest step functions with chunking
- Maximum 10-second inline processing; longer operations must be queued
- Add Inngest function for `er.process-batch` with retry logic

### Additional Risks Identified

| Risk | Severity | Mitigation |
|------|----------|------------|
| Event Ingestion Complexity Underestimated | MEDIUM | Define clear cutover criteria for deprecating direct writes |
| ProfileCluster Schema Migration | MEDIUM | Add ProfileCluster as new model, not replacing Person; plan data backfill |
| Phase 2/3 Boundary Blur | HIGH | Strict phase boundaries required |
| Testing Regression During Migration | MEDIUM | Maintain 98%+ E2E threshold throughout |
| Vercel Function Timeout on ER | MEDIUM | Use Inngest step functions, not inline processing |

### Testing Gates (Mandatory)

**Phase 3 Gates:**
- Unit tests for `EventIngestionService` idempotency (100% coverage)
- Integration tests for adapter event emission
- E2E tests continue passing (98%+ threshold maintained)

**Phase 4 Gates:**
- Unit tests for ProfileCluster merge logic (including edge cases)
- Integration tests for Analyzer Registry plugin system
- E2E tests for entity resolution with manual review queue

**Phase 5 Gates:**
- E2E tests for Transparency UI components
- Full user journey test: import → resolve → score → path → explain

### Follow-up Tasks

| Task | Owner | Phase | Priority |
|------|-------|-------|----------|
| Complete Phase 2 warm intro MVP | Manager | Phase 2 | P0 |
| Draft ProfileCluster schema proposal | Manager | Phase 2 (prep) | P1 |
| Define EventIngestionService interface | Adapter Engineer | Phase 3 Start | P0 |
| Implement dual-write for LinkedIn adapter | Adapter Engineer | Phase 3 | P0 |
| Add Inngest function for ER batch processing | DevOps | Phase 3 | P1 |
| Create Analyzer Registry abstract class | Graph Intelligence | Phase 4 Start | P0 |
| Implement Transparency UI component library | UI Engineer | Phase 5 | P0 |
| Update E2E tests for event-driven flows | QA Engineer | Phase 3-4 | P1 |

---

**Proposed by:** Manager Agent (Steve)
**Date:** 2026-02-14
**Approved by:** Chief Architect Agent
**Approval Date:** 2026-02-14
**Status:** APPROVED WITH CONDITIONS
