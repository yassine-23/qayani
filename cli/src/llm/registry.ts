/**
 * Dynamic LLM provider registry.
 *
 * Providers self-register at startup via registerProvider(). The rest of the
 * CLI resolves providers by string name through createProvider(), with no
 * coupling to specific implementations.
 */

import type { LLMProvider, LLMProviderConfig } from './types.js';

// ── Registry internals ────────────────────────────────────────────────────────

type ProviderFactory = (config: LLMProviderConfig) => LLMProvider;

const providers = new Map<string, ProviderFactory>();
const envKeys = new Map<string, string>();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Register an LLM provider factory under a given name.
 */
export function registerProvider(
  name: string,
  factory: ProviderFactory,
  envKey: string,
): void {
  providers.set(name, factory);
  envKeys.set(name, envKey);
}

/**
 * Create an LLMProvider instance for the given provider name.
 *
 * @param name    Any registered provider identifier.
 * @param apiKey  The API key to authenticate with the provider.
 * @throws If the provider name is not registered.
 */
export function createProvider(name: string, apiKey: string): LLMProvider {
  const factory = providers.get(name);
  if (!factory) {
    const valid = getAvailableProviders().join(', ');
    throw new Error(
      `Unknown LLM provider "${name}". Registered providers: ${valid}`,
    );
  }
  return factory({ apiKey });
}

/**
 * Return the list of registered provider names.
 */
export function getAvailableProviders(): string[] {
  return Array.from(providers.keys());
}

/**
 * Return the environment variable name that holds the API key for a provider.
 * Falls back to `${NAME}_API_KEY` if the provider hasn't registered one.
 */
export function getProviderEnvKey(name: string): string {
  return envKeys.get(name) ?? `${name.toUpperCase()}_API_KEY`;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

let bootstrapped = false;

/**
 * Register all built-in providers. Call once at CLI startup.
 * Safe to call multiple times (no-ops after the first).
 */
export async function registerBuiltinProviders(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;

  // Core providers
  const { registerOpenAI } = await import('./openai.js');
  const { registerAnthropic } = await import('./anthropic.js');
  const { registerGoogle } = await import('./google.js');

  registerOpenAI();
  registerAnthropic();
  registerGoogle();

  // OpenAI-compatible providers
  const { registerOllama } = await import('./ollama.js');
  const { registerOpenRouter } = await import('./openrouter.js');
  const { registerGroq } = await import('./groq.js');

  registerOllama();
  registerOpenRouter();
  registerGroq();
}
