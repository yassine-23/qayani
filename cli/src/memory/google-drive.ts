import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {
  MemoryBackend,
  ConversationMessage,
  ConversationSession,
} from './types.js';

// ── Configuration ────────────────────────────────────────────────────────────

export interface GoogleDriveConfig {
  /** Option 1: Path to a service account JSON key file */
  serviceAccountKeyPath?: string;
  /** Option 2: OAuth2 access token (e.g. from gcloud auth print-access-token) */
  accessToken?: string;
  /** Folder name in Drive to store data (default: 'QAYANI') */
  folderName?: string;
}

// ── Error helpers ────────────────────────────────────────────────────────────

class GoogleDriveAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleDriveAuthError';
  }
}

class GoogleDriveApiError extends Error {
  public status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'GoogleDriveApiError';
    this.status = status;
  }
}

// ── Types for Drive API responses ────────────────────────────────────────────

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
}

interface DriveFileList {
  files: DriveFile[];
  nextPageToken?: string;
}

// ── Resolve config from environment/global config ────────────────────────────

const CONFIG_PATH = path.join(os.homedir(), '.qayani', 'config.json');

function loadGlobalConfig(): Record<string, string | undefined> {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as Record<string, string | undefined>;
  } catch {
    return {};
  }
}

/**
 * Resolves a GoogleDriveConfig from environment variables or global config.
 *
 * Priority:
 *   1. GOOGLE_DRIVE_TOKEN env var
 *   2. 'google-drive-token' in ~/.qayani/config.json
 *
 * Returns null if no token source can be found.
 */
export function resolveGoogleDriveConfig(): GoogleDriveConfig | null {
  // Check env var first
  const envToken = process.env['GOOGLE_DRIVE_TOKEN'];
  if (envToken) {
    return { accessToken: envToken };
  }

  // Check global config file
  const globalConfig = loadGlobalConfig();
  const configToken = globalConfig['google-drive-token'];
  if (configToken) {
    return { accessToken: configToken };
  }

  // Check for service account key path
  const keyPath = process.env['GOOGLE_SERVICE_ACCOUNT_KEY'] ?? globalConfig['google-service-account-key'];
  if (keyPath) {
    return { serviceAccountKeyPath: keyPath };
  }

  return null;
}

/**
 * Tests the Google Drive connection by making a simple API call.
 * Returns true if the token is valid and can access Drive.
 */
