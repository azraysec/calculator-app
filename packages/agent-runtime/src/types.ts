/**
 * Agent runtime types
 * Placeholder for LangGraph.js integration
 */

export interface AgentConfig {
  name: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AgentContext {
  userId?: string;
  sessionId: string;
  metadata?: Record<string, unknown>;
}

export interface AgentResponse {
  message: string;
  actions?: Array<{
    type: string;
    payload: unknown;
  }>;
  metadata?: Record<string, unknown>;
}

// TODO: Implement actual LangGraph.js workflow types
