# WIG Project Plan

**Project:** Warm Intro Graph (WIG) System
**Current Version:** v0.21.0
**Last Updated:** 2026-02-14

---

# PHASE 2: Warm Intro MVP

**Target:** v0.25.0

---

## STEP 2.1: RelationshipScore Schema

### 2.1.1 Implementation

```
□ 2.1.1.a  Add RelationshipScore model to schema.prisma
□ 2.1.1.b  Add fields: recencyScore, frequencyScore, bidirectionalScore, channelDiversity (Float)
□ 2.1.1.c  Add fields: overallScore, confidence (Float)
□ 2.1.1.d  Add fields: interactionCount (Int), lastInteractionAt (DateTime?)
□ 2.1.1.e  Add relations: userId→User, sourcePersonId→Person, targetPersonId→Person
□ 2.1.1.f  Add unique constraint: @@unique([userId, sourcePersonId, targetPersonId])
□ 2.1.1.g  Add indexes: @@index([userId]), @@index([userId, overallScore])
□ 2.1.1.h  Run prisma validate
□ 2.1.1.i  Run prisma migrate dev --name add_relationship_score
□ 2.1.1.j  Verify migration applied
```

### 2.1.2 Tests

**File:** `packages/db/src/__tests__/relationship-score.test.ts`

```
□ TEST: "should create a RelationshipScore record"
□ TEST: "should read RelationshipScore by id"
□ TEST: "should update RelationshipScore fields"
□ TEST: "should delete RelationshipScore"
□ TEST: "should enforce unique constraint on userId+sourcePersonId+targetPersonId"
□ TEST: "should only return scores for the querying user"
□ TEST: "should use index when querying by userId+overallScore"
□ TEST: "should cascade delete when User is deleted"
```

### ⛔ GATEWAY 2.1

```
ALL tests in 2.1.2 must pass before proceeding to 2.2
Run: pnpm test packages/db/src/__tests__/relationship-score.test.ts
Expected: 8/8 passing
```

---

## STEP 2.2: IntroductionPath Schema

### 2.2.1 Implementation

```
□ 2.2.1.a  Add PathStatus enum: SUGGESTED, ACCEPTED, IN_PROGRESS, COMPLETED, DECLINED
□ 2.2.1.b  Add IntroductionPath model to schema.prisma
□ 2.2.1.c  Add fields: pathNodes (Json), hopCount (Int)
□ 2.2.1.d  Add fields: pathScore (Float), explanation (String)
□ 2.2.1.e  Add field: status (PathStatus, default SUGGESTED)
□ 2.2.1.f  Add relations: userId→User, targetPersonId→Person
□ 2.2.1.g  Add indexes: @@index([userId]), @@index([userId, targetPersonId])
□ 2.2.1.h  Run prisma validate
□ 2.2.1.i  Run prisma migrate dev --name add_introduction_path
□ 2.2.1.j  Verify migration applied
```

### 2.2.2 Tests

**File:** `packages/db/src/__tests__/introduction-path.test.ts`

```
□ TEST: "should create an IntroductionPath record"
□ TEST: "should read IntroductionPath by id"
□ TEST: "should update IntroductionPath status"
□ TEST: "should delete IntroductionPath"
□ TEST: "should store pathNodes as JSON array correctly"
□ TEST: "should only return paths for the querying user"
□ TEST: "should query by targetPersonId"
□ TEST: "should accept all PathStatus enum values"
```

### ⛔ GATEWAY 2.2

```
ALL tests in 2.2.2 must pass before proceeding to 2.3
Run: pnpm test packages/db/src/__tests__/introduction-path.test.ts
Expected: 8/8 passing
```

---

## STEP 2.3: Scoring - Recency

### 2.3.1 Implementation

**File:** `packages/core/src/scoring/recency.ts`

```
□ 2.3.1.a  Create packages/core/src/scoring/ directory
□ 2.3.1.b  Create recency.ts file
□ 2.3.1.c  Define: export function calculateRecency(lastInteraction: Date | null): number
□ 2.3.1.d  Return 0 if lastInteraction is null
□ 2.3.1.e  Calculate daysSince = (now - lastInteraction) / (1000 * 60 * 60 * 24)
□ 2.3.1.f  Apply exponential decay: Math.exp(-daysSince / 180)
□ 2.3.1.g  Clamp result: Math.max(0, Math.min(1, result))
□ 2.3.1.h  Export function from index.ts
```

### 2.3.2 Tests

**File:** `packages/core/src/scoring/recency.test.ts`

```
□ TEST: "should return 0 when lastInteraction is null"
□ TEST: "should return > 0.99 when lastInteraction is today"
□ TEST: "should return > 0.99 when lastInteraction is 1 day ago"
□ TEST: "should return approximately 0.85 when lastInteraction is 30 days ago"
□ TEST: "should return approximately 0.61 when lastInteraction is 90 days ago"
□ TEST: "should return approximately 0.37 when lastInteraction is 180 days ago"
□ TEST: "should return approximately 0.13 when lastInteraction is 365 days ago"
□ TEST: "should return < 0.02 when lastInteraction is 730 days ago"
□ TEST: "should always return a value >= 0"
□ TEST: "should always return a value <= 1"
□ TEST: "should return 1 when lastInteraction is in the future (clamp)"
```

### ⛔ GATEWAY 2.3

```
ALL tests in 2.3.2 must pass before proceeding to 2.4
Run: pnpm test packages/core/src/scoring/recency.test.ts
Expected: 11/11 passing
```

---

## STEP 2.4: Scoring - Frequency

### 2.4.1 Implementation

**File:** `packages/core/src/scoring/frequency.ts`

```
□ 2.4.1.a  Create frequency.ts file
□ 2.4.1.b  Define: export function calculateFrequency(count: number, timeSpanDays: number): number
□ 2.4.1.c  Return 0 if count is 0
□ 2.4.1.d  Return 0 if timeSpanDays is 0
□ 2.4.1.e  Calculate perMonth = (count / timeSpanDays) * 30
□ 2.4.1.f  Apply logarithmic scale: Math.min(1, Math.log10(perMonth + 1) / 2)
□ 2.4.1.g  Clamp result to 0-1 range
□ 2.4.1.h  Export function from index.ts
```

### 2.4.2 Tests

**File:** `packages/core/src/scoring/frequency.test.ts`

```
□ TEST: "should return 0 when count is 0"
□ TEST: "should return 0 when timeSpanDays is 0"
□ TEST: "should return ~0.15 for 1 interaction in 30 days (1/month)"
□ TEST: "should return ~0.35 for 4 interactions in 30 days (4/month)"
□ TEST: "should return ~0.74 for 30 interactions in 30 days (30/month)"
□ TEST: "should return ~1.0 for 100 interactions in 30 days (100/month)"
□ TEST: "should always return a value >= 0"
□ TEST: "should always return a value <= 1"
□ TEST: "should throw error when count is negative"
□ TEST: "should throw error when timeSpanDays is negative"
```

### ⛔ GATEWAY 2.4

```
ALL tests in 2.4.2 must pass before proceeding to 2.5
Run: pnpm test packages/core/src/scoring/frequency.test.ts
Expected: 10/10 passing
```

---

## STEP 2.5: Scoring - Bidirectional

### 2.5.1 Implementation

**File:** `packages/core/src/scoring/bidirectional.ts`

```
□ 2.5.1.a  Create bidirectional.ts file
□ 2.5.1.b  Define: export function calculateBidirectional(sent: number, received: number): number
□ 2.5.1.c  Return 0 if both sent and received are 0
□ 2.5.1.d  Calculate ratio: Math.min(sent, received) / Math.max(sent, received)
□ 2.5.1.e  Weight by volume factor
□ 2.5.1.f  Clamp result to 0-1 range
□ 2.5.1.g  Export function from index.ts
```

