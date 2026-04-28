import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { theme } from '../ui/theme.js';
import { handleError, QayaniError } from '../utils/errors.js';
import { parseAgentFile, findAgentFile } from '../agent/loader.js';
import { generateStandaloneServer } from '../deploy/generators/standalone.js';
import { generateDockerfile, generateDockerCompose } from '../deploy/generators/docker.js';
import { generateVercelProject } from '../deploy/generators/vercel.js';
import type { DeployTarget, DeployConfig } from '../deploy/types.js';

const VALID_TARGETS: DeployTarget[] = ['standalone', 'docker', 'vercel'];

export function registerDeploy(program: Command): void {
  program
    .command('deploy [name]')
    .description('Deploy an agent as a standalone server, Docker container, or Vercel project')
    .option('-t, --target <target>', 'Deploy target (standalone, docker, vercel)', 'standalone')
    .option('-p, --port <port>', 'Port number', '3000')
    .option('-o, --output <dir>', 'Output directory', './deploy')
    .action(
      async (
        name: string | undefined,
        opts: { target: string; port: string; output: string },
      ) => {
        try {
          // ── Validate target ──────────────────────────────────────────────
          const target = opts.target.toLowerCase() as DeployTarget;
          if (!VALID_TARGETS.includes(target)) {
            throw new QayaniError(
              `Invalid deploy target: "${opts.target}"`,
              'INVALID_TARGET',
              `Supported targets: ${VALID_TARGETS.join(', ')}`,
            );
          }

          const port = parseInt(opts.port, 10);
          if (isNaN(port) || port < 1 || port > 65535) {
            throw new QayaniError(
              `Invalid port: "${opts.port}"`,
              'INVALID_PORT',
              'Port must be a number between 1 and 65535.',
            );
          }

          // ── Find the AGENT.md file ───────────────────────────────────────
          let agentFilePath: string | null = null;

          if (name) {
            const candidate = path.resolve(process.cwd(), name, 'AGENT.md');
            if (fs.existsSync(candidate)) {
              agentFilePath = candidate;
            } else {
              agentFilePath = findAgentFile(path.resolve(process.cwd(), name));
            }
          } else {
            agentFilePath = findAgentFile();
          }

          if (!agentFilePath) {
            console.error(theme.error('\n  No AGENT.md found.\n'));
            console.log(theme.dim('  Create one with: qayani init <name>\n'));
            process.exit(1);
          }

          // ── Parse agent config ───────────────────────────────────────────
          const { systemPrompt, ...agentConfig } = await parseAgentFile(agentFilePath);

          const deployConfig: DeployConfig = {
            target,
            name: agentConfig.name,
            port,
            agentPath: agentFilePath,
          };

          // ── Resolve output directory ─────────────────────────────────────
          const outputDir = path.resolve(process.cwd(), opts.output);

          console.log('');
          console.log(theme.brand('  QAYANI Deploy'));
          console.log('');
          console.log(`  ${theme.bold('Agent:')}   ${agentConfig.name}`);
          console.log(`  ${theme.bold('Target:')}  ${target}`);
          console.log(`  ${theme.bold('Port:')}    ${port}`);
          console.log(`  ${theme.bold('Output:')}  ${outputDir}`);
          console.log('');

          // ── Generate files based on target ───────────────────────────────
          fs.mkdirSync(outputDir, { recursive: true });

          switch (target) {
            case 'standalone':
              generateStandaloneTarget(outputDir, agentConfig, systemPrompt, port);
              break;
            case 'docker':
              generateDockerTarget(outputDir, deployConfig, agentConfig, systemPrompt, port);
              break;
            case 'vercel':
              generateVercelTarget(outputDir, agentConfig, systemPrompt);
              break;
          }

          console.log(theme.success('  Files generated successfully.'));
          console.log('');

          // ── Print run instructions ───────────────────────────────────────
          printInstructions(target, outputDir, agentConfig.name, port);
        } catch (err) {
          handleError(err);
        }
      },
    );
}

// ── Target generators ────────────────────────────────────────────────────────

function generateStandaloneTarget(
  outputDir: string,
  agentConfig: import('../agent/types.js').AgentConfig,
  systemPrompt: string,
  port: number,
): void {
  const serverCode = generateStandaloneServer(agentConfig, systemPrompt);
  const serverPath = path.join(outputDir, 'server.mjs');
  fs.writeFileSync(serverPath, serverCode, 'utf-8');
  console.log(`  ${theme.dim('wrote')} server.mjs`);
}

