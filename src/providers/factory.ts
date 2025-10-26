import { LLMProvider, ProviderConfig } from './types.js';
import { OpenAIProvider } from './openai.js';

type ProviderConstructor = new () => LLMProvider;

class ProviderRegistry {
  private providers: Map<string, ProviderConstructor> = new Map();

  register(name: string, provider: ProviderConstructor): void {
    this.providers.set(name.toLowerCase(), provider);
  }

  get(name: string): ProviderConstructor | undefined {
    return this.providers.get(name.toLowerCase());
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

const registry = new ProviderRegistry();

registry.register('openai', OpenAIProvider);

export function createProvider(name: string, config: ProviderConfig): LLMProvider {
  const ProviderClass = registry.get(name);

  if (!ProviderClass) {
    throw new Error(
      `Unknown provider: ${name}. Available providers: ${registry.list().join(', ')}`
    );
  }

  const provider = new ProviderClass();
  provider.initialize(config);

  return provider;
}

export function registerProvider(name: string, provider: ProviderConstructor): void {
  registry.register(name, provider);
}

export function getAvailableProviders(): string[] {
  return registry.list();
}
