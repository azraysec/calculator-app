/**
 * LinkedIn Relationship Strength Scorer
 * Calculates relationship strength based on LinkedIn evidence
 * Per LinkedIn Adapter Design Spec Section 11
 */

import { PrismaClient } from '@prisma/client';

export interface ScoringFactors {
  connectionAge: number; // 0-1: how long connected
  messageRecency: number; // 0-1: how recently messaged
  messageFrequency: number; // 0-1: how often messages
  reciprocity: number; // 0-1: two-way vs one-way
  threadDepth: number; // 0-1: reply chain depth
  multiParty: number; // 0-1: group conversation signal
}

export interface ScoringResult {
  strengthScore: number; // 0-100
  strengthTier: 'A' | 'B' | 'C' | 'D';
  factors: ScoringFactors;
  topEvidenceIds: string[];
  explanation: string;
}

export class LinkedInRelationshipScorer {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Calculate relationship strength for an edge using LinkedIn evidence
   */
  async scoreRelationship(
    fromPersonId: string,
    toPersonId: string
  ): Promise<ScoringResult> {
    // Fetch all LinkedIn evidence for this relationship
    const evidence = await this.prisma.evidenceEvent.findMany({
      where: {
        source: { startsWith: 'linkedin' },
        OR: [
          {
            subjectPersonId: fromPersonId,
            objectPersonId: toPersonId,
          },
          {
            subjectPersonId: toPersonId,
            objectPersonId: fromPersonId,
          },
        ],
      },
      orderBy: { timestamp: 'desc' },
    });

    if (evidence.length === 0) {
      return this.defaultScore();
    }

    // Calculate individual factors
    const factors = this.calculateFactors(evidence);

    // Weighted combination of factors
    const weights = {
      connectionAge: 0.15,
      messageRecency: 0.30,
      messageFrequency: 0.25,
      reciprocity: 0.15,
      threadDepth: 0.10,
      multiParty: 0.05,
    };

    const strengthScore = Math.round(
      factors.connectionAge * weights.connectionAge * 100 +
        factors.messageRecency * weights.messageRecency * 100 +
        factors.messageFrequency * weights.messageFrequency * 100 +
        factors.reciprocity * weights.reciprocity * 100 +
        factors.threadDepth * weights.threadDepth * 100 +
        factors.multiParty * weights.multiParty * 100
    );

    // Determine tier
    const strengthTier = this.getTier(strengthScore);

    // Get top evidence (most impactful)
    const topEvidenceIds = this.getTopEvidence(evidence, factors);

    // Generate explanation
    const explanation = this.generateExplanation(factors, evidence.length);

    return {
      strengthScore,
      strengthTier,
      factors,
      topEvidenceIds,
      explanation,
    };
  }

  /**
   * Calculate individual scoring factors
   */
  private calculateFactors(evidence: any[]): ScoringFactors {
    const now = new Date();

    // Find connection event
    const connectionEvent = evidence.find(
      (e) => e.type === 'linkedin_connection'
    );

    // Connection age score (decay over time if no interactions)
    let connectionAge = 0;
    if (connectionEvent) {
      const daysSinceConnection = this.daysBetween(
        connectionEvent.timestamp,
        now
      );
      // Score higher for established connections (1-3 years optimal)
      if (daysSinceConnection < 365) {
        connectionAge = daysSinceConnection / 365; // Ramp up to 1 year
      } else if (daysSinceConnection < 1095) {
        connectionAge = 1.0; // Optimal: 1-3 years
      } else {
        connectionAge = Math.max(0.3, 1.0 - (daysSinceConnection - 1095) / 3650); // Decay after 3 years
      }
    }

    // Message recency score
    const messages = evidence.filter(
      (e) =>
        e.type === 'linkedin_message_sent' ||
        e.type === 'linkedin_message_received'
    );
    let messageRecency = 0;
    if (messages.length > 0) {
      const lastMessage = messages[0]; // Already sorted desc
      const daysSinceMessage = this.daysBetween(lastMessage.timestamp, now);
      // Exponential decay: 1.0 at 0 days, 0.5 at 30 days, 0.1 at 180 days
      messageRecency = Math.exp(-daysSinceMessage / 60);
    }

    // Message frequency score
    let messageFrequency = 0;
    if (messages.length > 0) {
      const last30Days = messages.filter(
        (m) => this.daysBetween(m.timestamp, now) <= 30
      ).length;
      const last90Days = messages.filter(
        (m) => this.daysBetween(m.timestamp, now) <= 90
      ).length;
      const last365Days = messages.filter(
        (m) => this.daysBetween(m.timestamp, now) <= 365
      ).length;

      // Weighted frequency: recent activity counts more
      const frequencyScore =
        (last30Days * 0.5 + last90Days * 0.3 + last365Days * 0.2) / 10;
      messageFrequency = Math.min(1.0, frequencyScore);
    }

    // Reciprocity score (two-way communication)
    let reciprocity = 0;
    if (messages.length > 0) {
      const sent = messages.filter((m) => m.type === 'linkedin_message_sent')
        .length;
      const received = messages.filter(
        (m) => m.type === 'linkedin_message_received'
      ).length;

      if (sent > 0 && received > 0) {
        // Perfect reciprocity = 1.0
        const ratio = Math.min(sent, received) / Math.max(sent, received);
        reciprocity = ratio;
      } else if (sent > 0 || received > 0) {
        // One-way communication = 0.3
        reciprocity = 0.3;
      }
    }

    // Thread depth score (simplified - would need conversation analysis)
    let threadDepth = 0;
    if (messages.length > 1) {
      // Rough estimate: more messages = deeper threads
      threadDepth = Math.min(1.0, messages.length / 20);
    }

    // Multi-party conversation score
    let multiParty = 0;
    // Would need conversation participant analysis
    // For now, give small bonus if many messages
    if (messages.length > 5) {
      multiParty = 0.5;
    }

    return {
      connectionAge,
      messageRecency,
      messageFrequency,
      reciprocity,
      threadDepth,
      multiParty,
    };
  }

