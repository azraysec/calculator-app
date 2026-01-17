/**
 * Graph pathfinding algorithms for warm intro discovery
 */

import type { Person, Edge, Path, PathfindingOptions, PathRankingFactors } from '@wig/shared-types';

export interface GraphNode extends Person {}

export interface PathNode {
  person: Person;
  fromEdge?: Edge;
  depth: number;
  cumulativeScore: number;
}

/**
 * Breadth-first search with scoring for finding warm intro paths
 */
export class PathFinder {
  constructor(
    private getPerson: (id: string) => Promise<Person | null>,
    private getOutgoingEdges: (personId: string) => Promise<Edge[]>
  ) {}

  /**
   * Find top N paths from source to target person
   */
  async findPaths(
    fromPersonId: string,
    toPersonId: string,
    options: PathfindingOptions = {}
  ): Promise<Path[]> {
    const {
      maxHops = 3,
      minStrength = 0.3,
      maxResults = 3,
      preferences = {},
    } = options;

    const visited = new Set<string>([fromPersonId]);
    const allPaths: Path[] = [];

    // BFS frontier: array of path nodes
    let frontier: PathNode[][] = [
      [
        {
          person: (await this.getPerson(fromPersonId))!,
          depth: 0,
          cumulativeScore: 1.0,
        },
      ],
    ];

    // Search up to maxHops
    for (let depth = 0; depth < maxHops; depth++) {
      const nextFrontier: PathNode[][] = [];

      for (const path of frontier) {
        const currentNode = path[path.length - 1];
        const edges = await this.getOutgoingEdges(currentNode.person.id);

        for (const edge of edges) {
          // Skip if strength too low
          if (edge.strength < minStrength) continue;

          // Skip if already visited in this path
          if (path.some((node) => node.person.id === edge.toPersonId)) continue;

          const toPerson = await this.getPerson(edge.toPersonId);
          if (!toPerson || toPerson.deletedAt) continue;

          // Apply preferences
          if (this.shouldSkipByPreferences(toPerson, edge, preferences)) continue;

          // Calculate cumulative score
          const cumulativeScore = currentNode.cumulativeScore * edge.strength;

          const newNode: PathNode = {
            person: toPerson,
            fromEdge: edge,
            depth: depth + 1,
            cumulativeScore,
          };

          const newPath = [...path, newNode];

          // Found target!
          if (edge.toPersonId === toPersonId) {
            allPaths.push(this.pathNodesToPath(newPath));
            continue;
          }

          // Mark as visited globally
          if (!visited.has(edge.toPersonId)) {
            visited.add(edge.toPersonId);
            nextFrontier.push(newPath);
          }
        }
      }

      frontier = nextFrontier;

      // Early exit if we found enough paths
      if (allPaths.length >= maxResults * 2) break;
    }

    // Sort by score and return top N
    return this.rankPaths(allPaths).slice(0, maxResults);
  }

  /**
   * Convert PathNode array to Path
   */
  private pathNodesToPath(nodes: PathNode[]): Path {
    const edges: Edge[] = [];
    let score = 1.0;

    for (let i = 1; i < nodes.length; i++) {
      if (nodes[i].fromEdge) {
        edges.push(nodes[i].fromEdge);
        score *= nodes[i].fromEdge.strength;
      }
    }

    // Apply path length penalty
    const lengthPenalty = Math.pow(0.8, edges.length - 1);
    score *= lengthPenalty;

    return {
      nodes: nodes.map((n) => n.person),
      edges,
      score,
      explanation: this.generateExplanation(nodes, score),
    };
  }

  /**
   * Rank paths by multiple factors
   */
  private rankPaths(paths: Path[]): Path[] {
    return paths.sort((a, b) => {
      // Primary: overall score
      if (Math.abs(a.score - b.score) > 0.05) {
        return b.score - a.score;
      }

      // Secondary: shorter paths preferred
      if (a.edges.length !== b.edges.length) {
        return a.edges.length - b.edges.length;
      }

      // Tertiary: more recent last interaction
      const aRecent = Math.max(...a.edges.map((e) => e.lastSeenAt.getTime()));
      const bRecent = Math.max(...b.edges.map((e) => e.lastSeenAt.getTime()));
      return bRecent - aRecent;
    });
  }

  /**
   * Check if person/edge should be skipped based on preferences
   */
  private shouldSkipByPreferences(
    person: Person,
    edge: Edge,
    preferences: PathfindingOptions['preferences']
  ): boolean {
    // TODO: Implement category avoidance
    // TODO: Implement geography preference
    // TODO: Implement channel preference
    return false;
  }

  /**
   * Generate human-readable explanation for a path
   */
  private generateExplanation(nodes: PathNode[], score: number): string {
    if (nodes.length < 2) return 'Direct connection';

    const hops = nodes.length - 1;
    const intermediaries = nodes
      .slice(1, -1)
      .map((n) => n.person.names[0])
      .join(' → ');

    if (hops === 1) {
      return `Direct connection (strength: ${(score * 100).toFixed(0)}%)`;
    }

    return `${hops}-hop path via ${intermediaries} (strength: ${(score * 100).toFixed(0)}%)`;
  }
}

/**
 * Calculate detailed ranking factors for explainability
 */
export function calculatePathRankingFactors(path: Path): PathRankingFactors {
  if (path.edges.length === 0) {
    return {
      introducerRelationshipStrength: 0,
      downstreamRelationshipStrength: 0,
      pathLengthPenalty: 1,
      recencyScore: 0,
      evidenceQuality: 0,
    };
  }

  const firstEdge = path.edges[0];
  const downstreamEdges = path.edges.slice(1);

  const downstreamAvg =
    downstreamEdges.length > 0
      ? downstreamEdges.reduce((sum, e) => sum + e.strength, 0) / downstreamEdges.length
      : 1.0;

  const recencyScore =
    path.edges.reduce((sum, e) => {
      const daysSince = (Date.now() - e.lastSeenAt.getTime()) / (1000 * 60 * 60 * 24);
      return sum + Math.exp(-(daysSince / 90) * Math.LN2);
    }, 0) / path.edges.length;

  const evidenceQuality =
    path.edges.reduce((sum, e) => sum + (e.sources.includes('interaction') ? 1 : 0.5), 0) /
    path.edges.length;

  return {
    introducerRelationshipStrength: firstEdge.strength,
    downstreamRelationshipStrength: downstreamAvg,
    pathLengthPenalty: Math.pow(0.8, path.edges.length - 1),
    recencyScore,
    evidenceQuality,
  };
}
