export interface SupportResponse {
  answer: string;
  confidence: number;
  category: 'billing' | 'technical' | 'general' | 'account' | 'product';
  actions: string[];
  requires_escalation: boolean;
  metadata: {
    complexity: 'low' | 'medium' | 'high';
    sentiment: 'positive' | 'neutral' | 'negative';
  };
}

export interface QueryMetrics {
  timestamp: string;
  question: string;
  tokens_prompt: number;
  tokens_completion: number;
  total_tokens: number;
  latency_ms: number;
  estimated_cost_usd: number;
  model: string;
  success: boolean;
  error?: string;
  moderation_flagged?: boolean;
}

export interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  category_scores: Record<string, number>;
}

export interface PIIDetectionResult {
  detected: boolean;
  types: Record<string, string[]>;
}

export interface QueryResult {
  response: SupportResponse;
  metrics: QueryMetrics;
  moderation?: ModerationResult;
}