### 2.5.2 Tests

**File:** `packages/core/src/scoring/bidirectional.test.ts`

```
□ TEST: "should return 0 when both sent and received are 0"
□ TEST: "should return < 0.3 when sent=10, received=0 (one-way outbound)"
□ TEST: "should return < 0.3 when sent=0, received=10 (one-way inbound)"
□ TEST: "should return > 0.9 when sent=10, received=10 (balanced)"
□ TEST: "should return ~0.5-0.7 when sent=10, received=5 (2:1 ratio)"
□ TEST: "should return > 0.9 when sent=100, received=100 (high volume balanced)"
□ TEST: "should always return a value >= 0"
□ TEST: "should always return a value <= 1"
□ TEST: "should throw error when sent is negative"
□ TEST: "should throw error when received is negative"
```

### ⛔ GATEWAY 2.5

```
ALL tests in 2.5.2 must pass before proceeding to 2.6
Run: pnpm test packages/core/src/scoring/bidirectional.test.ts
Expected: 10/10 passing
```

---

## STEP 2.6: Scoring - Channel Diversity

### 2.6.1 Implementation

**File:** `packages/core/src/scoring/channel-diversity.ts`

```
□ 2.6.1.a  Create channel-diversity.ts file
□ 2.6.1.b  Define: export function calculateChannelDiversity(channels: string[]): number
□ 2.6.1.c  Return 0 if channels array is empty
□ 2.6.1.d  Deduplicate and lowercase channels
□ 2.6.1.e  Count unique channels
□ 2.6.1.f  Scale: 1=0.25, 2=0.5, 3=0.75, 4+=1.0
□ 2.6.1.g  Export function from index.ts
```

### 2.6.2 Tests

**File:** `packages/core/src/scoring/channel-diversity.test.ts`

```
□ TEST: "should return 0 when channels array is empty"
□ TEST: "should return 0.25 for ['email'] (1 channel)"
□ TEST: "should return 0.5 for ['email', 'linkedin'] (2 channels)"
□ TEST: "should return 0.75 for ['email', 'linkedin', 'phone'] (3 channels)"
□ TEST: "should return 1.0 for ['email', 'linkedin', 'phone', 'slack'] (4 channels)"
□ TEST: "should return 1.0 for 5+ channels (capped)"
□ TEST: "should deduplicate channels: ['email', 'email'] = 1 channel"
□ TEST: "should be case insensitive: ['Email', 'EMAIL'] = 1 channel"
□ TEST: "should always return a value >= 0"
□ TEST: "should always return a value <= 1"
```

### ⛔ GATEWAY 2.6

```
ALL tests in 2.6.2 must pass before proceeding to 2.7
Run: pnpm test packages/core/src/scoring/channel-diversity.test.ts
Expected: 10/10 passing
```

---

## STEP 2.7: Scoring - Composite

### 2.7.1 Implementation

**File:** `packages/core/src/scoring/composite.ts`

```
□ 2.7.1.a  Create composite.ts file
□ 2.7.1.b  Define ScoringFactors interface { recency, frequency, bidirectional, channelDiversity }
□ 2.7.1.c  Define ScoringWeights interface with same fields
□ 2.7.1.d  Define DEFAULT_WEIGHTS = { recency: 0.30, frequency: 0.25, bidirectional: 0.25, channelDiversity: 0.20 }
□ 2.7.1.e  Define: export function calculateComposite(factors: ScoringFactors, weights?: ScoringWeights): number
□ 2.7.1.f  Use DEFAULT_WEIGHTS if weights not provided
□ 2.7.1.g  Validate weights sum to 1.0 (throw if not)
□ 2.7.1.h  Calculate weighted sum
□ 2.7.1.i  Export function and interfaces from index.ts
```

### 2.7.2 Tests

**File:** `packages/core/src/scoring/composite.test.ts`

```
□ TEST: "should return 0 when all factors are 0"
□ TEST: "should return 1 when all factors are 1"
□ TEST: "should have default weights that sum to 1.0"
□ TEST: "should apply custom weights correctly"
□ TEST: "should throw error when weights do not sum to 1.0"
□ TEST: "should return 0.30 when only recency=1 (others=0)"
□ TEST: "should return 0.25 when only frequency=1 (others=0)"
□ TEST: "should return 0.25 when only bidirectional=1 (others=0)"
□ TEST: "should return 0.20 when only channelDiversity=1 (others=0)"
□ TEST: "should always return a value >= 0"
□ TEST: "should always return a value <= 1"
```

### ⛔ GATEWAY 2.7

```
ALL tests in 2.7.2 must pass before proceeding to 2.8
Run: pnpm test packages/core/src/scoring/composite.test.ts
Expected: 11/11 passing
```

---

## STEP 2.8: Scoring - Calculator Service

### 2.8.1 Implementation

**File:** `packages/core/src/scoring/score-calculator.ts`

```
□ 2.8.1.a  Create score-calculator.ts file
□ 2.8.1.b  Define ScoringInput interface { interactions[], channels[], lastInteraction, firstInteraction }
□ 2.8.1.c  Define ScoringResult interface { score, factors: ScoringFactors, confidence }
□ 2.8.1.d  Create class ScoreCalculator
□ 2.8.1.e  Add constructor(weights?: ScoringWeights)
□ 2.8.1.f  Add method calculate(input: ScoringInput): ScoringResult
□ 2.8.1.g  Call calculateRecency with input.lastInteraction
□ 2.8.1.h  Call calculateFrequency with input.interactions.length and timespan
□ 2.8.1.i  Call calculateBidirectional with sent/received counts
□ 2.8.1.j  Call calculateChannelDiversity with input.channels
□ 2.8.1.k  Call calculateComposite with all factors
□ 2.8.1.l  Calculate confidence based on data completeness
□ 2.8.1.m  Return ScoringResult with all data
□ 2.8.1.n  Export class from index.ts
```

### 2.8.2 Tests

**File:** `packages/core/src/scoring/score-calculator.test.ts`

```
□ TEST: "should instantiate with default weights"
□ TEST: "should instantiate with custom weights"
□ TEST: "should return a ScoringResult from calculate()"
□ TEST: "should include all factor breakdowns in result"
□ TEST: "should include overall score in result"
□ TEST: "should include confidence in result"
□ TEST: "should return score=0 and confidence=0 for empty input"
□ TEST: "should return high confidence for complete input"
□ TEST: "should return medium confidence for partial input"
□ TEST: "should correctly integrate all factor calculations"
```

### ⛔ GATEWAY 2.8

```
ALL tests in 2.8.2 must pass before proceeding to 2.9
Run: pnpm test packages/core/src/scoring/score-calculator.test.ts
Expected: 10/10 passing
```

---

## STEP 2.9: Scoring - Module Index

### 2.9.1 Implementation

```
□ 2.9.1.a  Create packages/core/src/scoring/types.ts with all interfaces
□ 2.9.1.b  Create packages/core/src/scoring/constants.ts with DEFAULT_WEIGHTS
□ 2.9.1.c  Create packages/core/src/scoring/index.ts
□ 2.9.1.d  Export all functions: calculateRecency, calculateFrequency, calculateBidirectional, calculateChannelDiversity, calculateComposite
□ 2.9.1.e  Export all types: ScoringFactors, ScoringWeights, ScoringInput, ScoringResult
□ 2.9.1.f  Export ScoreCalculator class
□ 2.9.1.g  Export DEFAULT_WEIGHTS constant
```

### 2.9.2 Tests

**File:** `packages/core/src/scoring/index.test.ts`

```
□ TEST: "should export calculateRecency function"
□ TEST: "should export calculateFrequency function"
□ TEST: "should export calculateBidirectional function"
□ TEST: "should export calculateChannelDiversity function"
□ TEST: "should export calculateComposite function"
□ TEST: "should export ScoreCalculator class"
□ TEST: "should export DEFAULT_WEIGHTS constant"
□ TEST: "should have DEFAULT_WEIGHTS sum to 1.0"
```

