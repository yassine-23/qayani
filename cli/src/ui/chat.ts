import * as readline from 'readline';
import chalk from 'chalk';
import { colors, theme, agentBanner } from './theme.js';
import { box, divider, createFancySpinner, keyValue, sectionHeader } from './components.js';
import type { AgentRuntime, LLMMessage } from '../agent/types.js';
import type { LLMProvider, LLMResponse } from '../llm/types.js';
import type { MemoryBackend, ConversationMessage } from '../memory/types.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { ToolExecutor } from '../tools/executor.js';
import type { ToolCall } from '../tools/types.js';

// ── Slash command handlers ────────────────────────────────────────────────────

function printHelp(): void {
  const commands = [
    ['/help',    'Show this help message'],
    ['/clear',   'Clear conversation history'],
    ['/history', 'Show conversation history'],
    ['/save',    'Save the current session'],
    ['/exit',    'Exit the chat'],
  ];

  console.log('');
  console.log(sectionHeader('Slash Commands'));
  console.log('');
  for (const [cmd, desc] of commands) {
    console.log(`  ${colors.accent(cmd.padEnd(12))} ${colors.muted(desc)}`);
  }
  console.log('');
}

function printHistory(history: LLMMessage[]): void {
  console.log('');
  if (history.length === 0) {
    console.log(colors.muted('  No messages in history.'));
    console.log('');
    return;
  }

  console.log(sectionHeader(`Conversation History (${history.length} messages)`));
  console.log('');

  for (const msg of history) {
    if (msg.role === 'system') continue;
    const label =
      msg.role === 'user'
        ? colors.accent('You:   ')
        : colors.success('Agent: ');
    const preview =
      msg.content.length > 80
        ? msg.content.slice(0, 80) + colors.muted('...')
        : msg.content;
    console.log(`  ${label}${preview}`);
  }
  console.log('');
}

// ── Welcome box ──────────────────────────────────────────────────────────────

function printWelcomeBox(agentName: string, hasTools: boolean): void {
  const toolHint = hasTools ? 'Tools are enabled for this agent.' : 'Streaming mode (no tools).';
  const content = [
    colors.muted('Type a message to start chatting.'),
    colors.muted('Use ') + colors.accent('/help') + colors.muted(' for commands, ') + colors.accent('/exit') + colors.muted(' to quit.'),
    '',
    colors.muted(toolHint),
  ].join('\n');

  console.log(box(content, {
    style: 'rounded',
    title: `Chat with ${agentName}`,
    borderColor: colors.muted,
    titleColor: theme.brand,
  }));
  console.log('');
}

// ── Tool call display ────────────────────────────────────────────────────────

function formatToolCall(name: string, args: string): string {
  const header = colors.warning('  ⚡ ') + chalk.bold.white(name);
  const argsDisplay = args.length > 120
    ? colors.muted(args.slice(0, 120) + '...')
    : colors.muted(args);
  return header + '\n' + colors.muted('    ') + argsDisplay;
}

function formatToolResult(name: string, content: string, isError: boolean): string {
  const icon = isError ? colors.error('  ✗ ') : colors.success('  ✓ ');
  const label = isError ? colors.error(name) : colors.muted(name);
  const preview = content.length > 200
    ? content.slice(0, 200) + colors.muted('...')
    : content;
  return icon + label + '\n' + colors.muted('    ') + colors.muted(preview);
}

// ── Tool call loop helper ─────────────────────────────────────────────────────

const MAX_TOOL_ITERATIONS = 5;

/**
 * Resolves tool definitions in the format expected by the current provider.
 */
function getToolsForProvider(
  providerName: string,
  registry: ToolRegistry,
): unknown[] {
  switch (providerName) {
    case 'openai':
      return registry.toOpenAITools();
    case 'anthropic':
      return registry.toAnthropicTools();
    case 'google':
      return registry.toGoogleTools();
    default:
      return registry.toOpenAITools();
  }
}

/**
 * Handle the tool-enabled flow: send message with tools, execute tool calls,
 * feed results back, repeat until the LLM responds with text.
 */
