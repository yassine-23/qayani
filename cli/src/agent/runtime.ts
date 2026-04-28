import { randomUUID } from 'crypto';
import type { AgentConfig, AgentRuntime, LLMMessage } from './types.js';

/**
 * Creates a new agent runtime instance with a unique conversation ID.
 */
export function createRuntime(
  config: AgentConfig,
  systemPrompt: string,
  sessionId?: string,
): AgentRuntime {
  return {
    config,
    systemPrompt,
    conversationId: sessionId ?? randomUUID(),
  };
}

/**
 * Builds the full LLM message array for a conversation turn.
 *
 * The message array is structured as:
 *   1. System message (system prompt + persona behavioral instructions)
 *   2. Conversation history (trimmed to maxHistory turns)
 *   3. Current user message
 */
export function buildMessages(
  runtime: AgentRuntime,
  history: Array<{ role: string; content: string }>,
  userMessage: string
): LLMMessage[] {
  const messages: LLMMessage[] = [];

  // Build the augmented system prompt with persona instructions
  const systemContent = buildSystemPrompt(runtime);
  messages.push({ role: 'system', content: systemContent });

  // Trim history to maxHistory turns if configured
  const maxHistory = runtime.config.memory.maxHistory;
  const trimmedHistory =
    maxHistory !== undefined && maxHistory > 0
      ? history.slice(-maxHistory)
      : history;

  // Append conversation history
  for (const msg of trimmedHistory) {
    const role = normalizeRole(msg.role);
    if (role === 'user' || role === 'assistant') {
      messages.push({ role, content: msg.content });
    }
  }

  // Append the current user message
  messages.push({ role: 'user', content: userMessage });

  return messages;
}

/**
 * Composes the system prompt by appending persona behavioral instructions
 * to the base system prompt.
 *
 * For new-format agents (soul.md + agent.yaml), persona traits may already
 * be embedded in the soul template. Persona instructions are still appended
 * if the persona section exists in the config.
 */
function buildSystemPrompt(runtime: AgentRuntime): string {
  const { config, systemPrompt } = runtime;
  const sections: string[] = [systemPrompt];

  if (config.persona) {
    const personaInstructions = buildPersonaInstructions(config.persona);
    if (personaInstructions) {
      sections.push(personaInstructions);
    }
  }

  return sections.join('\n\n');
}

/**
 * Converts persona traits, voice, and expertise into concrete behavioral
 * instructions that the LLM can follow.
 */
function buildPersonaInstructions(
  persona: NonNullable<AgentConfig['persona']>
): string | null {
  const lines: string[] = [];

  // Convert trait scores into behavioral guidance
  const traitEntries = Object.entries(persona.traits ?? {});
  if (traitEntries.length > 0) {
    lines.push('## Behavioral Traits');
    lines.push(
      'Adjust your behavior according to the following trait levels (0 = minimal, 1 = maximum):'
    );
    for (const [trait, score] of traitEntries) {
      const level = describeTraitLevel(score);
      const label = formatTraitName(trait);
      lines.push(`- **${label}**: ${score.toFixed(1)} (${level})`);
    }
  }

  // Add voice/style instruction
  if (persona.voice) {
    lines.push('## Communication Style');
    lines.push(`Speak in this style: ${persona.voice}`);
  }

  // Add expertise domains
  if (persona.expertise && persona.expertise.length > 0) {
    lines.push('## Areas of Expertise');
    lines.push(
      'You have deep knowledge in the following domains. Prioritize these when relevant:'
    );
    for (const domain of persona.expertise) {
      lines.push(`- ${domain}`);
    }
  }

  if (lines.length === 0) {
    return null;
  }

  return lines.join('\n');
}

/**
 * Maps a 0-1 score to a human-readable level description.
 */
function describeTraitLevel(score: number): string {
  if (score <= 0.1) return 'very low';
  if (score <= 0.3) return 'low';
  if (score <= 0.5) return 'moderate';
  if (score <= 0.7) return 'high';
  if (score <= 0.9) return 'very high';
  return 'maximum';
}

/**
 * Formats a trait name from camelCase/kebab-case to a readable label.
 * e.g. "creativity" -> "Creativity", "risk-taking" -> "Risk Taking"
 */
function formatTraitName(trait: string): string {
  return trait
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Normalizes a role string to one of the expected LLM message roles.
 */
function normalizeRole(role: string): 'system' | 'user' | 'assistant' {
  const lower = role.toLowerCase().trim();
  if (lower === 'system') return 'system';
  if (lower === 'assistant') return 'assistant';
  return 'user';
}
