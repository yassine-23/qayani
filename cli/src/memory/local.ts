import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type {
  MemoryBackend,
  ConversationMessage,
  ConversationSession,
} from './types.js';

const BASE_DIR = path.join(os.homedir(), '.qayani', 'agents');

/**
 * File-based memory backend.
 *
 * Storage layout:
 *   ~/.qayani/agents/{agentName}/memory/{sessionId}.json
 *
 * Each session file contains a full ConversationSession JSON object.
 */
export class LocalMemoryBackend implements MemoryBackend {
  /**
   * Returns the base directory for a given agent's data.
   */
  getAgentDir(agentName: string): string {
    return path.join(BASE_DIR, agentName);
  }

  /**
   * Returns the memory directory for a given agent.
   */
  private getMemoryDir(agentName: string): string {
    return path.join(this.getAgentDir(agentName), 'memory');
  }

  /**
   * Returns the file path for a specific session.
   */
  private getSessionPath(agentName: string, sessionId: string): string {
    // Sanitize sessionId to prevent directory traversal
    const safeId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.getMemoryDir(agentName), `${safeId}.json`);
  }

  /**
   * Ensures the memory directory for an agent exists, creating it recursively
   * if necessary.
   */
  private async ensureMemoryDir(agentName: string): Promise<void> {
    const dir = this.getMemoryDir(agentName);
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * Reads a session file from disk. Returns null if the file does not exist.
   */
  private async readSession(
    agentName: string,
    sessionId: string
  ): Promise<ConversationSession | null> {
    const filePath = this.getSessionPath(agentName, sessionId);

    let raw: string;
    try {
      raw = await fs.readFile(filePath, 'utf-8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw new Error(
        `Failed to read session file at ${filePath}: ${(err as Error).message}`
      );
    }

    try {
      const session = JSON.parse(raw) as ConversationSession;
      return session;
    } catch (err) {
      throw new Error(
        `Corrupted session file at ${filePath}: ${(err as Error).message}`
      );
    }
  }

  /**
   * Writes a session object to disk as JSON.
   */
  private async writeSession(
    agentName: string,
    session: ConversationSession
  ): Promise<void> {
    await this.ensureMemoryDir(agentName);
    const filePath = this.getSessionPath(agentName, session.id);
    const data = JSON.stringify(session, null, 2);
    await fs.writeFile(filePath, data, 'utf-8');
  }

  /**
   * Appends a message to a conversation session. Creates the session if it
   * does not exist yet.
   */
  async saveMessage(
    agentName: string,
    sessionId: string,
    message: ConversationMessage
  ): Promise<void> {
    const now = new Date().toISOString();
    let session = await this.readSession(agentName, sessionId);

    if (session) {
      session.messages.push(message);
      session.updatedAt = now;
    } else {
      session = {
        id: sessionId,
        agentName,
        messages: [message],
        createdAt: now,
        updatedAt: now,
      };
    }

    await this.writeSession(agentName, session);
  }

  /**
   * Returns the full message history for a conversation session.
   * Returns an empty array if the session does not exist.
   */
  async getHistory(
    agentName: string,
    sessionId: string
  ): Promise<ConversationMessage[]> {
    const session = await this.readSession(agentName, sessionId);
    return session?.messages ?? [];
  }

  /**
   * Lists all conversation sessions for a given agent, sorted by updatedAt
   * descending (most recent first).
   */
  async listSessions(agentName: string): Promise<ConversationSession[]> {
    const memoryDir = this.getMemoryDir(agentName);

    let entries: string[];
    try {
      entries = await fs.readdir(memoryDir);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw new Error(
        `Failed to list sessions in ${memoryDir}: ${(err as Error).message}`
      );
    }

    const jsonFiles = entries.filter((entry) => entry.endsWith('.json'));
    const sessions: ConversationSession[] = [];

    for (const file of jsonFiles) {
      const filePath = path.join(memoryDir, file);
      try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const session = JSON.parse(raw) as ConversationSession;
        sessions.push(session);
      } catch {
        // Skip corrupted files rather than failing the entire listing
        continue;
      }
    }

    // Sort by updatedAt descending
    sessions.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });

    return sessions;
  }

  /**
   * Deletes a conversation session file from disk.
   * No-op if the session does not exist.
   */
  async deleteSession(agentName: string, sessionId: string): Promise<void> {
    const filePath = this.getSessionPath(agentName, sessionId);

    try {
      await fs.unlink(filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        // Already deleted or never existed -- not an error
        return;
      }
      throw new Error(
        `Failed to delete session at ${filePath}: ${(err as Error).message}`
      );
    }
  }
}
