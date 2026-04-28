/**
 * Telegram bot tool for the QAYANI CLI agent platform.
 *
 * Sends messages via the Telegram Bot API and supports long-polling
 * to receive incoming messages.
 */

import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import type { Tool } from '../types.js';

// ── Configuration ────────────────────────────────────────────────────────────

export interface TelegramConfig {
  botToken: string;
  defaultChatId?: string;
}

/**
 * Resolve Telegram configuration from environment variables or global config file.
 * Returns null if the bot token is not configured.
 */
export async function resolveTelegramConfig(): Promise<TelegramConfig | null> {
  // 1. Try environment variables
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  const envChatId = process.env.TELEGRAM_CHAT_ID;

  if (envToken) {
    return {
      botToken: envToken,
      defaultChatId: envChatId || undefined,
    };
  }

  // 2. Try global config file ~/.qayani/config.json
  try {
    const configPath = join(homedir(), '.qayani', 'config.json');
    const raw = await readFile(configPath, 'utf-8');
    const config = JSON.parse(raw) as Record<string, unknown>;

    const token = config['telegram-bot-token'] as string | undefined;
    const chatId = config['telegram-chat-id'] as string | undefined;

    if (token) {
      return {
        botToken: token,
        defaultChatId: chatId || undefined,
      };
    }
  } catch {
    // Config file doesn't exist or is malformed
  }

  return null;
}

// ── Tool factory ─────────────────────────────────────────────────────────────

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

/**
 * Create a Telegram message sending tool with the given bot configuration.
 */
export function createTelegramTool(config: TelegramConfig): Tool {
  const definition = {
    name: 'send_telegram',
    description: 'Send a message via Telegram bot.',
    parameters: {
      message: {
        type: 'string' as const,
        description: 'The message text to send.',
        required: true,
      },
      chat_id: {
        type: 'string' as const,
        description: 'Target chat ID. Uses the configured default if not provided.',
        required: false,
      },
      parse_mode: {
        type: 'string' as const,
        description: 'Message formatting mode.',
        required: false,
        enum: ['HTML', 'Markdown', 'MarkdownV2'],
      },
    },
  };

  return {
    definition,
    async execute(args: Record<string, unknown>): Promise<string> {
      const message = args.message as string | undefined;
      const chatId = (args.chat_id as string | undefined) || config.defaultChatId;
      const parseMode = args.parse_mode as string | undefined;

      if (!message) {
        return 'Error: "message" is a required parameter.';
      }

      if (!chatId) {
        return 'Error: No chat_id provided and no default chat ID configured.';
      }

      try {
        const url = `${TELEGRAM_API_BASE}${config.botToken}/sendMessage`;
        const payload: Record<string, string> = {
          chat_id: chatId,
          text: message,
        };

        if (parseMode) {
          payload.parse_mode = parseMode;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = (await response.json()) as {
          ok: boolean;
          result?: { message_id: number };
          description?: string;
        };

        if (!data.ok) {
          return `Telegram API error: ${data.description || 'Unknown error'}`;
        }

        return `Message sent successfully. Message ID: ${data.result?.message_id}`;
      } catch (error: unknown) {
        const message_ = error instanceof Error ? error.message : String(error);
        return `Error sending Telegram message: ${message_}`;
      }
    },
  };
}

// ── Long-polling listener ────────────────────────────────────────────────────

export interface IncomingMessage {
  chatId: string;
  text: string;
  from: string;
}

/**
 * Start long-polling to receive incoming messages from the Telegram Bot API.
 * Returns a stop() function to terminate polling.
 *
 * @param config      Telegram bot configuration.
 * @param onMessage   Callback invoked for each incoming text message.
 */
export function createTelegramListener(
  config: TelegramConfig,
  onMessage: (msg: IncomingMessage) => void,
): { stop: () => void } {
  let running = true;
  let offset = 0;

  const poll = async (): Promise<void> => {
    while (running) {
      try {
        const url = `${TELEGRAM_API_BASE}${config.botToken}/getUpdates?offset=${offset}&timeout=30`;
        const response = await fetch(url);
        const data = (await response.json()) as {
          ok: boolean;
          result?: Array<{
            update_id: number;
            message?: {
              chat: { id: number };
              from?: { first_name?: string; username?: string };
              text?: string;
            };
          }>;
        };

        if (!data.ok || !data.result) {
          // Wait a bit before retrying on error
          await delay(5000);
          continue;
        }

        for (const update of data.result) {
          offset = update.update_id + 1;

          if (update.message?.text) {
            const from =
              update.message.from?.username ||
              update.message.from?.first_name ||
              'unknown';

            onMessage({
              chatId: String(update.message.chat.id),
              text: update.message.text,
              from,
            });
          }
        }
      } catch {
        // Network error — wait before retrying
        if (running) {
          await delay(5000);
        }
      }
    }
  };

  // Start polling in the background (non-blocking)
  poll();

  return {
    stop() {
      running = false;
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