### ⛔ GATEWAY 2.9 - SCORING MODULE COMPLETE

```
ALL scoring tests must pass before proceeding to Pathfinding
Run: pnpm test packages/core/src/scoring/
Expected: 70/70 passing (all scoring tests)
```

---

## STEP 2.10: Pathfinding - Graph Builder

### 2.10.1 Implementation

**File:** `packages/core/src/pathfinding/graph-builder.ts`

```
□ 2.10.1.a  Create packages/core/src/pathfinding/ directory
□ 2.10.1.b  Create types.ts with Graph, Node, Edge interfaces
□ 2.10.1.c  Create graph-builder.ts file
□ 2.10.1.d  Define: export async function buildGraph(userId: string, prisma: PrismaClient): Promise<Graph>
□ 2.10.1.e  Query all Person records WHERE userId = userId
□ 2.10.1.f  Query all Connection records WHERE userId = userId
□ 2.10.1.g  Build nodes: Map<personId, Node>
□ 2.10.1.h  Build adjacency: Map<personId, Edge[]>
□ 2.10.1.i  Return Graph object { nodes, adjacency }
□ 2.10.1.j  Export function from index.ts
```

### 2.10.2 Tests

**File:** `packages/core/src/pathfinding/graph-builder.test.ts`

```
□ TEST: "should return empty graph for empty database"
□ TEST: "should load all persons for the specified user"
□ TEST: "should NOT load persons belonging to other users"
□ TEST: "should load all connections for the specified user"
□ TEST: "should NOT load connections belonging to other users"
□ TEST: "should build correct adjacency list structure"
□ TEST: "should create bidirectional edges for connections"
□ TEST: "should handle persons with no connections"
```

### ⛔ GATEWAY 2.10

```
ALL tests in 2.10.2 must pass before proceeding to 2.11
Run: pnpm test packages/core/src/pathfinding/graph-builder.test.ts
Expected: 8/8 passing
```

---

## STEP 2.11: Pathfinding - BFS Traversal

### 2.11.1 Implementation

**File:** `packages/core/src/pathfinding/bfs.ts`

```
□ 2.11.1.a  Create bfs.ts file
□ 2.11.1.b  Define Path type: { nodes: string[], edges: Edge[] }
□ 2.11.1.c  Define: export function findAllPaths(graph: Graph, startId: string, targetId: string, maxHops: number): Path[]
□ 2.11.1.d  Initialize queue with [{ currentId: startId, path: [startId], visited: Set([startId]) }]
□ 2.11.1.e  While queue not empty, dequeue and process
□ 2.11.1.f  If currentId === targetId, add path to results
□ 2.11.1.g  If path.length > maxHops, skip expansion
□ 2.11.1.h  For each neighbor not in visited, enqueue new state
□ 2.11.1.i  Return all found paths
□ 2.11.1.j  Export function from index.ts
```

### 2.11.2 Tests

**File:** `packages/core/src/pathfinding/bfs.test.ts`

```
□ TEST: "should find direct connection (1 hop path)"
□ TEST: "should find 2-hop path through intermediary"
□ TEST: "should find 3-hop path through two intermediaries"
□ TEST: "should only return direct connections when maxHops=1"
□ TEST: "should return 1-hop and 2-hop paths when maxHops=2"
□ TEST: "should return empty array when no path exists"
□ TEST: "should return empty array when start === target"
□ TEST: "should avoid cycles (not revisit nodes in same path)"
□ TEST: "should find multiple paths to same target"
□ TEST: "should handle disconnected graph correctly"
```

### ⛔ GATEWAY 2.11

```
ALL tests in 2.11.2 must pass before proceeding to 2.12
Run: pnpm test packages/core/src/pathfinding/bfs.test.ts
Expected: 10/10 passing
```

---

## STEP 2.12: Pathfinding - Path Scoring

### 2.12.1 Implementation

**File:** `packages/core/src/pathfinding/path-scoring.ts`

```
□ 2.12.1.a  Create path-scoring.ts file
□ 2.12.1.b  Define: export function scorePath(path: Path, edgeScores: Map<string, number>): number
□ 2.12.1.c  For each edge in path, get score (default 0.5 if missing)
□ 2.12.1.d  Multiply all edge scores together
□ 2.12.1.e  Apply hop penalty: result * Math.pow(0.9, path.nodes.length - 1)
□ 2.12.1.f  Clamp result to 0-1 range
□ 2.12.1.g  Export function from index.ts
```

### 2.12.2 Tests

**File:** `packages/core/src/pathfinding/path-scoring.test.ts`

```
□ TEST: "should use edge score for single-edge path"
□ TEST: "should multiply edge scores for two-edge path"
□ TEST: "should multiply all edge scores for three-edge path"
□ TEST: "should score shorter path higher than longer path (same edge scores)"
□ TEST: "should use default score (0.5) for missing edge"
□ TEST: "should apply hop penalty (all 1.0 edges still < 1.0 for multi-hop)"
□ TEST: "should always return a value >= 0"
□ TEST: "should always return a value <= 1"
```

### ⛔ GATEWAY 2.12

```
ALL tests in 2.12.2 must pass before proceeding to 2.13
Run: pnpm test packages/core/src/pathfinding/path-scoring.test.ts
Expected: 8/8 passing
```

---

## STEP 2.13: Pathfinding - Ranker & Explainer

### 2.13.1 Implementation

**File:** `packages/core/src/pathfinding/path-ranker.ts`

```
□ 2.13.1.a  Create path-ranker.ts file
□ 2.13.1.b  Define ScoredPath type: Path & { score: number }
□ 2.13.1.c  Define RankedPath type: ScoredPath & { rank: number, explanation: string }
□ 2.13.1.d  Define: export function rankPaths(paths: ScoredPath[], maxPaths: number): RankedPath[]
□ 2.13.1.e  Sort paths by score descending
□ 2.13.1.f  Slice to maxPaths
□ 2.13.1.g  Add rank property (1, 2, 3...)
□ 2.13.1.h  Export function from index.ts
```

**File:** `packages/core/src/pathfinding/explain-path.ts`

```
□ 2.13.1.i  Create explain-path.ts file
□ 2.13.1.j  Define: export function explainPath(path: RankedPath, nodeNames: Map<string, string>): string
□ 2.13.1.k  Get names for all nodes in path
□ 2.13.1.l  Generate: "Connect through [Name1] → [Name2] to reach [Target]"
□ 2.13.1.m  Add strength description based on score
□ 2.13.1.n  Export function from index.ts
```

### 2.13.2 Tests

**File:** `packages/core/src/pathfinding/path-ranker.test.ts`

```
□ TEST: "should sort paths by score descending"
□ TEST: "should respect maxPaths limit"
□ TEST: "should assign correct rank numbers (1, 2, 3...)"
□ TEST: "should handle ties with stable sort"
□ TEST: "should return empty array for empty input"
```

**File:** `packages/core/src/pathfinding/explain-path.test.ts`

```
□ TEST: "should include all person names in explanation"
□ TEST: "should include strength description (strong/moderate/weak)"
□ TEST: "should be human-readable sentence"
□ TEST: "should handle direct connection (no intermediary)"
```

### ⛔ GATEWAY 2.13

```
ALL tests in 2.13.2 must pass before proceeding to 2.14
Run: pnpm test packages/core/src/pathfinding/path-ranker.test.ts packages/core/src/pathfinding/explain-path.test.ts
Expected: 9/9 passing
```

---

## STEP 2.14: Pathfinding - Service

### 2.14.1 Implementation

**File:** `packages/core/src/pathfinding/pathfinder.ts`

