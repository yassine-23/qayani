/**
 * WhatsApp tool for the QAYANI CLI agent platform.
 *
 * Sends WhatsApp messages via the Twilio API.
 */

import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import type { Tool } from '../types.js';

// ── Configuration ────────────────────────────────────────────────────────────

export interface WhatsAppConfig {
  accountSid: string;   // TWILIO_ACCOUNT_SID
  authToken: string;    // TWILIO_AUTH_TOKEN
  fromNumber: string;   // TWILIO_WHATSAPP_FROM (e.g. whatsapp:+14155238886)
}

/**
 * Resolve WhatsApp / Twilio configuration from environment variables or global config file.
 * Returns null if essential settings are not configured.
 */
export async function resolveWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  // 1. Try environment variables first
  const envSid = process.env.TWILIO_ACCOUNT_SID;
  const envToken = process.env.TWILIO_AUTH_TOKEN;
  const envFrom = process.env.TWILIO_WHATSAPP_FROM;

  if (envSid && envToken && envFrom) {
    return {
      accountSid: envSid,
      authToken: envToken,
      fromNumber: envFrom,
    };
  }

  // 2. Try global config file ~/.qayani/config.json
  try {
    const configPath = join(homedir(), '.qayani', 'config.json');
    const raw = await readFile(configPath, 'utf-8');
    const config = JSON.parse(raw) as Record<string, unknown>;

    const sid = config['twilio-account-sid'] as string | undefined;
    const token = config['twilio-auth-token'] as string | undefined;
    const from = config['twilio-whatsapp-from'] as string | undefined;

    if (sid && token && from) {
      return {
        accountSid: sid,
        authToken: token,
        fromNumber: from,
      };
    }
  } catch {
    // Config file doesn't exist or is malformed -- that's fine
  }

  return null;
}

// ── Tool factory ─────────────────────────────────────────────────────────────

/**
 * Create a WhatsApp message sending tool with the given Twilio configuration.
 */
export function createWhatsAppTool(config: WhatsAppConfig): Tool {
  const definition = {
    name: 'send_whatsapp',
    description: 'Send a WhatsApp message via Twilio.',
    parameters: {
      to: {
        type: 'string' as const,
        description: 'Recipient phone number (e.g. +1234567890). The whatsapp: prefix is added automatically.',
        required: true,
      },
      message: {
        type: 'string' as const,
        description: 'The message text to send.',
        required: true,
      },
    },
  };

  return {
    definition,
    async execute(args: Record<string, unknown>): Promise<string> {
      const to = args.to as string | undefined;
      const message = args.message as string | undefined;

      if (!to || !message) {
        return 'Error: "to" and "message" are required parameters.';
      }

      try {
        // Ensure the "to" number has the whatsapp: prefix
        const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

        // Ensure the "from" number has the whatsapp: prefix
        const fromNumber = config.fromNumber.startsWith('whatsapp:')
          ? config.fromNumber
          : `whatsapp:${config.fromNumber}`;

        // Build form-encoded body
        const body = new URLSearchParams({
          From: fromNumber,
          To: toNumber,
          Body: message,
        });

        // Basic auth: base64(accountSid:authToken)
        const credentials = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

        const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });

        const data = (await response.json()) as {
          sid?: string;
          status?: string;
          message?: string;
          code?: number;
        };

        if (!response.ok) {
          return `Twilio API error (${response.status}): ${data.message || 'Unknown error'}`;
        }

        return `WhatsApp message sent successfully. Message SID: ${data.sid}`;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return `Error sending WhatsApp message: ${msg}`;
      }
    },
  };
}
