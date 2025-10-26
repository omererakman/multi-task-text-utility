import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createLLMProvider } from '../src/config.js';
import { processQuery } from '../src/query_processor.js';
import { SupportResponse } from '../src/types.js';

describe('E2E Tests', () => {
  test('should process a billing question and return valid JSON', async () => {
    const provider = createLLMProvider();
    const question = 'I was charged twice for my subscription';

    const result = await processQuery(provider, question);

    assert.ok(result.response, 'Response should exist');
    assert.ok(result.metrics, 'Metrics should exist');

    const response: SupportResponse = result.response;
    assert.strictEqual(typeof response.answer, 'string', 'Answer should be a string');
    assert.ok(response.answer.length > 0, 'Answer should not be empty');

    assert.strictEqual(typeof response.confidence, 'number', 'Confidence should be a number');
    assert.ok(response.confidence >= 0 && response.confidence <= 1, 'Confidence should be between 0 and 1');

    assert.strictEqual(typeof response.category, 'string', 'Category should be a string');
    assert.ok(['billing', 'technical', 'general', 'account', 'product'].includes(response.category),
      `Category should be valid, got: ${response.category}`);

    assert.ok(Array.isArray(response.actions), 'Actions should be an array');
    assert.strictEqual(typeof response.requires_escalation, 'boolean', 'Requires escalation should be boolean');

    assert.ok(response.metadata, 'Metadata should exist');
    assert.ok(['low', 'medium', 'high'].includes(response.metadata.complexity),
      `Complexity should be valid, got: ${response.metadata.complexity}`);
    assert.ok(['positive', 'neutral', 'negative'].includes(response.metadata.sentiment),
      `Sentiment should be valid, got: ${response.metadata.sentiment}`);

    assert.ok(result.metrics.tokens_prompt > 0, 'Prompt tokens should be greater than 0');
    assert.ok(result.metrics.tokens_completion > 0, 'Completion tokens should be greater than 0');
    assert.ok(result.metrics.total_tokens > 0, 'Total tokens should be greater than 0');
    assert.ok(result.metrics.latency_ms > 0, 'Latency should be greater than 0');
    assert.ok(result.metrics.estimated_cost_usd >= 0, 'Cost should be non-negative');
    assert.strictEqual(result.metrics.success, true, 'Query should be successful');
  });

  test('should process a technical question and return valid JSON', async () => {
    const provider = createLLMProvider();
    const question = 'The app keeps crashing when I upload a photo';

    const result = await processQuery(provider, question);

    assert.ok(result.response, 'Response should exist');
    const response: SupportResponse = result.response;

    assert.ok(response.answer.length > 0, 'Answer should not be empty');
    assert.ok(['billing', 'technical', 'general', 'account', 'product'].includes(response.category),
      `Category should be valid, got: ${response.category}`);

    const jsonString = JSON.stringify(result);
    assert.ok(jsonString.length > 0, 'Result should be serializable to JSON');

    const parsed = JSON.parse(jsonString);
    assert.ok(parsed.response, 'Parsed result should have response');
    assert.ok(parsed.metrics, 'Parsed result should have metrics');
  });

  test('should handle general inquiry and return valid JSON', async () => {
    const provider = createLLMProvider();
    const question = 'What are your business hours?';

    const result = await processQuery(provider, question);

    const response: SupportResponse = result.response;
    assert.ok(response.answer.length > 0, 'Answer should not be empty');

    assert.ok(['billing', 'technical', 'general', 'account', 'product'].includes(response.category),
      `Category should be valid, got: ${response.category}`);

    const jsonOutput = JSON.stringify(result, null, 2);
    assert.ok(jsonOutput.includes('"answer"'), 'JSON output should contain answer field');
    assert.ok(jsonOutput.includes('"confidence"'), 'JSON output should contain confidence field');
    assert.ok(jsonOutput.includes('"category"'), 'JSON output should contain category field');
    assert.ok(jsonOutput.includes('"actions"'), 'JSON output should contain actions field');
    assert.ok(jsonOutput.includes('"requires_escalation"'), 'JSON output should contain requires_escalation field');
    assert.ok(jsonOutput.includes('"metadata"'), 'JSON output should contain metadata field');
  });

  test('should validate output JSON format matches expected schema', async () => {
    const provider = createLLMProvider();
    const question = 'How do I reset my password?';

    const result = await processQuery(provider, question);

    const jsonOutput = JSON.stringify(result, null, 2);
    const parsed = JSON.parse(jsonOutput);

    assert.ok(parsed.response, 'JSON should have response object');
    assert.ok(parsed.response.answer, 'JSON response should have answer');
    assert.ok(typeof parsed.response.confidence === 'number', 'JSON response should have numeric confidence');
    assert.ok(parsed.response.category, 'JSON response should have category');
    assert.ok(Array.isArray(parsed.response.actions), 'JSON response should have actions array');
    assert.ok(typeof parsed.response.requires_escalation === 'boolean', 'JSON response should have boolean requires_escalation');
    assert.ok(parsed.response.metadata, 'JSON response should have metadata object');
    assert.ok(parsed.response.metadata.complexity, 'JSON metadata should have complexity');
    assert.ok(parsed.response.metadata.sentiment, 'JSON metadata should have sentiment');

    assert.ok(parsed.metrics, 'JSON should have metrics object');
    assert.ok(parsed.metrics.timestamp, 'JSON metrics should have timestamp');
    assert.ok(typeof parsed.metrics.tokens_prompt === 'number', 'JSON metrics should have numeric tokens_prompt');
    assert.ok(typeof parsed.metrics.total_tokens === 'number', 'JSON metrics should have numeric total_tokens');
  });
});
