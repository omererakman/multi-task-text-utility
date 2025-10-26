import dotenv from 'dotenv';
import { LLMProvider, createProvider, ProviderConfig } from './providers/index.js';

dotenv.config();

export interface ProviderConfiguration {
  provider: string;
  config: ProviderConfig;
}

export function loadProviderConfig(): ProviderConfiguration {
  const providerName = process.env.LLM_PROVIDER || 'openai';

  let apiKey: string | undefined;
  let apiKeyEnvVar: string;

  switch (providerName.toLowerCase()) {
    case 'openai':
      apiKeyEnvVar = 'OPENAI_API_KEY';
      apiKey = process.env.OPENAI_API_KEY;
      break;
    default:
      apiKeyEnvVar = `${providerName.toUpperCase()}_API_KEY`;
      apiKey = process.env[apiKeyEnvVar];
  }

  if (!apiKey) {
    throw new Error(
      `${apiKeyEnvVar} environment variable is required for provider '${providerName}'. ` +
      'Please create a .env file based on .env.example'
    );
  }

  return {
    provider: providerName,
    config: {
      apiKey,
      model: process.env.MODEL_NAME,
      temperature: process.env.TEMPERATURE ? parseFloat(process.env.TEMPERATURE) : undefined,
    },
  };
}

export function createLLMProvider(): LLMProvider {
  const { provider, config } = loadProviderConfig();
  return createProvider(provider, config);
}
