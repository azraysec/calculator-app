# Graph Visualization

**Technology:** React Flow
**Status:** MVP Implementation
**Last Updated:** 2026-01-17

## Overview

WIG uses [React Flow](https://reactflow.dev/) for graph visualization in the MVP. This document outlines the implementation approach, scalability boundaries, and migration path.

## Why React Flow?

### Strengths
- **React Native**: Seamless integration with Next.js and React 18+
- **Interactive Out-of-the-Box**: Pan, zoom, drag nodes built-in
- **Declarative API**: Easy to integrate with React component model
- **Good Performance**: Handles small to medium graphs efficiently
- **Active Community**: Well-maintained with good documentation

### Use Cases in WIG
- **Path Visualization**: Display 1-3 hop paths between people (typically 2-5 nodes)
- **Connection Explorer**: Show immediate connections (typically 10-50 nodes)
- **Network Preview**: Small subgraph views (up to 100 nodes)

## Scalability Boundary: 500 Nodes

### Performance Characteristics

| Node Count | Performance | Rendering Time | User Experience |
|------------|-------------|----------------|-----------------|
| < 50       | Excellent   | < 100ms        | Smooth, no lag |
| 50-200     | Good        | 100-500ms      | Minor lag on initial render |
| 200-500    | Acceptable  | 500ms-2s       | Noticeable delay, but usable |
| **500+**   | **Poor**    | **> 2s**       | **Significant lag, janky interactions** |

### Why 500 Nodes?

Based on React Flow documentation and community feedback:
- **DOM Rendering**: React Flow renders each node as a DOM element
- **Layout Calculations**: Force-directed layouts become computationally expensive
- **Event Handling**: Mouse interactions slow down with many DOM nodes
- **Re-renders**: React's reconciliation becomes a bottleneck

**Source**: [React Flow Performance Docs](https://reactflow.dev/learn/advanced-use/performance)

### Current MVP Needs

For MVP, React Flow is **perfectly adequate**:
- Warm intro paths: 2-5 nodes (well within limits)
- Connection browsing: 20-100 nodes (acceptable performance)
- Full network view: NOT in MVP scope

## Migration Path: Cytoscape.js

If we exceed 500 nodes in production or need full network visualization, migrate to [Cytoscape.js](https://js.cytoscape.org/).

### Cytoscape.js Advantages
- **High Performance**: Canvas-based rendering (not DOM)
- **Scalability**: Handles 10,000+ nodes smoothly
- **Graph Algorithms**: Built-in pathfinding, clustering, layout algorithms
- **Proven Track Record**: Used by Neo4j Bloom, scientific visualizations

### Migration Complexity
- **Medium**: Both libraries use node/edge data structures
- **Estimated Effort**: 2-3 days for experienced developer
- **Risk**: Low (well-documented migration examples exist)

### When to Migrate

Trigger migration if ANY of these conditions are met:
1. **User Demand**: Users want to visualize > 500 nodes
2. **Performance Complaints**: Lag reports with current graphs
3. **New Feature**: Full network exploration feature added to roadmap

## Implementation Guidelines

### For MVP (React Flow)

```typescript
import ReactFlow, { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';

interface Person {
  id: string;
  name: string;
}

// Convert WIG data to React Flow format
function createGraphData(path: Person[]) {
  const nodes: Node[] = path.map((person, index) => ({
    id: person.id,
    data: { label: person.name },
    position: { x: index * 200, y: 100 },
  }));

  const edges: Edge[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    edges.push({
      id: `${path[i].id}-${path[i + 1].id}`,
      source: path[i].id,
      target: path[i + 1].id,
    });
  }

  return { nodes, edges };
}
```

### Performance Optimizations

1. **Lazy Loading**: Only render visible nodes
2. **Memoization**: Use `React.memo()` for custom node components
3. **Debounce**: Debounce layout recalculations
4. **Pagination**: Limit initial render, load more on demand

```typescript
// Optimize custom nodes
const PersonNode = React.memo(({ data }) => (
  <div className="person-node">
    <strong>{data.label}</strong>
  </div>
));
```

## Monitoring

### Metrics to Track

1. **Node Count**: Log graph sizes in production
2. **Render Time**: Measure time from data to first paint
3. **User Feedback**: Track complaints about performance

### Alert Thresholds

- **Warning**: Average node count > 300 in production
- **Critical**: Average node count > 500 in production
- **Action Required**: Any graph with > 1000 nodes rendered

### Logging

```typescript
// Track graph sizes
eventBus.publish({
  type: 'graph.rendered',
  payload: {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    renderTime: performance.now() - startTime,
  }
});
```

## Tech Debt Tracking

### Current Status
✅ React Flow implemented for MVP
✅ 500-node boundary documented
⏳ Monitoring not yet implemented
⏳ Migration to Cytoscape deferred

### Future Work (Post-MVP)

**Phase 2+ Enhancements:**
1. Add graph size monitoring to analytics
2. Implement progressive rendering for large graphs
3. Create Cytoscape proof-of-concept
4. A/B test performance with 200-500 node graphs

**Migration Trigger Ticket:**
- **Title**: "Migrate to Cytoscape.js for graph visualization"
- **Priority**: Medium
- **Condition**: If production graphs regularly exceed 300 nodes
- **Effort**: 2-3 days

## References

- [React Flow Documentation](https://reactflow.dev/)
- [React Flow Performance Guide](https://reactflow.dev/learn/advanced-use/performance)
- [Cytoscape.js](https://js.cytoscape.org/)
- [ADR: MVP Architecture](./ArchitectureDecisions/20260117-mvp-architecture.md)

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-17 | Use React Flow for MVP | Adequate for path visualization (< 50 nodes) |
| 2026-01-17 | Document 500-node limit | Chief Architect requirement |
| TBD | Migrate to Cytoscape | When production needs exceed 500 nodes |

---

**Last Review:** 2026-01-17
**Next Review:** After MVP launch (when production data is available)
