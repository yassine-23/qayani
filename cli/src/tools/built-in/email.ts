/**
 * Email tool for the QAYANI CLI agent platform.
 *
 * Sends emails via SMTP using the nodemailer package.
 */

import nodemailer from 'nodemailer';
import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import type { Tool } from '../types.js';

// ── Configuration ────────────────────────────────────────────────────────────

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromAddress: string;
}

/**
 * Resolve email configuration from environment variables or global config file.
 * Returns null if essential SMTP settings are not configured.
 */
export async function resolveEmailConfig(): Promise<EmailConfig | null> {
  // 1. Try environment variables first
  const envHost = process.env.SMTP_HOST;
  const envPort = process.env.SMTP_PORT;
  const envUser = process.env.SMTP_USER;
  const envPass = process.env.SMTP_PASS;
  const envFrom = process.env.SMTP_FROM;

  if (envHost && envUser && envPass) {
    return {
      smtpHost: envHost,
      smtpPort: envPort ? parseInt(envPort, 10) : 587,
      smtpUser: envUser,
      smtpPass: envPass,
      fromAddress: envFrom || envUser,
    };
  }

  // 2. Try global config file ~/.qayani/config.json
  try {
    const configPath = join(homedir(), '.qayani', 'config.json');
    const raw = await readFile(configPath, 'utf-8');
    const config = JSON.parse(raw) as Record<string, unknown>;

    const host = config['smtp-host'] as string | undefined;
    const port = config['smtp-port'] as string | number | undefined;
    const user = config['smtp-user'] as string | undefined;
    const pass = config['smtp-pass'] as string | undefined;
    const from = config['smtp-from'] as string | undefined;

    if (host && user && pass) {
      return {
        smtpHost: host,
        smtpPort: port ? (typeof port === 'number' ? port : parseInt(port, 10)) : 587,
        smtpUser: user,
        smtpPass: pass,
        fromAddress: from || user,
      };
    }
  } catch {
    // Config file doesn't exist or is malformed — that's fine
  }

  return null;
}

// ── Tool factory ─────────────────────────────────────────────────────────────

/**
 * Create an email sending tool with the given SMTP configuration.
 */
export function createEmailTool(config: EmailConfig): Tool {
  const definition = {
    name: 'send_email',
    description: 'Send an email to a recipient via SMTP.',
    parameters: {
      to: {
        type: 'string' as const,
        description: 'Recipient email address.',
        required: true,
      },
      subject: {
        type: 'string' as const,
        description: 'Email subject line.',
        required: true,
      },
      body: {
        type: 'string' as const,
        description: 'Email body content (plain text or HTML if html=true).',
        required: true,
      },
      cc: {
        type: 'string' as const,
        description: 'CC recipient email address (optional).',
        required: false,
      },
      html: {
        type: 'boolean' as const,
        description: 'Whether the body is HTML content. Defaults to false (plain text).',
        required: false,
      },
    },
  };

  return {
    definition,
    async execute(args: Record<string, unknown>): Promise<string> {
      const to = args.to as string | undefined;
      const subject = args.subject as string | undefined;
      const body = args.body as string | undefined;
      const cc = args.cc as string | undefined;
      const isHtml = args.html as boolean | undefined;

      if (!to || !subject || !body) {
        return 'Error: "to", "subject", and "body" are required parameters.';
      }

      try {
        const transport = nodemailer.createTransport({
          host: config.smtpHost,
          port: config.smtpPort,
          secure: config.smtpPort === 465,
          auth: {
            user: config.smtpUser,
            pass: config.smtpPass,
          },
        });

        const mailOptions: nodemailer.SendMailOptions = {
          from: config.fromAddress,
          to,
          subject,
          ...(cc ? { cc } : {}),
          ...(isHtml ? { html: body } : { text: body }),
        };

        const info = await transport.sendMail(mailOptions);
        return `Email sent successfully. Message ID: ${info.messageId}`;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return `Error sending email: ${message}`;
      }
    },
  };
}
