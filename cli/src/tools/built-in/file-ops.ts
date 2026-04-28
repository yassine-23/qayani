/**
 * File operation tools for the QAYANI CLI agent platform.
 *
 * Provides file reading and writing capabilities using Node.js fs/promises.
 */

import { readFile, writeFile, appendFile, mkdir, stat } from 'fs/promises';
import { dirname, resolve } from 'path';
import type { Tool } from '../types.js';

// ── Constants ────────────────────────────────────────────────────────────────

/** Maximum file size to read (50 KB) to avoid flooding the LLM context. */
const MAX_READ_SIZE = 50 * 1024;

// ── File Read Tool ───────────────────────────────────────────────────────────

/**
 * Create a file reading tool.
 */
export function createFileReadTool(): Tool {
  const definition = {
    name: 'file_read',
    description: 'Read the contents of a file. Limited to 50KB to avoid context overflow.',
    parameters: {
      path: {
        type: 'string' as const,
        description: 'Absolute or relative path to the file to read.',
        required: true,
      },
      encoding: {
        type: 'string' as const,
        description: 'File encoding (default: utf-8).',
        required: false,
      },
    },
  };

  return {
    definition,
    async execute(args: Record<string, unknown>): Promise<string> {
      const filePath = args.path as string | undefined;
      const encoding = (args.encoding as BufferEncoding | undefined) || 'utf-8';

      if (!filePath) {
        return 'Error: "path" is a required parameter.';
      }

      try {
        const resolvedPath = resolve(filePath);

        // Check file size before reading
        const fileStat = await stat(resolvedPath);
        if (fileStat.size > MAX_READ_SIZE) {
          return `Error: File is ${(fileStat.size / 1024).toFixed(1)}KB, which exceeds the 50KB limit. Consider reading a smaller file or a specific section.`;
        }

        const content = await readFile(resolvedPath, encoding);
        return content;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('ENOENT')) {
          return `Error: File not found: ${filePath}`;
        }
        if (message.includes('EACCES')) {
          return `Error: Permission denied: ${filePath}`;
        }
        return `Error reading file: ${message}`;
      }
    },
  };
}

// ── File Write Tool ──────────────────────────────────────────────────────────

/**
 * Create a file writing tool.
 */
export function createFileWriteTool(): Tool {
  const definition = {
    name: 'file_write',
    description: 'Write content to a file. Creates parent directories if they do not exist.',
    parameters: {
      path: {
        type: 'string' as const,
        description: 'Absolute or relative path to the file to write.',
        required: true,
      },
      content: {
        type: 'string' as const,
        description: 'The content to write to the file.',
        required: true,
      },
      append: {
        type: 'boolean' as const,
        description: 'If true, append to the file instead of overwriting. Defaults to false.',
        required: false,
      },
    },
  };

  return {
    definition,
    async execute(args: Record<string, unknown>): Promise<string> {
      const filePath = args.path as string | undefined;
      const content = args.content as string | undefined;
      const append = args.append as boolean | undefined;

      if (!filePath) {
        return 'Error: "path" is a required parameter.';
      }
      if (content === undefined || content === null) {
        return 'Error: "content" is a required parameter.';
      }

      try {
        const resolvedPath = resolve(filePath);

        // Ensure parent directories exist
        const dir = dirname(resolvedPath);
        await mkdir(dir, { recursive: true });

        if (append) {
          await appendFile(resolvedPath, content, 'utf-8');
          return `Content appended to ${resolvedPath}`;
        } else {
          await writeFile(resolvedPath, content, 'utf-8');
          return `File written successfully: ${resolvedPath}`;
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('EACCES')) {
          return `Error: Permission denied: ${filePath}`;
        }
        return `Error writing file: ${message}`;
      }
    },
  };
}
