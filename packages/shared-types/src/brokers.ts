/**
 * Broker Interfaces
 *
 * These interfaces define the contract for action brokers that handle
 * outbound actions like sending messages or creating tasks.
 */

export interface DraftInput {
  context: {
    targetPerson: string;
    introducerName: string;
    relationshipEvidence: string[];
    userPreferences?: Record<string, unknown>;
  };
  messageType: 'intro-request' | 'follow-up' | 'thank-you';
}

export interface Draft {
  id: string;
  channel: string;
  subject?: string;
  body: string;
  metadata: Record<string, unknown>;
}

export interface SendOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  dryRun?: boolean;
  scheduledFor?: Date;
  attachments?: Array<{
    filename: string;
    content: string; // Base64 encoded or text
    contentType: string;
  }>;
  metadata?: Record<string, unknown>;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

export interface TaskInput {
  title: string;
  description?: string;
  dueDate?: Date;
  owner?: string;
}

export interface TaskResult {
  taskId: string;
  createdAt: Date;
}

export interface ActionBroker {
  channel: string;
  draftMessage(input: DraftInput): Promise<Draft>;
  sendMessage?(draft: Draft, opts: SendOptions): Promise<SendResult>;
  createTask?(task: TaskInput): Promise<TaskResult>;
  validateConnection(): Promise<{ valid: boolean; error?: string }>;
}

export interface BrokerConfig {
  channel: string;
  credentials?: Record<string, unknown>;
  options?: {
    draftOnly?: boolean;
    rateLimit?: {
      maxPerMinute: number;
      maxPerHour: number;
    };
    [key: string]: unknown;
  };
}

export interface BrokerFactory {
  create(config: BrokerConfig): Promise<ActionBroker>;
  supports(channel: string): boolean;
}