function generateDockerTarget(
  outputDir: string,
  deployConfig: DeployConfig,
  agentConfig: import('../agent/types.js').AgentConfig,
  systemPrompt: string,
  port: number,
): void {
  // Generate server.mjs first (needed by Docker)
  const serverCode = generateStandaloneServer(agentConfig, systemPrompt);
  fs.writeFileSync(path.join(outputDir, 'server.mjs'), serverCode, 'utf-8');
  console.log(`  ${theme.dim('wrote')} server.mjs`);

  // Generate Dockerfile
  const dockerfile = generateDockerfile();
  fs.writeFileSync(path.join(outputDir, 'Dockerfile'), dockerfile, 'utf-8');
  console.log(`  ${theme.dim('wrote')} Dockerfile`);

  // Generate docker-compose.yml
  const compose = generateDockerCompose(deployConfig);
  fs.writeFileSync(path.join(outputDir, 'docker-compose.yml'), compose, 'utf-8');
  console.log(`  ${theme.dim('wrote')} docker-compose.yml`);
}

function generateVercelTarget(
  outputDir: string,
  agentConfig: import('../agent/types.js').AgentConfig,
  systemPrompt: string,
): void {
  const files = generateVercelProject(agentConfig, systemPrompt);

  for (const [filePath, content] of files) {
    const fullPath = path.join(outputDir, filePath);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`  ${theme.dim('wrote')} ${filePath}`);
  }
}

// ── Instructions ─────────────────────────────────────────────────────────────

function printInstructions(
  target: DeployTarget,
  outputDir: string,
  agentName: string,
  port: number,
): void {
  const relativeDir = path.relative(process.cwd(), outputDir) || '.';
  const envVar = 'OPENAI_API_KEY'; // most common; the server logs the correct one on startup

  console.log(theme.dim('  Next steps:'));
  console.log('');

  switch (target) {
    case 'standalone':
      console.log(theme.info(`    1. Set your API key:`));
      console.log(theme.dim(`       export ${envVar}=your-key-here`));
      console.log(theme.info(`    2. Run the server:`));
      console.log(theme.dim(`       node ${relativeDir}/server.mjs`));
      console.log(theme.info(`    3. Test it:`));
      console.log(
        theme.dim(
          `       curl -X POST http://localhost:${port}/chat \\`,
        ),
      );
      console.log(
        theme.dim(
          `         -H "Content-Type: application/json" \\`,
        ),
      );
      console.log(
        theme.dim(
          `         -d '{"message": "Hello!"}'`,
        ),
      );
      break;

    case 'docker':
      console.log(theme.info(`    1. Set your API key:`));
      console.log(theme.dim(`       export ${envVar}=your-key-here`));
      console.log(theme.info(`    2. Start with Docker Compose:`));
      console.log(theme.dim(`       cd ${relativeDir} && docker-compose up --build`));
      console.log(theme.info(`    3. Test it:`));
      console.log(
        theme.dim(
          `       curl -X POST http://localhost:${port}/chat \\`,
        ),
      );
      console.log(
        theme.dim(
          `         -H "Content-Type: application/json" \\`,
        ),
      );
      console.log(
        theme.dim(
          `         -d '{"message": "Hello!"}'`,
        ),
      );
      break;

    case 'vercel':
      console.log(theme.info(`    1. Install Vercel CLI (if needed):`));
      console.log(theme.dim(`       npm i -g vercel`));
      console.log(theme.info(`    2. Deploy:`));
      console.log(theme.dim(`       cd ${relativeDir} && vercel`));
      console.log(theme.info(`    3. Set environment variables in Vercel dashboard:`));
      console.log(theme.dim(`       ${envVar}=your-key-here`));
      console.log(theme.info(`    4. Test it:`));
      console.log(
        theme.dim(
          `       curl -X POST https://your-project.vercel.app/api/chat \\`,
        ),
      );
      console.log(
        theme.dim(
          `         -H "Content-Type: application/json" \\`,
        ),
      );
      console.log(
        theme.dim(
          `         -d '{"message": "Hello!"}'`,
        ),
      );
      break;
  }

  console.log('');
}