  /**
   * Get strength tier from score
   */
  private getTier(score: number): 'A' | 'B' | 'C' | 'D' {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    return 'D';
  }

  /**
   * Get top evidence IDs that contributed most to score
   */
  private getTopEvidence(evidence: any[], _factors: ScoringFactors): string[] {
    // Prioritize recent messages and connection event
    const scored = evidence.map((e) => {
      let weight = 0;
      if (e.type === 'linkedin_connection') weight = 2;
      if (e.type === 'linkedin_message_sent') weight = 3;
      if (e.type === 'linkedin_message_received') weight = 3;

      // Recency bonus
      const daysSince = this.daysBetween(e.timestamp, new Date());
      const recencyBonus = daysSince < 30 ? 2 : daysSince < 90 ? 1 : 0;

      return { id: e.id, weight: weight + recencyBonus };
    });

    return scored
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
      .map((e) => e.id);
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    factors: ScoringFactors,
    evidenceCount: number
  ): string {
    const parts: string[] = [];

    if (factors.messageRecency > 0.7) {
      parts.push('Recent communication');
    }
    if (factors.messageFrequency > 0.5) {
      parts.push('Frequent interactions');
    }
    if (factors.reciprocity > 0.7) {
      parts.push('Two-way relationship');
    }
    if (factors.connectionAge > 0.7) {
      parts.push('Established connection');
    }

    if (parts.length === 0) {
      return `${evidenceCount} LinkedIn interaction${evidenceCount !== 1 ? 's' : ''}`;
    }

    return parts.join(', ') + ` (${evidenceCount} evidence events)`;
  }

  /**
   * Default score when no evidence
   */
  private defaultScore(): ScoringResult {
    return {
      strengthScore: 0,
      strengthTier: 'D',
      factors: {
        connectionAge: 0,
        messageRecency: 0,
        messageFrequency: 0,
        reciprocity: 0,
        threadDepth: 0,
        multiParty: 0,
      },
      topEvidenceIds: [],
      explanation: 'No LinkedIn evidence found',
    };
  }

  /**
   * Calculate days between two dates
   */
  private daysBetween(start: Date, end: Date): number {
    const diff = end.getTime() - new Date(start).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Update edge with new scoring
   */
  async updateEdgeScore(edgeId: string, result: ScoringResult): Promise<void> {
    await this.prisma.edge.update({
      where: { id: edgeId },
      data: {
        strength: result.strengthScore / 100, // Store as 0-1
        strengthFactors: result.factors as any,
        topEvidenceIds: result.topEvidenceIds,
      },
    });
  }

  /**
   * Re-score all edges for a person (after ingesting new evidence)
   */
  async rescorePersonEdges(personId: string): Promise<number> {
    const edges = await this.prisma.edge.findMany({
      where: {
        OR: [{ fromPersonId: personId }, { toPersonId: personId }],
        sources: { hasSome: ['linkedin_archive', 'linkedin_api'] },
      },
    });

    let updated = 0;
    for (const edge of edges) {
      const result = await this.scoreRelationship(
        edge.fromPersonId,
        edge.toPersonId
      );
      await this.updateEdgeScore(edge.id, result);
      updated++;
    }

    return updated;
  }
}
