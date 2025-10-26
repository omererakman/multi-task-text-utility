#!/usr/bin/env node

import { createLLMProvider } from './config.js';
import { processQuery } from './query_processor.js';
import { saveMetrics, displayMetricsSummary } from './metrics.js';
import { logger } from './logger.js';

async function main() {
  const args = process.argv.slice(2);
  const question = args.join(' ') || 'What are your business hours?';

  logger.info('\n🚀 Multi-Task Text Utility');
  logger.info('═══════════════════════════════════════════════════\n');
  logger.info(`❓ Question: "${question}"\n`);

  try {
    const provider = createLLMProvider();
    logger.info(`🔧 Configuration loaded (Provider: ${provider.name}, Model: ${provider.getModel()})\n`);

    const result = await processQuery(provider, question);

    // Always output the JSON response (even in silent mode)
    console.log(JSON.stringify(result, null, 2));

    logger.debug('\n📊 Detailed Metrics:');
    logger.debug('─────────────────────────────────────');
    logger.debug(`Timestamp: ${result.metrics.timestamp}`);
    logger.debug(`Tokens (Prompt): ${result.metrics.tokens_prompt}`);
    logger.debug(`Tokens (Completion): ${result.metrics.tokens_completion}`);
    logger.debug(`Total Tokens: ${result.metrics.total_tokens}`);
    logger.debug(`Latency: ${result.metrics.latency_ms}ms`);
    logger.debug(`Estimated Cost: $${result.metrics.estimated_cost_usd.toFixed(6)}`);
    logger.debug(`Model: ${result.metrics.model}`);
    logger.debug(`Success: ${result.metrics.success}`);
    if (result.metrics.moderation_flagged) {
      logger.warn(`⚠️  Moderation Flagged: Yes`);
    }
    logger.debug('─────────────────────────────────────\n');

    saveMetrics(result.metrics);

    displayMetricsSummary();

    logger.info('✅ Query processed successfully!\n');
  } catch (error) {
    logger.error({ error }, '\n❌ Error:');
    process.exit(1);
  }
}

main();
