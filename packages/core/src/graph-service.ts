/**
 * Main graph service implementation
 * Orchestrates pathfinding, scoring, and entity resolution
 */

import type {
  GraphService,
  PathfindingOptions,
  PathfindingResult,
  Path,
  PathExplanation,
  PathRankingFactors,
  GraphStats,
  EntityResolutionMatch,
  ScoringWeights,
  Person,
  Edge,
} from '@wig/shared-types';

import { PathFinder, calculatePathRankingFactors } from './pathfinding';
import { calculateStrength, DEFAULT_WEIGHTS } from './scoring';
import { findMatches } from './entity-resolution';

export interface GraphServiceDeps {
  getPerson: (id: string) => Promise<Person | null>;
  getOutgoingEdges: (personId: string) => Promise<Edge[]>;
  getIncomingEdges: (personId: string) => Promise<Edge[]>;
  getAllPeople: () => Promise<Person[]>;
  getStats: () => Promise<GraphStats>;
}

export class GraphServiceImpl implements GraphService {
  private pathFinder: PathFinder;

  constructor(private deps: GraphServiceDeps) {
    this.pathFinder = new PathFinder(deps.getPerson, deps.getOutgoingEdges);
  }

  async findPaths(
    fromPersonId: string,
    toPersonId: string,
    options?: PathfindingOptions
  ): Promise<PathfindingResult> {
    const startTime = Date.now();
    let nodesExplored = 0;
    let edgesEvaluated = 0;

    // Get target person for result
    const targetPerson = await this.deps.getPerson(toPersonId);
    if (!targetPerson) {
      throw new Error(`Target person not found: ${toPersonId}`);
    }

    // Find paths
    const paths = await this.pathFinder.findPaths(fromPersonId, toPersonId, options);

    const duration = Date.now() - startTime;

    return {
      paths,
      targetPerson,
      searchMetadata: {
        nodesExplored,
        edgesEvaluated,
        duration,
      },
    };
  }

  async calculateStrength(
    fromPersonId: string,
    toPersonId: string,
    weights?: ScoringWeights
  ): Promise<number> {
    const edges = await this.deps.getOutgoingEdges(fromPersonId);
    const edge = edges.find((e) => e.toPersonId === toPersonId);

    if (!edge || !edge.strengthFactors) {
      return 0;
    }

    return calculateStrength(edge.strengthFactors, weights || DEFAULT_WEIGHTS);
  }

  async explainPath(path: Path): Promise<PathExplanation> {
    const factors = calculatePathRankingFactors(path);

    // Recommended introducer is the first person after you (index 1)
    const introducer = path.nodes[1];
    const firstEdge = path.edges[0];

    const reasoning = this.generatePathReasoning(path, factors);
    const suggestedChannel = this.suggestBestChannel(firstEdge);

    return {
      path,
      factors,
      reasoning,
      recommendedIntroducer: {
        personId: introducer.id,
        name: introducer.names[0],
        rationale: `Strong relationship (${(firstEdge.strength * 100).toFixed(0)}% strength) with recent interactions`,
      },
      suggestedChannel,
    };
  }

  async getStats(): Promise<GraphStats> {
    return this.deps.getStats();
  }

  async findDuplicates(personId: string): Promise<EntityResolutionMatch[]> {
    const target = await this.deps.getPerson(personId);
    if (!target) {
      throw new Error(`Person not found: ${personId}`);
    }

    const allPeople = await this.deps.getAllPeople();
    return findMatches(target, allPeople);
  }

  private generatePathReasoning(path: Path, factors: PathRankingFactors): string {
    const reasons: string[] = [];

    if (factors.introducerRelationshipStrength >= 0.8) {
      reasons.push('Very strong relationship with introducer');
    } else if (factors.introducerRelationshipStrength >= 0.6) {
      reasons.push('Good relationship with introducer');
    }

    if (factors.recencyScore >= 0.8) {
      reasons.push('Recent interactions on path');
    }

    if (path.edges.length === 1) {
      reasons.push('Direct connection');
    } else if (path.edges.length === 2) {
      reasons.push('Short 2-hop path');
    }

    if (factors.evidenceQuality >= 0.8) {
      reasons.push('Strong evidence from interactions');
    }

    return reasons.join('. ') + '.';
  }

  private suggestBestChannel(edge: Edge): string {
    const channelPriority = ['email', 'linkedin', 'message', 'call', 'meeting'];

    for (const channel of channelPriority) {
      if (edge.channels.includes(channel)) {
        return channel;
      }
    }

    return edge.channels[0] || 'email';
  }
}
