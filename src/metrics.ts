import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { QueryMetrics } from './types.js';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const METRICS_DIR = join(__dirname, '..', 'metrics');
const METRICS_JSON_PATH = join(METRICS_DIR, 'metrics.json');

function ensureMetricsDir(): void {
  if (!existsSync(METRICS_DIR)) {
    mkdirSync(METRICS_DIR, { recursive: true });
  }
}

function loadMetrics(): QueryMetrics[] {
  ensureMetricsDir();

  if (!existsSync(METRICS_JSON_PATH)) {
    return [];
  }

  try {
    const data = readFileSync(METRICS_JSON_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    logger.error({ error }, 'Error loading metrics:');
    return [];
  }
}

export function saveMetrics(metric: QueryMetrics): void {
  ensureMetricsDir();

  const metrics = loadMetrics();
  metrics.push(metric);

  writeFileSync(METRICS_JSON_PATH, JSON.stringify(metrics, null, 2));
  logger.debug(`📊 Metrics saved to ${METRICS_JSON_PATH}`);
}

export function getMetricsSummary(): {
  total_queries: number;
  total_cost: number;
  avg_latency: number;
  total_tokens: number;
  success_rate: number;
  avg_confidence?: number;
} {
  const metrics = loadMetrics();

  if (metrics.length === 0) {
    return {
      total_queries: 0,
      total_cost: 0,
      avg_latency: 0,
      total_tokens: 0,
      success_rate: 0,
    };
  }

  const successfulQueries = metrics.filter(m => m.success);

  return {
    total_queries: metrics.length,
    total_cost: metrics.reduce((sum, m) => sum + m.estimated_cost_usd, 0),
    avg_latency: metrics.reduce((sum, m) => sum + m.latency_ms, 0) / metrics.length,
    total_tokens: metrics.reduce((sum, m) => sum + m.total_tokens, 0),
    success_rate: successfulQueries.length / metrics.length,
  };
}

export function displayMetricsSummary(): void {
  const summary = getMetricsSummary();

  logger.info('📈 Metrics Summary:');
  logger.info('─────────────────────────────────────');
  logger.info(`Total Queries: ${summary.total_queries}`);
  logger.info(`Success Rate: ${(summary.success_rate * 100).toFixed(1)}%`);
  logger.info(`Total Cost: $${summary.total_cost.toFixed(6)}`);
  logger.info(`Average Latency: ${summary.avg_latency.toFixed(0)}ms`);
  logger.info(`Total Tokens: ${summary.total_tokens.toLocaleString()}`);
  logger.info('─────────────────────────────────────\n');
}