```
□ 2.14.1.a  Create pathfinder.ts file
□ 2.14.1.b  Define PathfinderOptions: { maxHops?: number, maxPaths?: number }
□ 2.14.1.c  Define PathResult: { path: string[], score: number, explanation: string, rank: number }
□ 2.14.1.d  Create class Pathfinder
□ 2.14.1.e  Add constructor(private prisma: PrismaClient)
□ 2.14.1.f  Add async findWarmIntroPaths(userId: string, targetId: string, options?: PathfinderOptions): Promise<PathResult[]>
□ 2.14.1.g  Call buildGraph(userId, prisma)
□ 2.14.1.h  Find "me" node (user's Person record)
□ 2.14.1.i  Call findAllPaths(graph, meId, targetId, maxHops)
□ 2.14.1.j  Score each path
□ 2.14.1.k  Rank paths
□ 2.14.1.l  Generate explanations
□ 2.14.1.m  Return PathResult[]
□ 2.14.1.n  Handle target not found (return empty array)
□ 2.14.1.o  Export class from index.ts
```

### 2.14.2 Tests

**File:** `packages/core/src/pathfinding/pathfinder.test.ts`

```
□ TEST: "should instantiate with PrismaClient"
□ TEST: "should return PathResult array"
□ TEST: "should return results ranked by score (highest first)"
□ TEST: "should include explanations in results"
□ TEST: "should respect maxHops option"
□ TEST: "should respect maxPaths option"
□ TEST: "should return empty array when target not in graph"
□ TEST: "should return empty array when no path to target"
□ TEST: "should only return paths for the specified userId (multi-tenant)"
```

### ⛔ GATEWAY 2.14

```
ALL tests in 2.14.2 must pass before proceeding to 2.15
Run: pnpm test packages/core/src/pathfinding/pathfinder.test.ts
Expected: 9/9 passing
```

---

## STEP 2.15: Pathfinding - Module Index

### 2.15.1 Implementation

```
□ 2.15.1.a  Create packages/core/src/pathfinding/constants.ts: MAX_HOPS=3, MAX_PATHS=5, DEFAULT_EDGE_SCORE=0.5
□ 2.15.1.b  Create packages/core/src/pathfinding/index.ts
□ 2.15.1.c  Export Pathfinder class
□ 2.15.1.d  Export all types: Graph, Node, Edge, Path, PathResult, PathfinderOptions
□ 2.15.1.e  Export constants
□ 2.15.1.f  Export utility functions: buildGraph, findAllPaths, scorePath, rankPaths, explainPath
```

### 2.15.2 Tests

**File:** `packages/core/src/pathfinding/index.test.ts`

```
□ TEST: "should export Pathfinder class"
□ TEST: "should export MAX_HOPS constant with value 3"
□ TEST: "should export MAX_PATHS constant with value 5"
□ TEST: "should export all utility functions"
```

### ⛔ GATEWAY 2.15 - PATHFINDING MODULE COMPLETE

```
ALL pathfinding tests must pass before proceeding to API Route
Run: pnpm test packages/core/src/pathfinding/
Expected: 48/48 passing (all pathfinding tests)
```

---

## STEP 2.16: API Route - /api/paths/[targetId]

### 2.16.1 Implementation

**File:** `apps/web/app/api/paths/[targetId]/route.ts`

```
□ 2.16.1.a  Create apps/web/app/api/paths/[targetId]/ directory
□ 2.16.1.b  Create route.ts file
□ 2.16.1.c  Import withAuth from lib/auth
□ 2.16.1.d  Export GET handler wrapped with withAuth
□ 2.16.1.e  Extract userId from auth context
□ 2.16.1.f  Extract targetId from params
□ 2.16.1.g  Validate targetId is valid UUID format (return 400 if not)
□ 2.16.1.h  Query Person where id=targetId AND userId=userId
□ 2.16.1.i  Return 404 if target not found
□ 2.16.1.j  Parse searchParams: maxHops (default 3), maxPaths (default 5)
□ 2.16.1.k  Instantiate Pathfinder with prisma
□ 2.16.1.l  Call findWarmIntroPaths(userId, targetId, { maxHops, maxPaths })
□ 2.16.1.m  Return NextResponse.json({ paths })
□ 2.16.1.n  Wrap in try/catch, return 500 on error
```

### 2.16.2 Tests

**File:** `apps/web/app/api/paths/[targetId]/route.test.ts`

```
□ TEST: "should return 401 without authentication"
□ TEST: "should return 400 for invalid UUID format"
□ TEST: "should return 404 for non-existent targetId"
□ TEST: "should return 404 for targetId belonging to different user"
□ TEST: "should return 200 with paths array on success"
□ TEST: "should return 200 with empty array when no paths exist"
□ TEST: "should respect maxHops query parameter"
□ TEST: "should respect maxPaths query parameter"
□ TEST: "should include score in each path result"
□ TEST: "should include explanation in each path result"
```

### ⛔ GATEWAY 2.16

```
ALL tests in 2.16.2 must pass before proceeding to 2.17
Run: pnpm test apps/web/app/api/paths/
Expected: 10/10 passing
```

---

## STEP 2.17: CSV Adapter - Parser

### 2.17.1 Implementation

**File:** `packages/adapters/src/csv/parser.ts`

```
□ 2.17.1.a  Create packages/adapters/src/csv/ directory
□ 2.17.1.b  Create parser.ts file
□ 2.17.1.c  Define ParsedRow type: Record<string, string>
□ 2.17.1.d  Define: export function parseCSV(content: string): ParsedRow[]
□ 2.17.1.e  Normalize line endings: content.replace(/\r\n/g, '\n')
□ 2.17.1.f  Split into lines
□ 2.17.1.g  Extract header row (first line)
□ 2.17.1.h  Parse header into column names
□ 2.17.1.i  For each data row, parse values handling quotes
□ 2.17.1.j  Handle escaped quotes ("" → ")
□ 2.17.1.k  Handle commas within quoted fields
□ 2.17.1.l  Map values to header keys
□ 2.17.1.m  Return array of ParsedRow objects
□ 2.17.1.n  Export function from index.ts
```

### 2.17.2 Tests

**File:** `packages/adapters/src/csv/parser.test.ts`

```
□ TEST: "should parse simple CSV with header and data rows"
□ TEST: "should extract header row as object keys"
□ TEST: "should handle CRLF line endings"
□ TEST: "should handle LF line endings"
□ TEST: "should handle quoted fields"
□ TEST: "should handle escaped quotes inside quoted fields"
□ TEST: "should handle commas within quoted fields"
□ TEST: "should handle empty fields as empty string"
□ TEST: "should skip completely empty rows"
□ TEST: "should throw error on malformed CSV"
```

### ⛔ GATEWAY 2.17

```
ALL tests in 2.17.2 must pass before proceeding to 2.18
Run: pnpm test packages/adapters/src/csv/parser.test.ts
Expected: 10/10 passing
```

---

## STEP 2.18: CSV Adapter - LinkedIn Format

### 2.18.1 Implementation

**File:** `packages/adapters/src/csv/linkedin-format.ts`

```
□ 2.18.1.a  Create linkedin-format.ts file
□ 2.18.1.b  Define LinkedInConnection interface { firstName, lastName, email, company, position, connectedOn }
□ 2.18.1.c  Define COLUMN_MAP = { 'First Name': 'firstName', 'Last Name': 'lastName', ... }
□ 2.18.1.d  Define: export function parseLinkedInConnections(rows: ParsedRow[]): LinkedInConnection[]
□ 2.18.1.e  Map each row using COLUMN_MAP
□ 2.18.1.f  Extract firstName from 'First Name' column
□ 2.18.1.g  Extract lastName from 'Last Name' column
□ 2.18.1.h  Extract email from 'Email Address' column (null if empty)
□ 2.18.1.i  Extract company from 'Company' column (null if empty)
□ 2.18.1.j  Extract position from 'Position' column (null if empty)
□ 2.18.1.k  Parse connectedOn from 'Connected On' column to Date
□ 2.18.1.l  Handle missing/empty fields gracefully (null)
□ 2.18.1.m  Export function and interface from index.ts
```

