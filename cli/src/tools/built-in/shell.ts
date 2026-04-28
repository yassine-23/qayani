/**
 * Shell command execution tool for the QAYANI CLI agent platform.
 *
 * Executes arbitrary shell commands via child_process.exec.
 */

import { exec } from 'child_process';
import type { Tool } from '../types.js';

// ── Constants ────────────────────────────────────────────────────────────────

/** Maximum output size returned to the LLM (10 KB). */
const MAX_OUTPUT_SIZE = 10 * 1024;

/** Default command timeout in milliseconds (30 seconds). */
const DEFAULT_TIMEOUT = 30_000;

// ── Tool factory ─────────────────────────────────────────────────────────────

/**
 * Create a shell command execution tool.
 */
export function createShellTool(): Tool {
  const definition = {
    name: 'shell_exec',
    description:
      'Execute a shell command and return its output. WARNING: This tool executes arbitrary commands on the host system. Use with caution — malicious or incorrect commands can cause data loss or system damage.',
    parameters: {
      command: {
        type: 'string' as const,
        description: 'The shell command to execute.',
        required: true,
      },
      timeout: {
        type: 'number' as const,
        description: 'Command timeout in milliseconds (default: 30000).',
        required: false,
      },
    },
  };

  return {
    definition,
    async execute(args: Record<string, unknown>): Promise<string> {
      const command = args.command as string | undefined;
      const timeout = (args.timeout as number | undefined) || DEFAULT_TIMEOUT;

      if (!command) {
        return 'Error: "command" is a required parameter.';
      }

      try {
        const result = await execCommand(command, timeout);
        return truncateOutput(result);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return truncateOutput(`Error executing command: ${message}`);
      }
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Execute a shell command and return combined stdout + stderr.
 */
function execCommand(command: string, timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      command,
      {
        timeout,
        maxBuffer: MAX_OUTPUT_SIZE * 2, // Allow some room before truncation
        shell: process.env.SHELL || '/bin/sh',
      },
      (error, stdout, stderr) => {
        if (error && !stdout && !stderr) {
          // Command failed entirely (e.g., command not found, timeout)
          reject(error);
          return;
        }

        // Combine stdout and stderr, noting the exit code if non-zero
        let output = '';
        if (stdout) {
          output += stdout;
        }
        if (stderr) {
          output += output ? '\n--- stderr ---\n' : '';
          output += stderr;
        }
        if (error?.code) {
          output += `\n[Exit code: ${error.code}]`;
        }

        resolve(output || '(no output)');
      },
    );
  });
}

/**
 * Truncate output to MAX_OUTPUT_SIZE, appending a truncation notice if needed.
 */
function truncateOutput(output: string): string {
  if (output.length <= MAX_OUTPUT_SIZE) {
    return output;
  }
  const truncated = output.slice(0, MAX_OUTPUT_SIZE);
  return `${truncated}\n\n[Output truncated at ${MAX_OUTPUT_SIZE / 1024}KB]`;
}
