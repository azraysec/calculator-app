# ADR-20260201-PHASE2-CORE-DOMAIN: Phase 2 Core Domain Implementation

**Date:** 2026-02-01
**Status:** PROPOSED (Awaiting Chief Architect Approval)
**Decision Maker:** Chief Architect Agent
**Context:** Planning Phase 2 implementation after successful Phase 1 multi-tenant architecture completion

---

## Executive Summary

Phase 1 is complete with 100% E2E test pass rate and full multi-tenant architecture. Phase 2 focuses on the core domain functionality: relationship scoring, pathfinding algorithms, and additional data source adapters.

---

## Phase 2 Scope Decision

### Priority 1: Core Domain Foundation (Days 1-5)

#### 1.1 Prisma Schema Extensions
```prisma
// New models for relationship scoring
model RelationshipScore {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  sourcePersonId    String
  sourcePerson      Person   @relation("SourcePerson", fields: [sourcePersonId], references: [id])

  targetPersonId    String
  targetPerson      Person   @relation("TargetPerson", fields: [targetPersonId], references: [id])

  // Scoring factors
  interactionCount  Int      @default(0)
  recencyScore      Float    @default(0)    // 0-1, decays over time
  frequencyScore    Float    @default(0)    // 0-1, based on interaction frequency
  bidirectionalScore Float   @default(0)    // 0-1, two-way vs one-way
  channelDiversity  Float    @default(0)    // 0-1, multiple channels = stronger

  // Composite score
  overallScore      Float    @default(0)    // Weighted combination
  confidence        Float    @default(0)    // How confident we are in this score

  // Metadata
  lastInteractionAt DateTime?
  calculatedAt      DateTime @default(now())

  @@unique([userId, sourcePersonId, targetPersonId])
  @@index([userId])
  @@index([userId, overallScore])
}

model IntroductionPath {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  targetPersonId  String
  targetPerson    Person   @relation(fields: [targetPersonId], references: [id])

  // Path data (JSON array of person IDs)
  pathNodes       Json     // ["personId1", "personId2", "targetId"]
  hopCount        Int

  // Scoring
  pathScore       Float    // Combined score for the path
  explanation     String   // Human-readable why this path

  // Status
  status          PathStatus @default(SUGGESTED)

  createdAt       DateTime @default(now())

  @@index([userId])
  @@index([userId, targetPersonId])
}

enum PathStatus {
  SUGGESTED
  ACCEPTED
  IN_PROGRESS
  COMPLETED
  DECLINED
}
```

#### 1.2 Relationship Scoring Algorithm
**Location:** `packages/core/src/scoring/`

```typescript
interface ScoringWeights {
  recency: number;      // Default: 0.30
  frequency: number;    // Default: 0.25
  bidirectional: number; // Default: 0.25
  channelDiversity: number; // Default: 0.20
}

interface ScoreInput {
  interactions: Interaction[];
  channels: string[];
  lastInteraction: Date | null;
  firstInteraction: Date | null;
}

// Recency score: exponential decay
function calculateRecency(lastInteraction: Date | null): number {
  if (!lastInteraction) return 0;
  const daysSince = daysBetween(lastInteraction, new Date());
  return Math.exp(-daysSince / 180); // Half-life of ~6 months
}

// Frequency score: logarithmic scale
function calculateFrequency(count: number, timeSpanDays: number): number {
  const interactionsPerMonth = (count / timeSpanDays) * 30;
  return Math.min(1, Math.log10(interactionsPerMonth + 1) / 2);
}
```

#### 1.3 Pathfinding Algorithm
**Location:** `packages/core/src/pathfinding/`

```typescript
interface PathfindingOptions {
  maxHops: number;        // Default: 3
  maxPaths: number;       // Default: 5
  minEdgeScore: number;   // Default: 0.1
  userId: string;
}

interface PathResult {
  path: Person[];
  score: number;
  explanation: string;
  edges: RelationshipScore[];
}

// BFS with scoring for warm intro paths
async function findWarmIntroPaths(
  userId: string,
  targetPersonId: string,
  options: PathfindingOptions
): Promise<PathResult[]>;
```

### Priority 2: Additional Data Source Adapters (Days 6-10)

#### 2.1 Adapter Interface (Already Defined)
```typescript
export interface SourceAdapter {
  sourceName: DataSourceType;
  capabilities(): Promise<AdapterCapabilities>;
  listContacts(params: ListParams): Promise<PaginatedResult<CanonicalContact>>;
  listInteractions(params: ListParams): Promise<PaginatedResult<CanonicalInteraction>>;
}
```

#### 2.2 New Adapters to Implement

