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
  dryRun?: boolean;
  scheduledFor?: Date;
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
}
