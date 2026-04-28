export type DeployTarget = 'vercel' | 'docker' | 'standalone';

export interface DeployConfig {
  target: DeployTarget;
  name: string;
  port?: number;           // default 3000
  env?: Record<string, string>;  // env vars to include
  agentPath: string;       // path to AGENT.md
}

export interface DeployResult {
  success: boolean;
  url?: string;            // deployed URL
  containerId?: string;    // Docker container ID
  outputDir?: string;      // generated files directory
  message: string;
}