export async function testGoogleDriveConnection(config: GoogleDriveConfig): Promise<boolean> {
  try {
    const backend = new GoogleDriveMemoryBackend(config);
    const token = await backend.getAccessToken();

    const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

// ── Google Drive Memory Backend ──────────────────────────────────────────────

/**
 * Google Drive-backed memory backend for the QAYANI CLI agent platform.
 *
 * Storage layout in Google Drive:
 *   {folderName}/
 *   ├── {agentName}/
 *   │   └── memory/
 *   │       ├── {sessionId}.json
 *   │       └── ...
 *
 * Uses Google Drive API v3 via raw fetch() calls.
 */
export class GoogleDriveMemoryBackend implements MemoryBackend {
  private config: GoogleDriveConfig;
  private folderName: string;
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  /** Cache of folder name/parent -> folder ID to avoid repeated lookups */
  private folderIdCache: Map<string, string> = new Map();

  private static readonly DRIVE_API = 'https://www.googleapis.com/drive/v3';
  private static readonly UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
  private static readonly FOLDER_MIME = 'application/vnd.google-apps.folder';

  constructor(config: GoogleDriveConfig) {
    if (!config.accessToken && !config.serviceAccountKeyPath) {
      throw new GoogleDriveAuthError(
        'Google Drive config requires either an accessToken or serviceAccountKeyPath. ' +
          'Set GOOGLE_DRIVE_TOKEN env var or run: qayani config google-drive-token <token>'
      );
    }
    this.config = config;
    this.folderName = config.folderName ?? 'QAYANI';
  }

  // ── Token management ─────────────────────────────────────────────────────

  /**
   * Retrieves a valid access token. For direct access tokens, returns as-is.
   * For service accounts, generates a JWT and exchanges it for an access token.
   */
  async getAccessToken(): Promise<string> {
    if (this.config.accessToken) {
      return this.config.accessToken;
    }

    // Service account flow
    if (this.config.serviceAccountKeyPath) {
      // Return cached token if not expired (with 60s buffer)
      if (this.cachedToken && Date.now() < this.tokenExpiry - 60_000) {
        return this.cachedToken;
      }

      const token = await this.exchangeServiceAccountToken();
      this.cachedToken = token;
      // Google tokens are valid for 3600 seconds
      this.tokenExpiry = Date.now() + 3_500_000;
      return token;
    }

    throw new GoogleDriveAuthError('No authentication method configured.');
  }

  /**
   * Reads the service account JSON key, creates a JWT, and exchanges it for
   * an access token via Google's OAuth2 token endpoint.
   */
  private async exchangeServiceAccountToken(): Promise<string> {
    const keyPath = this.config.serviceAccountKeyPath!;
    let keyData: { client_email: string; private_key: string };

    try {
      const raw = fs.readFileSync(keyPath, 'utf-8');
      keyData = JSON.parse(raw) as { client_email: string; private_key: string };
    } catch (err) {
      throw new GoogleDriveAuthError(
        `Failed to read service account key at "${keyPath}": ${(err as Error).message}`
      );
    }

    if (!keyData.client_email || !keyData.private_key) {
      throw new GoogleDriveAuthError(
        `Service account key at "${keyPath}" is missing client_email or private_key.`
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: keyData.client_email,
      scope: 'https://www.googleapis.com/auth/drive.file',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    // Sign with the private key using Node's crypto
    const { createSign } = await import('crypto');
    const signer = createSign('RSA-SHA256');
    signer.update(signatureInput);
    const signature = signer.sign(keyData.private_key, 'base64url');

    const jwt = `${signatureInput}.${signature}`;

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new GoogleDriveAuthError(
        `Failed to exchange service account JWT for token (${response.status}): ${errorText}`
      );
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  // ── Drive API helpers ────────────────────────────────────────────────────

  /**
   * Makes an authenticated request to the Drive API.
   * Handles 401 with a clear error message.
   */
  private async driveRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getAccessToken();
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      throw new GoogleDriveAuthError(
        'Google Drive access token is expired or invalid. ' +
          'Refresh your token and update it with: qayani config google-drive-token <new-token>\n' +
          'Or set the GOOGLE_DRIVE_TOKEN environment variable.'
      );
    }

    return response;
  }

  /**
   * Finds a folder by name within a parent folder.
   * Returns the folder ID or null if not found.
   */
  private async findFolder(name: string, parentId?: string): Promise<string | null> {
    const cacheKey = `${parentId ?? 'root'}/${name}`;
    const cached = this.folderIdCache.get(cacheKey);
    if (cached) return cached;

    const parentClause = parentId ? `'${parentId}' in parents and ` : '';
    const query = `${parentClause}name='${name}' and mimeType='${GoogleDriveMemoryBackend.FOLDER_MIME}' and trashed=false`;

    const url = new URL(`${GoogleDriveMemoryBackend.DRIVE_API}/files`);
    url.searchParams.set('q', query);
    url.searchParams.set('fields', 'files(id,name)');
    url.searchParams.set('spaces', 'drive');

    const response = await this.driveRequest(url.toString());
    if (!response.ok) {
      const text = await response.text();
      throw new GoogleDriveApiError(
        `Failed to search for folder "${name}": ${text}`,
        response.status
      );
    }

    const data = (await response.json()) as DriveFileList;
    if (data.files.length > 0) {
      const folderId = data.files[0].id;
      this.folderIdCache.set(cacheKey, folderId);
      return folderId;
    }

    return null;
  }

  /**
   * Creates a folder in Google Drive.
   */
  private async createFolder(name: string, parentId?: string): Promise<string> {
    const metadata: Record<string, unknown> = {
      name,
      mimeType: GoogleDriveMemoryBackend.FOLDER_MIME,
    };
    if (parentId) {
      metadata.parents = [parentId];
    }

    const response = await this.driveRequest(
      `${GoogleDriveMemoryBackend.DRIVE_API}/files`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new GoogleDriveApiError(
        `Failed to create folder "${name}": ${text}`,
        response.status
      );
    }

    const data = (await response.json()) as DriveFile;
    const cacheKey = `${parentId ?? 'root'}/${name}`;
    this.folderIdCache.set(cacheKey, data.id);
    return data.id;
  }

  /**
   * Finds or creates a folder. Returns the folder ID.
   */
  private async ensureFolder(name: string, parentId?: string): Promise<string> {
    const existing = await this.findFolder(name, parentId);
    if (existing) return existing;
    return this.createFolder(name, parentId);
  }

  /**
   * Ensures the full folder path exists:
   *   {folderName} / {agentName} / memory
   * Returns the ID of the 'memory' folder.
   */
  private async ensureMemoryFolder(agentName: string): Promise<string> {
    const rootId = await this.ensureFolder(this.folderName);
    const agentId = await this.ensureFolder(agentName, rootId);
    const memoryId = await this.ensureFolder('memory', agentId);
    return memoryId;
  }

  /**
   * Finds a file by name within a parent folder.
   * Returns the file metadata or null.
   */
  private async findFile(name: string, parentId: string): Promise<DriveFile | null> {
    const query = `'${parentId}' in parents and name='${name}' and trashed=false`;

    const url = new URL(`${GoogleDriveMemoryBackend.DRIVE_API}/files`);
    url.searchParams.set('q', query);
    url.searchParams.set('fields', 'files(id,name,mimeType,createdTime,modifiedTime)');
    url.searchParams.set('spaces', 'drive');

    const response = await this.driveRequest(url.toString());
    if (!response.ok) {
      if (response.status === 404) return null;
      const text = await response.text();
      throw new GoogleDriveApiError(
        `Failed to search for file "${name}": ${text}`,
        response.status
      );
    }

    const data = (await response.json()) as DriveFileList;
    return data.files.length > 0 ? data.files[0] : null;
  }

  /**
   * Lists all files in a folder.
   */
  private async listFiles(parentId: string): Promise<DriveFile[]> {
    const allFiles: DriveFile[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(`${GoogleDriveMemoryBackend.DRIVE_API}/files`);
      url.searchParams.set('q', `'${parentId}' in parents and trashed=false`);
      url.searchParams.set('fields', 'nextPageToken,files(id,name,mimeType,createdTime,modifiedTime)');
      url.searchParams.set('spaces', 'drive');
      url.searchParams.set('pageSize', '1000');
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      const response = await this.driveRequest(url.toString());
      if (!response.ok) {
        if (response.status === 404) return [];
        const text = await response.text();
        throw new GoogleDriveApiError(
          `Failed to list files: ${text}`,
          response.status
        );
      }

      const data = (await response.json()) as DriveFileList;
      allFiles.push(...data.files);
      pageToken = data.nextPageToken;
    } while (pageToken);

    return allFiles;
  }

  /**
   * Reads the content of a file as text.
   */
  private async readFileContent(fileId: string): Promise<string> {
    const url = `${GoogleDriveMemoryBackend.DRIVE_API}/files/${fileId}?alt=media`;
    const response = await this.driveRequest(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new GoogleDriveApiError(`File not found: ${fileId}`, 404);
      }
      const text = await response.text();
      throw new GoogleDriveApiError(
        `Failed to read file ${fileId}: ${text}`,
        response.status
      );
    }

    return response.text();
  }

  /**
   * Creates a new JSON file in the specified parent folder.
   */
  private async createFile(
    name: string,
    parentId: string,
    content: string
  ): Promise<string> {
    const metadata = {
      name,
      parents: [parentId],
      mimeType: 'application/json',
    };

    // Use multipart upload
    const boundary = '---qayani-boundary-' + Date.now();
    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${content}\r\n` +
      `--${boundary}--`;

    const response = await this.driveRequest(
      `${GoogleDriveMemoryBackend.UPLOAD_API}/files?uploadType=multipart&fields=id`,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new GoogleDriveApiError(
        `Failed to create file "${name}": ${text}`,
        response.status
      );
    }

    const data = (await response.json()) as DriveFile;
    return data.id;
  }

  /**
   * Updates an existing file's content.
   */
  private async updateFile(fileId: string, content: string): Promise<void> {
    const response = await this.driveRequest(
      `${GoogleDriveMemoryBackend.UPLOAD_API}/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: content,
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new GoogleDriveApiError(
        `Failed to update file ${fileId}: ${text}`,
        response.status
      );
    }
  }

  /**
   * Deletes a file by ID.
   */
  private async deleteFile(fileId: string): Promise<void> {
    const response = await this.driveRequest(
      `${GoogleDriveMemoryBackend.DRIVE_API}/files/${fileId}`,
      { method: 'DELETE' }
    );

    if (!response.ok && response.status !== 404) {
      const text = await response.text();
      throw new GoogleDriveApiError(
        `Failed to delete file ${fileId}: ${text}`,
        response.status
      );
    }
  }

  // ── MemoryBackend interface implementation ───────────────────────────────

  /**
   * Returns a virtual path string representing the agent's storage location.
   */
  getAgentDir(agentName: string): string {
    return `gdrive://${this.folderName}/${agentName}`;
  }

  /**
   * Appends a message to a conversation session.
   * Creates the session file if it does not exist.
   */
  async saveMessage(
    agentName: string,
    sessionId: string,
    message: ConversationMessage
  ): Promise<void> {
    const memoryFolderId = await this.ensureMemoryFolder(agentName);
    const fileName = `${sanitizeFileName(sessionId)}.json`;
    const now = new Date().toISOString();

    const existingFile = await this.findFile(fileName, memoryFolderId);

    let session: ConversationSession;

    if (existingFile) {
      // Read existing session, append message
      const content = await this.readFileContent(existingFile.id);
      try {
        session = JSON.parse(content) as ConversationSession;
      } catch {
        // If file is corrupted, start fresh
        session = {
          id: sessionId,
          agentName,
          messages: [],
          createdAt: now,
          updatedAt: now,
        };
      }
      session.messages.push(message);
      session.updatedAt = now;
      await this.updateFile(existingFile.id, JSON.stringify(session, null, 2));
    } else {
      // Create new session
      session = {
        id: sessionId,
        agentName,
        messages: [message],
        createdAt: now,
        updatedAt: now,
      };
      await this.createFile(fileName, memoryFolderId, JSON.stringify(session, null, 2));
    }
  }

  /**
   * Returns the full message history for a conversation session.
   * Returns an empty array if the session does not exist.
   */
  async getHistory(
    agentName: string,
    sessionId: string
  ): Promise<ConversationMessage[]> {
    const memoryFolderId = await this.getMemoryFolderId(agentName);
    if (!memoryFolderId) return [];

    const fileName = `${sanitizeFileName(sessionId)}.json`;
    const file = await this.findFile(fileName, memoryFolderId);
    if (!file) return [];

    const content = await this.readFileContent(file.id);
    try {
      const session = JSON.parse(content) as ConversationSession;
      return session.messages;
    } catch {
      return [];
    }
  }

  /**
   * Lists all conversation sessions for a given agent, sorted by updatedAt
   * descending (most recent first).
   */
  async listSessions(agentName: string): Promise<ConversationSession[]> {
    const memoryFolderId = await this.getMemoryFolderId(agentName);
    if (!memoryFolderId) return [];

    const files = await this.listFiles(memoryFolderId);
    const jsonFiles = files.filter((f) => f.name.endsWith('.json'));

    const sessions: ConversationSession[] = [];

    for (const file of jsonFiles) {
      try {
        const content = await this.readFileContent(file.id);
        const session = JSON.parse(content) as ConversationSession;
        sessions.push(session);
      } catch {
        // Skip corrupted files
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
   * Deletes a conversation session file.
   * No-op if the session does not exist.
   */
  async deleteSession(agentName: string, sessionId: string): Promise<void> {
    const memoryFolderId = await this.getMemoryFolderId(agentName);
    if (!memoryFolderId) return;

    const fileName = `${sanitizeFileName(sessionId)}.json`;
    const file = await this.findFile(fileName, memoryFolderId);
    if (!file) return;

    await this.deleteFile(file.id);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Gets the memory folder ID without creating it.
   * Returns null if the folder path does not exist.
   */
  private async getMemoryFolderId(agentName: string): Promise<string | null> {
    const rootId = await this.findFolder(this.folderName);
    if (!rootId) return null;

    const agentId = await this.findFolder(agentName, rootId);
    if (!agentId) return null;

    const memoryId = await this.findFolder('memory', agentId);
    return memoryId;
  }
}

// ── Utility functions ────────────────────────────────────────────────────────

/**
 * Sanitizes a session ID for use as a file name.
 * Removes characters that are not alphanumeric, hyphens, or underscores.
 */
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Base64url encodes a string (no padding).
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export default GoogleDriveMemoryBackend;
