import { ModerationResult, SupportResponse, PIIDetectionResult } from './types.js';
import { LLMProvider } from './providers/index.js';
import { logger } from './logger.js';

const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  passport: /\b[A-Z]{1,2}\d{6,9}\b/g,
  driverLicense: /\b[A-Z]{1,2}\d{5,8}\b/g,
  zipCode: /\b\d{5}(?:-\d{4})?\b/g,
  dateOfBirth: /\b(?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12]\d|3[01])[/-](?:19|20)\d{2}\b/g,
  apiKey: /\b(?:api[_-]?key|apikey|access[_-]?token)[:\s=]+[\w-]+/gi,
  accountNumber: /\b(?:account|acct)[#:\s]+\d{6,}\b/gi,
};

export async function moderateInput(
  provider: LLMProvider,
  question: string
): Promise<ModerationResult> {
  try {
    return await provider.moderateContent(question);
  } catch (error) {
    logger.error({ err: error }, 'Moderation API error');
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

export function detectPII(text: string): PIIDetectionResult {
  const detectedPII: Record<string, string[]> = {};
  let hasPII = false;

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      detectedPII[type] = matches;
      hasPII = true;
    }
  }

  return {
    detected: hasPII,
    types: detectedPII,
  };
}

export function redactPII(text: string, detectionResult?: PIIDetectionResult): string {
  const result = detectionResult || detectPII(text);

  if (!result.detected) {
    return text;
  }

  let redactedText = text;

  for (const [type, matches] of Object.entries(result.types)) {
    if (Array.isArray(matches)) {
      for (const match of matches) {
        const redactionLabel = `[${type.toUpperCase()}_REDACTED]`;
        redactedText = redactedText.replace(match, redactionLabel);
      }
    }
  }

  return redactedText;
}

export async function performSafetyCheck(
  provider: LLMProvider,
  question: string
): Promise<{
  safe: boolean;
  moderationResult: ModerationResult;
  injectionDetected: boolean;
  piiDetected: PIIDetectionResult;
  sanitizedQuestion?: string;
}> {
  const moderationResult = await moderateInput(provider, question);
  const injectionDetected = detectPromptInjection(question);
  const piiDetected = detectPII(question);

  if (injectionDetected) {
    logger.warn('⚠️  Potential prompt injection detected in question');
    moderationResult.categories['prompt_injection'] = true;
    moderationResult.category_scores['prompt_injection'] = 1.0;
    moderationResult.flagged = true;
  }

  if (piiDetected.detected) {
    logger.warn({ piiTypes: Object.keys(piiDetected.types) }, '⚠️  PII detected in question');
    moderationResult.categories['pii_detected'] = true;
    moderationResult.category_scores['pii_detected'] = 1.0;
    moderationResult.flagged = true;

    for (const piiType of Object.keys(piiDetected.types)) {
      moderationResult.categories[`pii_${piiType}`] = true;
      moderationResult.category_scores[`pii_${piiType}`] = 1.0;
    }
  }

  if (moderationResult.flagged) {
    logger.warn('⚠️  Content flagged by Moderation API');
  }

  const safe = !moderationResult.flagged && !injectionDetected && !piiDetected.detected;

  const result: any = {
    safe,
    moderationResult,
    injectionDetected,
    piiDetected,
  };

  if (piiDetected.detected) {
    result.sanitizedQuestion = redactPII(question, piiDetected);
  }

  return result;
}