| Adapter | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| Gmail/Google Contacts | HIGH | Medium | OAuth2, use googleapis SDK |
| HubSpot CRM | HIGH | Low | Well-documented API |
| Calendar (Google) | MEDIUM | Medium | Extract meeting attendees |
| Slack | MEDIUM | Medium | OAuth2, conversation history |
| CSV Import (Generic) | HIGH | Low | For LinkedIn exports, etc. |

#### 2.3 Adapter Implementation Order
1. **CSV Import Adapter** - Quick win, enables LinkedIn export import
2. **Gmail Adapter** - High value, most users have Gmail
3. **HubSpot Adapter** - CRM integration, contact + engagement data
4. **Google Calendar Adapter** - Meeting attendees = strong signals
5. **Slack Adapter** - Conversation history for scoring

### Priority 3: Enhanced Privacy Controls (Days 11-12)

#### 3.1 Granular Privacy Options
```prisma
model PrivacySetting {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Global settings
  defaultPrivacyLevel  PrivacyLevel @default(PRIVATE)
  allowPathfinding     Boolean @default(true)
  shareConnectionCount Boolean @default(false)

  // Per-source overrides
  sourceOverrides      Json?   // { "LINKEDIN": "PRIVATE", "GMAIL": "CONNECTIONS_ONLY" }

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([userId])
}
```

#### 3.2 Privacy UI Enhancements
- Per-data-source privacy controls
- "Who can see my data" visualization
- Data export functionality (GDPR)
- Connection visibility settings

### Priority 4: UI for Core Features (Days 13-16)

#### 4.1 Path Visualization Component
- Highlight selected path in graph
- Show edge scores on hover
- Animate path discovery

#### 4.2 Evidence Panel
- Show interaction history per edge
- Summarize relationship signals
- Confidence indicators

#### 4.3 Action Panel
- Draft intro request
- Channel selection
- Track outreach status

---

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| OAuth complexity for adapters | Medium | Start with CSV import, defer OAuth adapters |
| Pathfinding performance on large graphs | Medium | Implement caching, limit max hops |
| Privacy edge cases | High | Start with most restrictive defaults |
| LinkedIn API restrictions | High | Focus on export/import, document limitations |

---

## Testing Requirements

### Unit Tests (100% coverage for core)
- Scoring algorithm with known inputs/outputs
- Pathfinding algorithm with test graphs
- Privacy filtering logic

### Integration Tests
- Adapter tests against mocked APIs
- Database operations with test fixtures
- API route tests for new endpoints

### E2E Tests
- Search for target person
- View recommended paths
- Generate intro draft
- Connect new data source

---

## Implementation Plan

### Week 1: Core Domain
| Day | Task | Owner | Dependencies |
|-----|------|-------|--------------|
| 1 | Create schema migrations | Postgres Pro | ADR Approval |
| 2 | Implement scoring algorithm | Graph Intelligence | Schema |
| 2 | Unit tests for scoring | QA Test Engineer | Algorithm |
| 3 | Implement pathfinding | Graph Intelligence | Scoring |
| 3 | Unit tests for pathfinding | QA Test Engineer | Pathfinding |
| 4 | API routes for paths | Manager | Pathfinding |
| 5 | Integration tests | QA Test Engineer | API routes |

### Week 2: Adapters
| Day | Task | Owner | Dependencies |
|-----|------|-------|--------------|
| 6 | CSV Import Adapter | Adapter Engineer | Schema |
| 7 | Gmail Adapter (basic) | Adapter Engineer | OAuth setup |
| 8 | HubSpot Adapter | Adapter Engineer | API keys |
| 9 | Calendar Adapter | Adapter Engineer | Gmail OAuth |
| 10 | Adapter integration tests | QA Test Engineer | All adapters |

### Week 3: UI & Polish
| Day | Task | Owner | Dependencies |
|-----|------|-------|--------------|
| 11-12 | Privacy UI enhancements | UI Engineer | Schema |
| 13-14 | Path visualization | UI Engineer | API routes |
| 15 | Evidence panel | UI Engineer | Visualization |
| 16 | Action panel + E2E tests | QA Test Engineer | All UI |

---

## Success Criteria

1. User can search for target person and see top 3 warm intro paths
2. Paths are ranked by relationship strength with explanations
3. User can connect at least 2 data sources (CSV + one OAuth)
4. Privacy controls allow per-source configuration
5. All features have comprehensive test coverage (>90%)
6. E2E tests cover core user journey

---

## Decision Required

**Chief Architect:** Please review and approve/modify this Phase 2 implementation plan.

**Key decisions needed:**
1. Approve schema extensions
2. Approve adapter priority order
3. Confirm pathfinding algorithm approach
4. Validate testing requirements

---

**Proposed by:** Manager Agent (Steve)
**Date:** 2026-02-01
**Status:** AWAITING APPROVAL
