/**
 * Base broker class with common functionality
 */

import type { ActionBroker, DraftInput, Draft, SendOptions } from '@wig/shared-types';

export abstract class BaseBroker implements ActionBroker {
  abstract readonly channel: string;

  abstract draftMessage(input: DraftInput): Promise<Draft>;
  abstract validateConnection(): Promise<{ valid: boolean; error?: string }>;

  /**
   * Generate unique draft ID
   */
  protected generateDraftId(): string {
    return `draft-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Common error handling
   */
  protected handleError(error: unknown, context: string): never {
    if (error instanceof Error) {
      throw new Error(`${this.channel} broker ${context}: ${error.message}`);
    }
    throw new Error(`${this.channel} broker ${context}: ${String(error)}`);
  }

  /**
   * Validate draft before sending (if sendMessage implemented)
   */
  protected validateDraft(draft: Draft): void {
    if (!draft.body || draft.body.trim().length === 0) {
      throw new Error('Draft body cannot be empty');
    }
    if (draft.body.length > 50000) {
      throw new Error('Draft body too long (max 50000 characters)');
    }
  }

  /**
   * Validate send options (if sendMessage implemented)
   */
  protected validateSendOptions(opts: SendOptions): void {
    if (!opts.to || opts.to.length === 0) {
      throw new Error('Send options must include at least one recipient');
    }
    for (const email of opts.to) {
      if (!this.isValidEmail(email)) {
        throw new Error(`Invalid recipient email: ${email}`);
      }
    }
  }

  /**
   * Simple email validation
   */
  protected isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
