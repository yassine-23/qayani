/**
 * Soul template engine — renders soul.md files with variable interpolation,
 * partial inclusion, and conditional blocks.
 *
 * Syntax:
 *   {{variable}}           — lookup from vars > persona fields > env
 *   {{env.VAR}}            — explicit environment variable
 *   {{runtime.key}}        — runtime context (session_id, timestamp, etc.)
 *   {{> partial.md}}       — include and recursively render a file
 *   {{#if var}}...{{/if}}  — conditional block (rendered if var is truthy)
 */

import * as fs from 'fs';
import * as path from 'path';

export interface SoulContext {
  /** Flattened config values: vars + persona fields + top-level config */
  config: Record<string, unknown>;
  /** Environment variables (process.env) */
  env: Record<string, string | undefined>;
  /** Runtime values like session_id, timestamp */
  runtime: Record<string, string>;
}

/**
 * Render a soul template string with the given context.
 *
 * @param template  The raw soul.md content
 * @param context   Values available for interpolation
 * @param basePath  Directory containing the soul.md (for resolving partials)
 * @param depth     Recursion depth guard (prevents infinite partial loops)
 */
export function renderSoul(
  template: string,
  context: SoulContext,
  basePath: string,
  depth = 0,
): string {
  if (depth > 10) {
    throw new Error('Soul template: maximum partial inclusion depth (10) exceeded — check for circular references.');
  }

  let result = template;

  // 1. Resolve partials: {{> filename.md}}
  result = result.replace(/\{\{>\s*(.+?)\s*\}\}/g, (_match, filePath: string) => {
    const absolutePath = path.resolve(basePath, filePath);
    try {
      const partial = fs.readFileSync(absolutePath, 'utf-8');
      return renderSoul(partial, context, path.dirname(absolutePath), depth + 1);
    } catch {
      return `[missing partial: ${filePath}]`;
    }
  });

  // 2. Resolve conditionals: {{#if var}}...{{/if}}
  result = result.replace(
    /\{\{#if\s+(\S+?)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, varName: string, body: string) => {
      const value = resolveVariable(varName, context);
      if (value && value !== 'false' && value !== '0') {
        return body;
      }
      return '';
    },
  );

  // 3. Resolve variables: {{var}}, {{env.VAR}}, {{runtime.key}}
  result = result.replace(/\{\{\s*(\S+?)\s*\}\}/g, (_match, varName: string) => {
    const value = resolveVariable(varName, context);
    return value ?? '';
  });

  return result;
}

/**
 * Resolve a variable name against the context layers.
 *
 * Lookup order:
 *   1. env.X      — explicit env lookup
 *   2. runtime.X  — explicit runtime lookup
 *   3. config.vars[X]
 *   4. config.persona fields (voice, expertise as comma-joined, traits as JSON)
 *   5. config[X]  (name, description, etc.)
 *   6. process.env[X]
 */
function resolveVariable(name: string, context: SoulContext): string | undefined {
  // Explicit env lookup
  if (name.startsWith('env.')) {
    const envKey = name.slice(4);
    return context.env[envKey] ?? undefined;
  }

  // Explicit runtime lookup
  if (name.startsWith('runtime.')) {
    const runtimeKey = name.slice(8);
    return context.runtime[runtimeKey] ?? undefined;
  }

  // Vars from agent.yaml
  const vars = context.config['vars'] as Record<string, string> | undefined;
  if (vars && name in vars) {
    return String(vars[name]);
  }

  // Persona fields
  const persona = context.config['persona'] as Record<string, unknown> | undefined;
  if (persona && name in persona) {
    const val = persona[name];
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'object' && val !== null) return JSON.stringify(val);
    return String(val);
  }

  // Top-level config fields
  if (name in context.config) {
    const val = context.config[name];
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'object' && val !== null) return JSON.stringify(val);
    return String(val);
  }

  // Fallback to env
  return context.env[name] ?? undefined;
}

/**
 * Build a SoulContext from an agent config object.
 */
export function buildSoulContext(
  config: Record<string, unknown>,
  runtimeOverrides?: Record<string, string>,
): SoulContext {
  return {
    config,
    env: process.env as Record<string, string | undefined>,
    runtime: {
      timestamp: new Date().toISOString(),
      ...runtimeOverrides,
    },
  };
}