async function handleToolFlow(
  messages: LLMMessage[],
  llmProvider: LLMProvider,
  registry: ToolRegistry,
  executor: ToolExecutor,
  config: { model: { name: string; temperature?: number; maxTokens?: number; provider: string } },
  agentName: string,
  conversationId: string,
  memoryBackend: MemoryBackend,
): Promise<void> {
  const spinner = createFancySpinner('braille', 'Thinking...');

  try {
    const providerTools = getToolsForProvider(config.model.provider, registry);
    let iterations = 0;

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;
      spinner.start();

      const response: LLMResponse = await llmProvider.chatWithTools(messages, providerTools, {
        model: config.model.name,
        temperature: config.model.temperature,
        maxTokens: config.model.maxTokens,
      });

      spinner.stop();

      // If no tool calls, we have our final text response
      if (!response.toolCalls || response.toolCalls.length === 0) {
        const finalContent = response.content || '';
        if (finalContent) {
          process.stdout.write(`\n${colors.success(agentName + ':')} ${finalContent}\n\n`);
          messages.push({ role: 'assistant', content: finalContent });

          const assistantMsg: ConversationMessage = {
            role: 'assistant',
            content: finalContent,
            timestamp: new Date().toISOString(),
          };
          await memoryBackend.saveMessage(agentName, conversationId, assistantMsg);
        } else {
          process.stdout.write(`\n${colors.success(agentName + ':')} ${colors.muted('(no response)')}\n\n`);
        }
        return;
      }

      // Execute tool calls
      const toolCalls: ToolCall[] = response.toolCalls.map((tc) => ({
        id: tc.id,
        name: tc.name,
        arguments: typeof tc.arguments === 'string' ? JSON.parse(tc.arguments) : tc.arguments,
      }));

      const resultParts: string[] = [];

      // Tool calls section
      console.log('');
      console.log(colors.muted('  ─── Tool Calls ───'));

      for (const toolCall of toolCalls) {
        const argsStr = JSON.stringify(toolCall.arguments);
        console.log(formatToolCall(toolCall.name, argsStr));

        const result = await executor.execute(toolCall);
        console.log(formatToolResult(toolCall.name, result.content, result.isError ?? false));
        console.log('');

        resultParts.push(`[${toolCall.name}]: ${result.content}`);
      }

      // Feed tool results back to the LLM as a user message
      const toolResultMessage = `Tool results:\n${resultParts.join('\n')}`;
      messages.push({ role: 'user', content: toolResultMessage });
    }

    // If we exhausted iterations, fall back to a final response
    console.log(colors.muted('  (max tool iterations reached, requesting final response)'));
    spinner.update('Generating final response...');
    spinner.start();

    const finalResponse = await llmProvider.chat(messages, {
      model: config.model.name,
      temperature: config.model.temperature,
      maxTokens: config.model.maxTokens,
    });

    spinner.stop();

    const finalContent = finalResponse.content || '';
    if (finalContent) {
      process.stdout.write(`\n${colors.success(agentName + ':')} ${finalContent}\n\n`);
      messages.push({ role: 'assistant', content: finalContent });

      const assistantMsg: ConversationMessage = {
        role: 'assistant',
        content: finalContent,
        timestamp: new Date().toISOString(),
      };
      await memoryBackend.saveMessage(agentName, conversationId, assistantMsg);
    }
  } catch (err) {
    spinner.stop();
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`\n${colors.error('  Error: ' + errorMessage)}\n`);
  }
}

/**
 * Handle the standard streaming flow (no tools).
 */
async function handleStreamFlow(
  messages: LLMMessage[],
  llmProvider: LLMProvider,
  config: { model: { name: string; temperature?: number; maxTokens?: number } },
  agentName: string,
  conversationId: string,
  memoryBackend: MemoryBackend,
): Promise<void> {
  const spinner = createFancySpinner('braille', 'Thinking...');
  let fullResponse = '';
  let firstChunk = true;

  try {
    spinner.start();

    const stream = llmProvider.chatStream(messages, {
      model: config.model.name,
      temperature: config.model.temperature,
      maxTokens: config.model.maxTokens,
    });

    for await (const chunk of stream) {
      if (chunk.done) break;

      if (firstChunk) {
        spinner.stop();
        process.stdout.write(`\n${colors.success(agentName + ':')} `);
        firstChunk = false;
      }

      process.stdout.write(chunk.content);
      fullResponse += chunk.content;
    }

    // If we never got any content, stop the spinner and note it
    if (firstChunk) {
      spinner.stop();
      process.stdout.write(`\n${colors.success(agentName + ':')} ${colors.muted('(no response)')}`);
    }

    process.stdout.write('\n\n');

    // Save assistant message to history and memory
    if (fullResponse) {
      messages.push({ role: 'assistant', content: fullResponse });

      const assistantMsg: ConversationMessage = {
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date().toISOString(),
      };
      await memoryBackend.saveMessage(agentName, conversationId, assistantMsg);
    }
  } catch (err) {
    spinner.stop();
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`\n${colors.error('  Error: ' + errorMessage)}\n`);
  }
}

