/**
 * Manual broker for copy-to-clipboard workflow
 * Draft-only, no actual sending
 */

import type { ActionBroker, DraftInput, Draft } from '@wig/shared-types';
import { BaseBroker } from './base-broker';

export class ManualBroker extends BaseBroker implements ActionBroker {
  readonly channel = 'manual';

  async draftMessage(input: DraftInput): Promise<Draft> {
    const { context, messageType } = input;

    // Generate draft body based on context
    const body = this.generateDraftBody(context, messageType);

    return {
      id: this.generateDraftId(),
      channel: 'manual',
      body,
      metadata: {
        generatedAt: new Date().toISOString(),
        messageType,
      },
    };
  }

  async validateConnection(): Promise<{ valid: boolean; error?: string }> {
    return { valid: true }; // Manual broker always valid
  }

  /**
   * Generate draft message body
   */
  private generateDraftBody(
    context: DraftInput['context'],
    messageType: string
  ): string {
    const { targetPerson, introducerName, relationshipEvidence } = context;

    const lines: string[] = [];

    lines.push(`Hi ${introducerName},`);
    lines.push('');

    if (messageType === 'intro-request') {
      lines.push(`I hope this email finds you well. I'm reaching out to see if you might be able to help with an introduction.`);
      lines.push('');
      lines.push(`I'm hoping to connect with ${targetPerson}.`);

      if (relationshipEvidence.length > 0) {
        lines.push('');
        lines.push(`I noticed you're connected - ${relationshipEvidence[0]}`);
      }

      lines.push('');
      lines.push(`Would you be comfortable making an introduction? I'd be happy to provide more context if helpful.`);
    } else if (messageType === 'follow-up') {
      lines.push(`Following up on my previous message about connecting with ${targetPerson}.`);
      lines.push('');
      lines.push(`Let me know if you need any additional information.`);
    } else if (messageType === 'thank-you') {
      lines.push(`Thank you for making the introduction to ${targetPerson}!`);
      lines.push('');
      lines.push(`I really appreciate your help.`);
    }

    lines.push('');
    lines.push('Best');

    return lines.join('\n');
  }
}
