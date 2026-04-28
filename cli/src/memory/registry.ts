/**
 * Dynamic memory backend registry.
 *
 * Backends self-register at startup via registerMemoryBackend().
 * The rest of the CLI resolves backends by string name.
 */

import type { MemoryBackend } from './types.js';
import { NoMemoryBackend } from './none.js';

// ── Registry internals ────────────────────────────────────────────────────────

type MemoryFactory = (config?: Record<string, unknown>) => MemoryBackend;

const backends = new Map<string, MemoryFactory>();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Register a memory backend factory under a given name.
 */
export function registerMemoryBackend(
  name: string,
  factory: MemoryFactory,
): void {
  backends.set(name, factory);
}

/**
 * Create a MemoryBackend instance for the given backend name.
 *
 * @param name    Any registered backend identifier, or 'none'.
 * @param config  Optional config passed to the factory.
 * @throws If the backend name is not registered.
 */
export function createMemoryBackend(
  name: string,
  config?: Record<string, unknown>,
): MemoryBackend {
  if (name === 'none') return new NoMemoryBackend();

  const factory = backends.get(name);
  if (!factory) {
    const valid = getAvailableBackends().join(', ');
    throw new Error(
      `Unknown memory backend "${name}". Registered backends: ${valid}, none`,
    );
  }
  return factory(config);
}

/**
 * Return the list of registered backend names.
 */
export function getAvailableBackends(): string[] {
  return Array.from(backends.keys());
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

let bootstrapped = false;

/**
 * Register all built-in memory backends. Call once at CLI startup.
 * Safe to call multiple times (no-ops after the first).
 */
export function registerBuiltinBackends(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  // Local file-based backend
  const { LocalMemoryBackend } = require('./local.js') as typeof import('./local.js');
  registerMemoryBackend('local', () => new LocalMemoryBackend());

  // Google Drive backend
  registerMemoryBackend('gdrive', () => {
    const { GoogleDriveMemoryBackend, resolveGoogleDriveConfig } =
      require('./google-drive.js') as typeof import('./google-drive.js');
    const gdriveConfig = resolveGoogleDriveConfig();
    if (!gdriveConfig) {
      throw new Error(
        'Google Drive config not found. Set GOOGLE_DRIVE_TOKEN or run: qayani config google-drive-token <token>',
      );
    }
    return new GoogleDriveMemoryBackend(gdriveConfig);
  });
}