// ── Main chat loop ────────────────────────────────────────────────────────────

export async function startChat(
  runtime: AgentRuntime,
  llmProvider: LLMProvider,
  memoryBackend: MemoryBackend,
  toolRegistry?: ToolRegistry,
  toolExecutor?: ToolExecutor,
): Promise<void> {
  const { config, systemPrompt, conversationId } = runtime;
  const agentName = config.name;

  // Print agent banner
  console.log(
    agentBanner(agentName, config.model.provider, config.model.name),
  );

  // Determine if we have tools
  const hasTools = !!(toolRegistry && toolExecutor && toolRegistry.getAll().length > 0);

  // Print welcome box
  printWelcomeBox(agentName, hasTools);

  // Build initial messages array with system prompt
  const messages: LLMMessage[] = [{ role: 'system', content: systemPrompt }];

  // Load existing history from memory
  const existingHistory = await memoryBackend.getHistory(agentName, conversationId);
  for (const msg of existingHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  if (existingHistory.length > 0) {
    console.log(colors.muted(`  Restored ${existingHistory.length} messages from history.\n`));
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: colors.accent('  You: '),
    terminal: true,
  });

  // Graceful shutdown handler
  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log('\n');
    console.log(colors.muted('  Saving session...'));

    // Session is already saved message-by-message, just print goodbye.
    console.log(colors.muted('  Goodbye.\n'));
    rl.close();
    process.exit(0);
  };

  rl.on('SIGINT', () => {
    void shutdown();
  });

  rl.on('close', () => {
    if (!shuttingDown) {
      void shutdown();
    }
  });

  rl.prompt();

  rl.on('line', async (line: string) => {
    const input = line.trim();

    // Empty input -- just re-prompt
    if (!input) {
      rl.prompt();
      return;
    }

    // ── Slash commands ──────────────────────────────────────────────────────
    if (input.startsWith('/')) {
      const cmd = input.toLowerCase().split(/\s+/)[0];

      switch (cmd) {
        case '/help':
          printHelp();
          rl.prompt();
          return;

        case '/clear':
          // Keep only the system prompt
          messages.length = 1;
          console.log(colors.muted('\n  Conversation cleared.\n'));
          rl.prompt();
          return;

        case '/history':
          printHistory(messages.slice(1)); // skip system prompt
          rl.prompt();
          return;

        case '/save':
          console.log(colors.muted('\n  Session saved.\n'));
          rl.prompt();
          return;

        case '/exit':
          await shutdown();
          return;

        default:
          console.log(colors.error(`\n  Unknown command: ${cmd}. Type /help for available commands.\n`));
          rl.prompt();
          return;
      }
    }

    // ── Normal message ────────────────────────────────────────────────────
    messages.push({ role: 'user', content: input });

    // Save user message to memory
    const userMsg: ConversationMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    await memoryBackend.saveMessage(agentName, conversationId, userMsg);

    if (hasTools) {
      // ── Tool-enabled flow ──────────────────────────────────────────────
      await handleToolFlow(
        messages,
        llmProvider,
        toolRegistry!,
        toolExecutor!,
        config,
        agentName,
        conversationId,
        memoryBackend,
      );
    } else {
      // ── Standard streaming flow (no tools) ─────────────────────────────
      await handleStreamFlow(
        messages,
        llmProvider,
        config,
        agentName,
        conversationId,
        memoryBackend,
      );
    }

    rl.prompt();
  });
}