### 2.18.2 Tests

**File:** `packages/adapters/src/csv/linkedin-format.test.ts`

```
□ TEST: "should extract firstName correctly"
□ TEST: "should extract lastName correctly"
□ TEST: "should extract email correctly"
□ TEST: "should extract company correctly"
□ TEST: "should extract position correctly"
□ TEST: "should parse connectedOn date correctly"
□ TEST: "should return null for missing email"
□ TEST: "should return null for missing company"
□ TEST: "should return null for missing position"
□ TEST: "should handle row with all fields missing gracefully"
```

### ⛔ GATEWAY 2.18

```
ALL tests in 2.18.2 must pass before proceeding to 2.19
Run: pnpm test packages/adapters/src/csv/linkedin-format.test.ts
Expected: 10/10 passing
```

---

## STEP 2.19: CSV Adapter - Service

### 2.19.1 Implementation

**File:** `packages/adapters/src/csv/csv-adapter.ts`

```
□ 2.19.1.a  Create csv-adapter.ts file
□ 2.19.1.b  Define ImportResult interface { created: number, updated: number, skipped: number, errors: string[] }
□ 2.19.1.c  Create class CSVAdapter
□ 2.19.1.d  Add constructor(private prisma: PrismaClient)
□ 2.19.1.e  Add async importLinkedInConnections(userId: string, content: string): Promise<ImportResult>
□ 2.19.1.f  Call parseCSV(content)
□ 2.19.1.g  Call parseLinkedInConnections(rows)
□ 2.19.1.h  For each connection:
□ 2.19.1.i    - If email exists, upsert Person by email WHERE userId=userId
□ 2.19.1.j    - If no email, create Person with name only
□ 2.19.1.k    - Create Connection record linking to "me" Person
□ 2.19.1.l    - Set userId on all created records
□ 2.19.1.m  Track created/updated/skipped counts
□ 2.19.1.n  Return ImportResult
□ 2.19.1.o  Export class from index.ts
```

### 2.19.2 Tests

**File:** `packages/adapters/src/csv/csv-adapter.test.ts`

```
□ TEST: "should instantiate with PrismaClient"
□ TEST: "should create Person records from CSV"
□ TEST: "should create Connection records linking to user"
□ TEST: "should upsert existing Person by email (no duplicates)"
□ TEST: "should set userId on all created Person records"
□ TEST: "should set userId on all created Connection records"
□ TEST: "should return correct created count"
□ TEST: "should return correct updated count"
□ TEST: "should return correct skipped count"
□ TEST: "should ensure User A cannot see User B's imported data"
□ TEST: "should handle empty CSV gracefully"
```

### ⛔ GATEWAY 2.19

```
ALL tests in 2.19.2 must pass before proceeding to 2.20
Run: pnpm test packages/adapters/src/csv/csv-adapter.test.ts
Expected: 11/11 passing
```

---

## STEP 2.20: CSV Adapter - API Route

### 2.20.1 Implementation

**File:** `apps/web/app/api/import/csv/route.ts`

```
□ 2.20.1.a  Create apps/web/app/api/import/csv/ directory
□ 2.20.1.b  Create route.ts file
□ 2.20.1.c  Export POST handler wrapped with withAuth
□ 2.20.1.d  Extract userId from auth context
□ 2.20.1.e  Parse request as FormData
□ 2.20.1.f  Get file from formData.get('file')
□ 2.20.1.g  Validate file exists (return 400 if not)
□ 2.20.1.h  Validate file type is CSV (return 400 if not)
□ 2.20.1.i  Read file content as text
□ 2.20.1.j  Instantiate CSVAdapter with prisma
□ 2.20.1.k  Call importLinkedInConnections(userId, content)
□ 2.20.1.l  Return NextResponse.json(result)
□ 2.20.1.m  Handle errors with appropriate status codes
```

### 2.20.2 Tests

**File:** `apps/web/app/api/import/csv/route.test.ts`

```
□ TEST: "should return 401 without authentication"
□ TEST: "should return 400 when no file provided"
□ TEST: "should return 400 for non-CSV file"
□ TEST: "should return 200 with import result for valid CSV"
□ TEST: "should include created count in response"
□ TEST: "should include updated count in response"
□ TEST: "should make imported data visible via /api/people"
□ TEST: "should ensure imported data only visible to uploader"
```

### ⛔ GATEWAY 2.20 - CSV ADAPTER COMPLETE

```
ALL CSV adapter tests must pass before proceeding to UI
Run: pnpm test packages/adapters/src/csv/ apps/web/app/api/import/csv/
Expected: 39/39 passing (all CSV tests)
```

---

## STEP 2.21: UI - Path Highlight Component

### 2.21.1 Implementation

**File:** `apps/web/components/graph/PathHighlight.tsx`

```
□ 2.21.1.a  Create PathHighlight.tsx component
□ 2.21.1.b  Define props: { pathNodeIds: string[] }
□ 2.21.1.c  Create highlighted node style (different background color)
□ 2.21.1.d  Create highlighted edge style (different stroke color, thicker)
□ 2.21.1.e  Add CSS transition animation
□ 2.21.1.f  Export component
```

### 2.21.2 Tests

**File:** `apps/web/components/graph/PathHighlight.test.tsx`

```
□ TEST: "should render without crashing"
□ TEST: "should apply highlight styles to specified nodes"
□ TEST: "should apply highlight styles to edges between nodes"
□ TEST: "should handle empty pathNodeIds array"
```

### ⛔ GATEWAY 2.21

```
ALL tests in 2.21.2 must pass before proceeding to 2.22
Run: pnpm test apps/web/components/graph/PathHighlight.test.tsx
Expected: 4/4 passing
```

---

## STEP 2.22: UI - Graph Integration

### 2.22.1 Implementation

```
□ 2.22.1.a  Add selectedPath state to network graph Zustand store
□ 2.22.1.b  Add setSelectedPath(path: string[] | null) action
□ 2.22.1.c  Add clearSelectedPath() action
□ 2.22.1.d  Integrate PathHighlight into NetworkGraph component
□ 2.22.1.e  Pass selectedPath from store to PathHighlight
□ 2.22.1.f  Add click handler on path list to call setSelectedPath
```

### 2.22.2 Tests

**File:** `apps/web/components/graph/NetworkGraph.test.tsx`

```
□ TEST: "should update state when setSelectedPath called"
□ TEST: "should clear state when clearSelectedPath called"
□ TEST: "should pass selectedPath to PathHighlight component"
□ TEST: "should highlight correct nodes when path selected"
```

### ⛔ GATEWAY 2.22

```
ALL tests in 2.22.2 must pass before proceeding to 2.23
Run: pnpm test apps/web/components/graph/NetworkGraph.test.tsx
Expected: 4/4 passing
```

---

## STEP 2.23: UI - Action Panel

### 2.23.1 Implementation

**File:** `apps/web/components/panels/ActionPanel.tsx`

```
□ 2.23.1.a  Create apps/web/components/panels/ directory
□ 2.23.1.b  Create ActionPanel.tsx component
□ 2.23.1.c  Define props: { path: PathResult | null }
□ 2.23.1.d  Show panel only when path is not null
□ 2.23.1.e  Display target person name
□ 2.23.1.f  Display intermediary person names
□ 2.23.1.g  Display path strength indicator (score as percentage or bar)
□ 2.23.1.h  Add "Request Intro" button
□ 2.23.1.i  Create generateIntroDraft(path: PathResult): string function
□ 2.23.1.j  Generate template: "Hi [Intermediary], I'd like to connect with [Target]..."
□ 2.23.1.k  Display draft in textarea (editable)
□ 2.23.1.l  Add "Copy to Clipboard" button
□ 2.23.1.m  Implement navigator.clipboard.writeText on click
□ 2.23.1.n  Show success toast on copy
□ 2.23.1.o  Export component
```

