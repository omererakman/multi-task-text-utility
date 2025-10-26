import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ModerationResult } from '../types.js';
import {
  LLMProvider,
  ProviderConfig,
  ChatCompletionParams,
  ChatCompletionResponse,
  ModelConfig,
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPPORT_RESPONSE_SCHEMA = JSON.parse(
  readFileSync(join(__dirname, '../../prompts/support_response_schema.json'), 'utf-8')
);

// Fallback values if environment variables are not set
const FALLBACK_MODEL_CONFIG = {
  input: 1.250,
  output: 10.000,
  defaultTemperature: 1,
  supportsTemperature: true,
};

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  private client: OpenAI | null = null;
  private config: ProviderConfig | null = null;

  initialize(config: ProviderConfig): void {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  async createChatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResponse> {
    if (!this.client) {
      throw new Error('OpenAI provider not initialized');
    }

    const completionParams: any = {
      model: params.model,
      messages: params.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    };

    if (params.temperature !== undefined) {
      completionParams.temperature = params.temperature;
    }

    if (params.responseFormat === 'json_object') {
      completionParams.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'support_response',
          strict: true,
          schema: SUPPORT_RESPONSE_SCHEMA,
        },
      };
    }

    const completion = await this.client.chat.completions.create(completionParams);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in API response');
    }

    const usage = completion.usage;
    if (!usage) {
      throw new Error('No usage information in API response');
    }

    return {
      content,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
    };
  }

  async moderateContent(input: string): Promise<ModerationResult> {
    if (!this.client) {
      throw new Error('OpenAI provider not initialized');
    }

    try {
      const moderation = await this.client.moderations.create({
        input,
      });

      const result = moderation.results[0];

      return {
        flagged: result.flagged,
        categories: { ...result.categories } as Record<string, boolean>,
        category_scores: { ...result.category_scores } as Record<string, number>,
      };
    } catch (error) {
      console.error('Moderation API error:', error);
      return {
        flagged: false,
        categories: {},
        category_scores: {},
      };
    }
  }

  getModelConfig(): ModelConfig {
    const envInputPrice = process.env.MODEL_INPUT_PRICE_PER_1M;
    const envOutputPrice = process.env.MODEL_OUTPUT_PRICE_PER_1M;
    const envTemperature = process.env.TEMPERATURE;
    const envSupportsTemperature = process.env.MODEL_SUPPORTS_TEMPERATURE;

    const inputPrice = envInputPrice ? parseFloat(envInputPrice) : FALLBACK_MODEL_CONFIG.input;
    const outputPrice = envOutputPrice ? parseFloat(envOutputPrice) : FALLBACK_MODEL_CONFIG.output;
    const defaultTemperature = envTemperature ? parseFloat(envTemperature) : FALLBACK_MODEL_CONFIG.defaultTemperature;
    const supportsTemperature = envSupportsTemperature ? envSupportsTemperature === 'true' : FALLBACK_MODEL_CONFIG.supportsTemperature;

    return {
      inputPer1M: inputPrice,
      outputPer1M: outputPrice,
      defaultTemperature,
      supportsTemperature,
    };
  }

  calculateCost(promptTokens: number, completionTokens: number): number {
    const pricing = this.getModelConfig();
    const inputCost = (promptTokens / 1_000_000) * pricing.inputPer1M;
    const outputCost = (completionTokens / 1_000_000) * pricing.outputPer1M;
    return inputCost + outputCost;
  }

  getModel(): string {
    return process.env.MODEL_NAME || 'gpt-4o-mini';
  }

  getAvailableModels(): string[] {
    const envModel = process.env.MODEL_NAME;
    return envModel ? [envModel] : [];
  }
}
