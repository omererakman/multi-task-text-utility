import { SupportResponse, QueryMetrics, QueryResult } from './types.js';
import { buildPrompt } from './prompt.js';
import { LLMProvider } from './providers/index.js';
import { performSafetyCheck, generateSafeFallbackResponse } from './safety.js';
import { logger } from './logger.js';

export async function processQuery(
  provider: LLMProvider,
  question: string
): Promise<QueryResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  let response: SupportResponse;
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  let success = false;
  let error: string | undefined;
  let moderationFlagged = false;

  try {
    logger.info('🔒 Performing safety check...');
    const safetyCheck = await performSafetyCheck(provider, question);

    moderationFlagged = safetyCheck.moderationResult.flagged || safetyCheck.injectionDetected;

    if (!safetyCheck.safe) {
      logger.warn('⚠️  Unsafe input detected, returning fallback response');
      response = generateSafeFallbackResponse(safetyCheck.moderationResult);

      promptTokens = Math.ceil(question.length / 4);
      completionTokens = Math.ceil(JSON.stringify(response).length / 4);
      totalTokens = promptTokens + completionTokens;
      success = true;
    } else {
      logger.info('📝 Building prompt...');
      const prompt = buildPrompt(question);

      const modelName = provider.getModel();
      const modelConfig = provider.getModelConfig(modelName);

      const temperature = modelConfig.supportsTemperature
        ? modelConfig.defaultTemperature
        : undefined;

      logger.info('🤖 Calling LLM API...');
      const completion = await provider.createChatCompletion({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature,
        responseFormat: 'json_object',
      });

      promptTokens = completion.usage.promptTokens;
      completionTokens = completion.usage.completionTokens;
      totalTokens = completion.usage.totalTokens;

      logger.info('✅ Parsing JSON response...');
      const parsedResponse = JSON.parse(completion.content);

      response = parsedResponse;
      success = true;
    }
  } catch (err) {
    logger.error(err, '❌ Error processing query:');
    error = err instanceof Error ? err.message : String(err);

    response = {
      answer: 'An error occurred while processing your question. Please try again or contact support.',
      confidence: 0.0,
      category: 'general',
      actions: ['Log error for debugging', 'Retry request', 'Escalate to human support'],
      requires_escalation: true,
      metadata: {
        complexity: 'high',
        sentiment: 'neutral',
      },
    };
  }

  const endTime = Date.now();
  const latencyMs = endTime - startTime;

  const modelName = provider.getModel();
  const estimatedCost = provider.calculateCost(
    promptTokens,
    completionTokens,
  );

  const metrics: QueryMetrics = {
    timestamp,
    question,
    tokens_prompt: promptTokens,
    tokens_completion: completionTokens,
    total_tokens: totalTokens,
    latency_ms: latencyMs,
    estimated_cost_usd: estimatedCost,
    model: modelName,
    success,
    error,
    moderation_flagged: moderationFlagged,
  };

  return {
    response,
    metrics,
  };
}