### 2.23.2 Tests

**File:** `apps/web/components/panels/ActionPanel.test.tsx`

```
□ TEST: "should render without crashing"
□ TEST: "should not render when path is null"
□ TEST: "should display target person name"
□ TEST: "should display intermediary names"
□ TEST: "should generate draft with correct names"
□ TEST: "should copy draft to clipboard when button clicked"
□ TEST: "should handle path with no intermediaries (direct connection)"
```

### ⛔ GATEWAY 2.23

```
ALL tests in 2.23.2 must pass before proceeding to 2.24
Run: pnpm test apps/web/components/panels/ActionPanel.test.tsx
Expected: 7/7 passing
```

---

## STEP 2.24: E2E - Full User Journey

### 2.24.1 Tests

**File:** `apps/web/e2e/warm-intro-journey.spec.ts`

```
□ TEST: "should allow user to upload a CSV file"
□ TEST: "should display uploaded contacts in network graph"
□ TEST: "should allow user to search for a person"
□ TEST: "should display warm intro paths for search result"
□ TEST: "should highlight selected path in the graph"
□ TEST: "should show action panel when path is selected"
□ TEST: "should display intro draft when Request Intro clicked"
□ TEST: "should copy draft to clipboard when Copy clicked"
□ TEST: "should clear path highlight when deselected"
□ TEST: "should complete full journey without errors"
```

### ⛔ GATEWAY 2.24 - E2E COMPLETE

```
ALL E2E tests must pass before Quality Gate
Run: pnpm test:e2e apps/web/e2e/warm-intro-journey.spec.ts
Expected: 10/10 passing
```

---

## STEP 2.25: Phase 2 Quality Gate

### 2.25.1 Final Verification

```
□ 2.25.1.a  Run ALL unit tests: pnpm test:unit
            Expected: 100% passing

□ 2.25.1.b  Run ALL integration tests: pnpm test:unit --integration
            Expected: 100% passing

□ 2.25.1.c  Run ALL E2E tests: pnpm test
            Expected: >98% passing (at least 110/112)

□ 2.25.1.d  Run TypeScript build: pnpm build
            Expected: No errors

□ 2.25.1.e  Run linter: pnpm lint
            Expected: No errors

□ 2.25.1.f  Code review: Manual review of all new code
            Expected: Approved
```

### 2.25.2 Release

```
□ 2.25.2.a  Bump version in package.json to 0.25.0
□ 2.25.2.b  Update Dashboard.md with new metrics
□ 2.25.2.c  Update STEVE-COMMUNICATION-LOG.md
□ 2.25.2.d  Commit: "release: v0.25.0 - Warm Intro MVP"
□ 2.25.2.e  Push to master
□ 2.25.2.f  Verify Vercel deployment
□ 2.25.2.g  Run post-deployment health checks
□ 2.25.2.h  Verify warm intro feature works in production
```

### ⛔ GATEWAY 2.25 - PHASE 2 COMPLETE

```
Phase 2 is COMPLETE when:
- All 195 tests pass
- Build succeeds
- Production deployment verified
- Version is 0.25.0

Proceed to Phase 3: Event Foundation
```

---

# PHASE 3: Event Foundation

**Target:** v0.30.0
**Reference:** [PRD v1.2](./PRD-v1.2-Contact-Intelligence.md)
**Prerequisite:** Phase 2 complete (v0.25.0 deployed)

---

## STEP 3.1: EventIngestionService

### 3.1.1 Implementation

```
□ 3.1.1.a  Create packages/core/src/events/ directory
□ 3.1.1.b  Define event types: contact.created, contact.updated, interaction.logged
□ 3.1.1.c  Create EventIngestionService interface
□ 3.1.1.d  Implement idempotency key generation
□ 3.1.1.e  Implement deduplication logic (check before insert)
□ 3.1.1.f  Create event_log table migration
□ 3.1.1.g  Implement event persistence
□ 3.1.1.h  Integrate with InngestEventBus
□ 3.1.1.i  Add event replay capability
□ 3.1.1.j  Export from index.ts
```

### 3.1.2 Tests

**File:** `packages/core/src/events/event-ingestion.test.ts`

```
□ TEST: "should generate unique idempotency key for each event"
□ TEST: "should store event only once when same event sent twice (idempotency)"
□ TEST: "should reject event with duplicate idempotency key"
□ TEST: "should persist event to event_log table"
□ TEST: "should trigger Inngest function when event persisted"
□ TEST: "should replay events in order when replay() called"
□ TEST: "should filter replayed events by date range"
□ TEST: "should filter replayed events by event type"
```

### ⛔ GATEWAY 3.1

```
ALL tests in 3.1.2 must pass before proceeding to 3.2
Run: pnpm test packages/core/src/events/event-ingestion.test.ts
Expected: 8/8 passing
```

---

## STEP 3.2: LinkedIn Adapter Dual-Write

### 3.2.1 Implementation

```
□ 3.2.1.a  Modify archive-parser.ts to emit events
□ 3.2.1.b  After creating Person, emit contact.created event
□ 3.2.1.c  After creating Message, emit interaction.logged event
□ 3.2.1.d  Keep existing direct DB writes (dual-write pattern)
□ 3.2.1.e  Add feature flag to disable direct writes (for future)
```

### 3.2.2 Tests

**File:** `apps/web/lib/linkedin/archive-parser-events.test.ts`

```
□ TEST: "should emit contact.created event for each connection"
□ TEST: "should emit interaction.logged event for each message"
□ TEST: "should still create DB records (dual-write)"
□ TEST: "should have matching event count and record count"
□ TEST: "should include userId in all emitted events"
```

### ⛔ GATEWAY 3.2

```
ALL tests in 3.2.2 must pass before proceeding to 3.3
Run: pnpm test apps/web/lib/linkedin/archive-parser-events.test.ts
Expected: 5/5 passing
```

---

## STEP 3.3: Gmail Adapter (with Events)

### 3.3.1 Implementation

```
□ 3.3.1.a  Create packages/adapters/src/gmail/ directory
□ 3.3.1.b  Create gmail-adapter.ts
□ 3.3.1.c  Implement OAuth2 token storage and refresh
□ 3.3.1.d  Implement contact sync (emit contact.created events)
□ 3.3.1.e  Implement email sync (emit interaction.logged events)
□ 3.3.1.f  Add incremental sync (sync token)
□ 3.3.1.g  Add rate limiting (respect Gmail API quotas)
□ 3.3.1.h  Export from index.ts
```

### 3.3.2 Tests

**File:** `packages/adapters/src/gmail/gmail-adapter.test.ts`

```
□ TEST: "should complete OAuth flow and store tokens"
□ TEST: "should refresh expired access token"
□ TEST: "should emit contact.created for each Google contact"
□ TEST: "should emit interaction.logged for each email"
□ TEST: "should only fetch new emails on incremental sync"
□ TEST: "should respect rate limits (no 429 errors)"
□ TEST: "should handle API errors gracefully"
□ TEST: "should set userId on all emitted events"
```

### ⛔ GATEWAY 3.3

```
ALL tests in 3.3.2 must pass before proceeding to 3.4
Run: pnpm test packages/adapters/src/gmail/gmail-adapter.test.ts
Expected: 8/8 passing
```

---

## STEP 3.4: Entity Resolution (Basic)

### 3.4.1 Implementation

