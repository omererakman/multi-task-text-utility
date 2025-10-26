import { ModerationResult, SupportResponse } from './types.js';
import { LLMProvider } from './providers/index.js';

export async function moderateInput(
  provider: LLMProvider,
  question: string
): Promise<ModerationResult> {
  try {
    return await provider.moderateContent(question);
  } catch (error) {
    console.error('Moderation API error:', error);
    return {
      flagged: false,
      categories: {},
      category_scores: {},
    };
  }
}

export function generateSafeFallbackResponse(
  moderationResult: ModerationResult
): SupportResponse {
  const flaggedCategories = Object.entries(moderationResult.categories)
    .filter(([_, flagged]) => flagged)
    .map(([category]) => category);

  return {
    answer: 'I cannot process this request as it may contain inappropriate content. Please rephrase your question.',
    confidence: 1.0,
    category: 'general',
    actions: [
      'Flag message for review by human moderator',
      'Log incident for safety monitoring',
      `Flagged categories: ${flaggedCategories.join(', ')}`,
    ],
    requires_escalation: true,
    metadata: {
      complexity: 'high',
      sentiment: 'neutral',
    },
  };
}

export function detectPromptInjection(question: string): boolean {
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous\s+)?instructions?/i,
    /disregard\s+(all\s+)?(previous|above)\s+instructions?/i,
    /forget\s+(everything|all)\s+(you|we)\s+(said|told)/i,
    /new\s+instructions?:/i,
    /system\s*:\s*/i,
    /\[SYSTEM\]/i,
    /\[INST\]/i,
    /you\s+are\s+now/i,
    /act\s+as\s+(if\s+)?you\s+are/i,
    /pretend\s+(that\s+)?you\s+are/i,
  ];

  return injectionPatterns.some(pattern => pattern.test(question));
}

export async function performSafetyCheck(
  provider: LLMProvider,
  question: string
): Promise<{ safe: boolean; moderationResult: ModerationResult; injectionDetected: boolean }> {
  const moderationResult = await moderateInput(provider, question);
  const injectionDetected = detectPromptInjection(question);

  const safe = !moderationResult.flagged && !injectionDetected;

  if (injectionDetected) {
    console.warn('⚠️  Potential prompt injection detected in question');
  }

  if (moderationResult.flagged) {
    console.warn('⚠️  Content flagged by Moderation API');
  }

  return {
    safe,
    moderationResult,
    injectionDetected,
  };
}
