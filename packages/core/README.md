# @wig/core

Core business logic for the Warm Intro Graph system.

## Purpose

This package contains the domain logic independent of infrastructure concerns:
- Relationship strength scoring algorithms
- Graph pathfinding for warm introductions
- Entity resolution (duplicate detection and merging)
- Graph service orchestration

## What's Included

### Scoring (`scoring.ts`)
- `calculateStrength()` - Main strength calculation
- `calculateRecencyFactor()` - Time-decay based on last interaction
- `calculateFrequencyFactor()` - Interaction frequency over time
- `calculateMutualityFactor()` - Bidirectional communication scoring
- `calculateChannelsFactor()` - Multi-channel diversity bonus
- `calculateStrengthFactors()` - Combined factor calculation

**Scoring algorithm:**
- Recency weight: 35% (exponential decay, 90-day half-life)
- Frequency weight: 30% (logarithmic scale)
- Mutuality weight: 20% (bidirectional = 1.0, one-way = 0.3)
- Channels weight: 15% (1 channel = 0.4, 2 = 0.7, 3+ = 1.0)

### Pathfinding (`pathfinding.ts`)
- `PathFinder` class - BFS-based pathfinding
- `findPaths()` - Find top N paths from source to target
- `calculatePathRankingFactors()` - Explainability factors
- Path ranking by score, length, and recency

**Algorithm:**
- Breadth-first search up to max hops (default 3)
- Filters by minimum edge strength (default 0.3)
- Scores paths by cumulative edge strength × length penalty (0.8^(hops-1))
- Returns top N ranked paths (default 3)

### Entity Resolution (`entity-resolution.ts`)
- `findMatches()` - Multi-layered duplicate detection
- `matchByEmail()` - Exact email matching (auto-merge)
- `matchByPhone()` - Exact phone matching (auto-merge)
- `matchBySocialHandle()` - Social profile matching (auto-merge)
- `matchByNameAndCompany()` - Fuzzy name+org matching (review queue)
- `stringSimilarity()` - Levenshtein distance calculation
- `generateMergeExplanation()` - Audit trail generation

**Resolution layers:**
1. Exact email match → auto-merge
2. Exact phone match → auto-merge
3. Social handle match → auto-merge (95% confidence)
4. Name + company similarity → review queue if score ≥ 88%

### Graph Service (`graph-service.ts`)
- `GraphServiceImpl` - Main orchestration class
- Implements `GraphService` interface from `@wig/shared-types`
- Coordinates pathfinding, scoring, and resolution
- Provides explainability and recommendations

## Usage

```typescript
import { GraphServiceImpl, calculateStrength } from '@wig/core';
import type { GraphServiceDeps } from '@wig/core';

// Create service with dependencies
const deps: GraphServiceDeps = {
  getPerson: async (id) => prisma.person.findUnique({ where: { id } }),
  getOutgoingEdges: async (id) => prisma.edge.findMany({ where: { fromPersonId: id } }),
  getIncomingEdges: async (id) => prisma.edge.findMany({ where: { toPersonId: id } }),
  getAllPeople: async () => prisma.person.findMany(),
  getStats: async () => ({ /* ... */ }),
};

const graphService = new GraphServiceImpl(deps);

// Find paths
const result = await graphService.findPaths(myId, targetId, {
  maxHops: 3,
  minStrength: 0.5,
  maxResults: 5,
});

// Get explanation
const explanation = await graphService.explainPath(result.paths[0]);

// Find duplicates
const dupes = await graphService.findDuplicates(personId);
```

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Type checking
npm run typecheck
```

## Design Principles

1. **Pure Logic** - No database or infrastructure dependencies in core algorithms
2. **Dependency Injection** - All external dependencies injected via constructor
3. **Testability** - Pure functions and clear interfaces for easy unit testing
4. **Explainability** - All scoring includes factor breakdown for transparency
5. **Conservative Merging** - High thresholds for auto-merge, review queue for borderline cases

## Algorithm Tuning

Key parameters that can be tuned:

**Scoring weights** (DEFAULT_WEIGHTS):
- Adjust for different relationship types or industries
- Sum must equal 1.0

**Recency decay** (calculateRecencyFactor):
- halfLife = 90 days (adjust based on your network dynamics)

**Frequency scale** (calculateFrequencyFactor):
- Currently 1/month = 0.3, 10+/month = 1.0
- Adjust thresholds for different interaction norms

**Entity resolution thresholds**:
- Name similarity: 0.85 minimum, 0.95 for auto-merge
- Org similarity: 0.80 minimum
- Combined: 0.88 for review queue, 0.95 for auto-merge

## See Also

- [Shared Types](../shared-types)
- [Database Schema](../db/SCHEMA.md)
- [Project Documentation](../../docs)
