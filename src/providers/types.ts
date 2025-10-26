import { ModerationResult } from '../types.js';

export interface ModelConfig {
  inputPer1M: number;
  outputPer1M: number;
  defaultTemperature: number;
  supportsTemperature: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  responseFormat?: 'json_object' | 'text';
}

export interface ChatCompletionUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatCompletionResponse {
  content: string;
  usage: ChatCompletionUsage;
}

export interface ProviderConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
}

export interface LLMProvider {
  readonly name: string;

  initialize(config: ProviderConfig): void;

  createChatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResponse>;

  moderateContent(input: string): Promise<ModerationResult>;

  getModelConfig(model: string): ModelConfig;

  calculateCost(promptTokens: number, completionTokens: number): number;

  getModel(): string;

  getAvailableModels(): string[];
}