```
□ 3.4.1.a  Create packages/core/src/entity-resolution/ directory
□ 3.4.1.b  Create types.ts with MatchCandidate, MatchResult interfaces
□ 3.4.1.c  Create email-matcher.ts: match by exact email
□ 3.4.1.d  Create name-matcher.ts: fuzzy match by name (Levenshtein)
□ 3.4.1.e  Create confidence-calculator.ts: calculate match confidence 0-1
□ 3.4.1.f  Create er-processor.ts: orchestrate matching
□ 3.4.1.g  Create Inngest function: er.process-batch (chunked processing)
□ 3.4.1.h  Implement basic profile linking (store link, don't merge yet)
□ 3.4.1.i  Export from index.ts
```

### 3.4.2 Tests

**File:** `packages/core/src/entity-resolution/entity-resolution.test.ts`

```
□ TEST: "should return high confidence (>0.9) for exact email match"
□ TEST: "should return medium confidence (0.5-0.8) for fuzzy name match"
□ TEST: "should return low confidence (<0.5) for weak matches"
□ TEST: "should always return confidence in 0-1 range"
□ TEST: "should process large dataset in chunks (batch processing)"
□ TEST: "should link matching profiles without merging"
□ TEST: "should not link profiles below confidence threshold"
□ TEST: "should handle profiles with no matches"
```

### ⛔ GATEWAY 3.4

```
ALL tests in 3.4.2 must pass before proceeding to 3.5
Run: pnpm test packages/core/src/entity-resolution/
Expected: 8/8 passing
```

---

## STEP 3.5: Phase 3 Quality Gate (RC-1)

### 3.5.1 RC-1 Verification

```
□ 3.5.1.a  Verify: All adapters emit events for 100% of writes
           Test: Import via LinkedIn, verify event count = record count

□ 3.5.1.b  Verify: Event-based writes pass 95%+ of existing E2E tests
           Run: pnpm test (existing E2E suite)
           Expected: >95% passing

□ 3.5.1.c  Verify: Dual-write can be disabled without data loss
           Test: Disable direct writes, replay events, verify data matches

□ 3.5.1.d  Run ALL new unit tests
           Expected: 100% passing

□ 3.5.1.e  Run ALL new integration tests
           Expected: 100% passing
```

### 3.5.2 Release

```
□ 3.5.2.a  Bump version to 0.30.0
□ 3.5.2.b  Update Dashboard.md
□ 3.5.2.c  Commit: "release: v0.30.0 - Event Foundation"
□ 3.5.2.d  Push and deploy
□ 3.5.2.e  Verify production health
```

### ⛔ GATEWAY 3.5 - PHASE 3 COMPLETE

```
Phase 3 is COMPLETE when:
- RC-1 requirements met (Chief Architect verified)
- All 29 new tests pass
- Existing E2E tests still >95% passing
- Version is 0.30.0

Proceed to Phase 4: Intelligence Layer
```

---

# PHASE 4: Intelligence Layer

**Target:** v0.35.0
**Reference:** [PRD v1.2](./PRD-v1.2-Contact-Intelligence.md)
**Prerequisite:** Phase 3 complete + ProfileCluster design approved (RC-2)

---

## STEP 4.1: ProfileCluster Model

### 4.1.1 Implementation

```
□ 4.1.1.a  Submit ProfileCluster design spec to Chief Architect (RC-2)
□ 4.1.1.b  Wait for Chief Architect approval
□ 4.1.1.c  Create ProfileCluster model in schema.prisma
□ 4.1.1.d  Add relationship to Person (many-to-one)
□ 4.1.1.e  Add confidence score fields
□ 4.1.1.f  Add manual override fields (isManuallyMerged, isManuallyRejected)
□ 4.1.1.g  Run migration
□ 4.1.1.h  Export types
```

### 4.1.2 Tests

**File:** `packages/db/src/__tests__/profile-cluster.test.ts`

```
□ TEST: "should create ProfileCluster record"
□ TEST: "should link multiple Persons to one ProfileCluster"
□ TEST: "should store confidence score"
□ TEST: "should mark cluster as manually merged"
□ TEST: "should split cluster (manual rejection)"
□ TEST: "should cascade delete linked Persons when cluster deleted"
```

### ⛔ GATEWAY 4.1

```
ALL tests in 4.1.2 must pass before proceeding to 4.2
Run: pnpm test packages/db/src/__tests__/profile-cluster.test.ts
Expected: 6/6 passing
```

---

## STEP 4.2: Analyzer Registry

### 4.2.1 Implementation

```
□ 4.2.1.a  Create Analyzer interface (RC-3): name, version, inputSchema, analyze(), canReanalyze()
□ 4.2.1.b  Create AnalyzerRegistry class with register(), get(), list()
□ 4.2.1.c  Implement analyzer versioning (store version with results)
□ 4.2.1.d  Create EmailPatternAnalyzer (extract domain patterns)
□ 4.2.1.e  Create CommunicationFrequencyAnalyzer (analyze interaction patterns)
□ 4.2.1.f  Migrate existing scoring to RelationshipScoreAnalyzer
□ 4.2.1.g  Export from index.ts
```

### 4.2.2 Tests

**File:** `packages/core/src/analyzers/analyzer-registry.test.ts`

```
□ TEST: "should register analyzer with name and version"
□ TEST: "should retrieve registered analyzer by name"
□ TEST: "should list all registered analyzers"
□ TEST: "should store analyzer version with results"
□ TEST: "should trigger re-analysis when analyzer version changes"
□ TEST: "EmailPatternAnalyzer should extract domain patterns"
□ TEST: "CommunicationFrequencyAnalyzer should analyze patterns"
□ TEST: "RelationshipScoreAnalyzer should produce same results as old scoring"
```

### ⛔ GATEWAY 4.2

```
ALL tests in 4.2.2 must pass before proceeding to 4.3
Run: pnpm test packages/core/src/analyzers/
Expected: 8/8 passing
```

---

## STEP 4.3: Field-Level Confidence

### 4.3.1 Implementation

```
□ 4.3.1.a  Add confidence fields to Person model (nameConfidence, emailConfidence, etc.)
□ 4.3.1.b  Add source attribution fields (nameSource, emailSource, etc.)
□ 4.3.1.c  Implement confidence calculation based on source reliability
□ 4.3.1.d  Implement conflict resolution (highest confidence wins)
□ 4.3.1.e  Update Person API to return confidence data
□ 4.3.1.f  Run migration
```

### 4.3.2 Tests

**File:** `packages/core/src/confidence/field-confidence.test.ts`

```
□ TEST: "should calculate confidence based on source"
□ TEST: "should store source attribution"
□ TEST: "should resolve conflicts using highest confidence"
□ TEST: "should return confidence in API response"
□ TEST: "should update confidence when new data arrives"
□ TEST: "should preserve manual overrides over automated confidence"
```

### ⛔ GATEWAY 4.3

```
ALL tests in 4.3.2 must pass before proceeding to 4.4
Run: pnpm test packages/core/src/confidence/
Expected: 6/6 passing
```

---

## STEP 4.4: Explainability

### 4.4.1 Implementation

```
□ 4.4.1.a  Add explanation field to PathResult
□ 4.4.1.b  Add explanation field to ScoringResult
□ 4.4.1.c  Link explanations to source evidence (evidenceIds)
□ 4.4.1.d  Create /api/explain/[id] endpoint
□ 4.4.1.e  Return structured explanation with evidence chain
```

### 4.4.2 Tests

**File:** `packages/core/src/explainability/explainability.test.ts`

```
□ TEST: "should generate explanation for path result"
□ TEST: "should generate explanation for scoring result"
□ TEST: "should link explanation to source evidence"
□ TEST: "should return explanation via API"
□ TEST: "should include evidence chain in explanation"
```

### ⛔ GATEWAY 4.4

```
ALL tests in 4.4.2 must pass before proceeding to 4.5
Run: pnpm test packages/core/src/explainability/
Expected: 5/5 passing
```

---

## STEP 4.5: Phase 4 Quality Gate

### 4.5.1 Final Verification

```
□ 4.5.1.a  Run ALL new unit tests: Expected 25/25 passing
□ 4.5.1.b  Run ALL integration tests: Expected 100% passing
□ 4.5.1.c  Run E2E tests: Expected >98% passing
□ 4.5.1.d  Test ER review queue UI (manual)
□ 4.5.1.e  Test manual merge flow (manual)
□ 4.5.1.f  Test manual split flow (manual)
```

### 4.5.2 Release

```
□ 4.5.2.a  Bump version to 0.35.0
□ 4.5.2.b  Update Dashboard.md
□ 4.5.2.c  Commit: "release: v0.35.0 - Intelligence Layer"
□ 4.5.2.d  Push and deploy
□ 4.5.2.e  Verify production health
```

### ⛔ GATEWAY 4.5 - PHASE 4 COMPLETE

```
Phase 4 is COMPLETE when:
- All 25 new tests pass
- E2E tests >98% passing
- Manual QA passed
- Version is 0.35.0

Proceed to Phase 5: Transparency & Release
```

---

# PHASE 5: Transparency & Release

**Target:** v1.0.0
**Reference:** [PRD v1.2](./PRD-v1.2-Contact-Intelligence.md)
**Prerequisite:** Phase 4 complete (v0.35.0 deployed)

---

## STEP 5.1: Transparency UI

### 5.1.1 Implementation

```
□ 5.1.1.a  Create ProfileProvenance component (timeline of data sources)
□ 5.1.1.b  Create WhyThisSuggested component (explanation drill-down)
□ 5.1.1.c  Create DataSourceContribution component (pie chart of sources)
□ 5.1.1.d  Create Evidence panel (full interaction history)
□ 5.1.1.e  Integrate all into person detail view
```

### 5.1.2 Tests

**File:** `apps/web/components/transparency/*.test.tsx`

```
□ TEST: "ProfileProvenance should render timeline"
□ TEST: "WhyThisSuggested should show reasoning chain"
□ TEST: "DataSourceContribution should show percentages"
□ TEST: "Evidence panel should show interaction history"
```

### ⛔ GATEWAY 5.1

```
ALL tests in 5.1.2 must pass before proceeding to 5.2
Expected: 4/4 passing
```

---

## STEP 5.2: Enhanced Privacy UI

### 5.2.1 Implementation

```
□ 5.2.1.a  Add per-source privacy toggles
□ 5.2.1.b  Add data export functionality (GDPR)
□ 5.2.1.c  Add data deletion controls
```

### 5.2.2 Tests

**File:** `apps/web/e2e/privacy.spec.ts`

```
□ TEST: "should toggle privacy per data source"
□ TEST: "should export user data as JSON"
□ TEST: "should delete all user data"
```

### ⛔ GATEWAY 5.2

```
ALL tests in 5.2.2 must pass before proceeding to 5.3
Expected: 3/3 passing
```

---

## STEP 5.3: Full Journey E2E

### 5.3.1 Tests

**File:** `apps/web/e2e/full-journey.spec.ts`

```
□ TEST: "should complete full journey: import → resolve → score → path → explain"
□ TEST: "should navigate provenance timeline"
□ TEST: "should drill down into explanation"
```

### ⛔ GATEWAY 5.3

```
ALL tests in 5.3.1 must pass before proceeding to 5.4
Expected: 3/3 passing
```

---

## STEP 5.4: v1.0.0 Release

### 5.4.1 PRD Compliance Audit

```
□ 5.4.1.a  Verify Event Ingestion Layer: COMPLETE
□ 5.4.1.b  Verify Entity Resolution: COMPLETE
□ 5.4.1.c  Verify Field-Level Confidence: COMPLETE
□ 5.4.1.d  Verify Analyzer Registry: COMPLETE
□ 5.4.1.e  Verify Explainability: COMPLETE
□ 5.4.1.f  Verify Transparency UI: COMPLETE
□ 5.4.1.g  Document any deviations from PRD
□ 5.4.1.h  Get stakeholder sign-off
```

### 5.4.2 Final Release

```
□ 5.4.2.a  Run ALL tests: Expected 100% passing
□ 5.4.2.b  Bump version to 1.0.0
□ 5.4.2.c  Update all documentation
□ 5.4.2.d  Create release notes
□ 5.4.2.e  Commit: "release: v1.0.0 - PRD v1.2 Complete"
□ 5.4.2.f  Push and deploy
□ 5.4.2.g  Verify production health
□ 5.4.2.h  Announce release
```

### ⛔ GATEWAY 5.4 - PROJECT COMPLETE

```
v1.0.0 is COMPLETE when:
- PRD v1.2 compliance audit passed
- All 205 tests pass
- Production deployment verified
- Stakeholder sign-off received

PROJECT COMPLETE
```

---

# Test Summary

| Phase | Step | Tests | Cumulative |
|-------|------|-------|------------|
| 2.1 | RelationshipScore Schema | 8 | 8 |
| 2.2 | IntroductionPath Schema | 8 | 16 |
| 2.3 | Scoring: Recency | 11 | 27 |
| 2.4 | Scoring: Frequency | 10 | 37 |
| 2.5 | Scoring: Bidirectional | 10 | 47 |
| 2.6 | Scoring: Channel Diversity | 10 | 57 |
| 2.7 | Scoring: Composite | 11 | 68 |
| 2.8 | Scoring: Calculator | 10 | 78 |
| 2.9 | Scoring: Index | 8 | 86 |
| 2.10 | Pathfinding: Graph Builder | 8 | 94 |
| 2.11 | Pathfinding: BFS | 10 | 104 |
| 2.12 | Pathfinding: Scoring | 8 | 112 |
| 2.13 | Pathfinding: Ranker | 9 | 121 |
| 2.14 | Pathfinding: Service | 9 | 130 |
| 2.15 | Pathfinding: Index | 4 | 134 |
| 2.16 | API: /api/paths | 10 | 144 |
| 2.17 | CSV: Parser | 10 | 154 |
| 2.18 | CSV: LinkedIn Format | 10 | 164 |
| 2.19 | CSV: Adapter | 11 | 175 |
| 2.20 | CSV: API Route | 8 | 183 |
| 2.21 | UI: Path Highlight | 4 | 187 |
| 2.22 | UI: Graph Integration | 4 | 191 |
| 2.23 | UI: Action Panel | 7 | 198 |
| 2.24 | E2E: Journey | 10 | 208 |
| **Phase 2 Total** | | **208** | |
| 3.1 | EventIngestionService | 8 | 216 |
| 3.2 | LinkedIn Dual-Write | 5 | 221 |
| 3.3 | Gmail Adapter | 8 | 229 |
| 3.4 | Entity Resolution | 8 | 237 |
| **Phase 3 Total** | | **29** | |
| 4.1 | ProfileCluster | 6 | 243 |
| 4.2 | Analyzer Registry | 8 | 251 |
| 4.3 | Field Confidence | 6 | 257 |
| 4.4 | Explainability | 5 | 262 |
| **Phase 4 Total** | | **25** | |
| 5.1 | Transparency UI | 4 | 266 |
| 5.2 | Privacy UI | 3 | 269 |
| 5.3 | Full Journey E2E | 3 | 272 |
| **Phase 5 Total** | | **10** | |
| **GRAND TOTAL** | | **272** | |

---

**Current Phase:** 2 (Warm Intro MVP)
**Next Task:** 2.1.1.a - Add RelationshipScore model to schema.prisma
**Next Test:** 2.1.2.a - "should create a RelationshipScore record"

---

**Maintained by:** Steve (Manager Agent)
**Last Updated:** 2026-02-14
