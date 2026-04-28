import * as path from 'path';
import chalk from 'chalk';
import { loadAgent } from '../agent/loader.js';
import type { AgentConfig } from '../agent/types.js';
import type { LLMProvider, LLMMessage } from '../llm/types.js';
import type { FleetConfig, FleetMessage, WorkflowStep } from './types.js';

/**
 * Executes a fleet workflow by coordinating multiple agents.
 *
 * Supports three communication modes:
 *   - sequential: steps run one after another in order
 *   - parallel: all steps run concurrently
 *   - orchestrated: respects dependsOn, parallelizing where possible
 */
export class FleetRunner {
  private agents = new Map<
    string,
    { config: AgentConfig; systemPrompt: string; provider: LLMProvider }
  >();
  private messageLog: FleetMessage[] = [];

  constructor(
    private config: FleetConfig,
    private providerFactory: (agentConfig: AgentConfig) => LLMProvider,
  ) {}

  /**
   * Execute the full fleet workflow for a given task.
   * Returns the accumulated message log.
   */
  async run(task: string): Promise<FleetMessage[]> {
    this.messageLog = [];

    // Load all agent configs
    await this.loadAgents();

    console.log('');
    console.log(
      chalk.hex('#D4AF37').bold('  Fleet: ') + chalk.bold(this.config.name),
    );
    console.log(
      chalk.dim(`  ${this.config.description}`),
    );
    console.log(
      chalk.dim(`  Mode: ${this.config.communication} | Agents: ${this.config.agents.length} | Steps: ${this.config.workflow.length}`),
    );
    console.log(chalk.dim('  ' + '─'.repeat(50)));
    console.log('');

    const context = new Map<string, string>();

    switch (this.config.communication) {
      case 'sequential':
        await this.runSequential(task, context);
        break;
      case 'parallel':
        await this.runParallel(task, context);
        break;
      case 'orchestrated':
        await this.runOrchestrated(task, context);
        break;
    }

    console.log('');
    console.log(chalk.dim('  ' + '─'.repeat(50)));
    console.log(
      chalk.green.bold('  Fleet execution complete.') +
        chalk.dim(` ${this.messageLog.length} messages exchanged.`),
    );
    console.log('');

    return this.messageLog;
  }

  /**
   * Run workflow steps one after another in the order they are defined.
   */
  private async runSequential(
    task: string,
    context: Map<string, string>,
  ): Promise<void> {
    for (const step of this.config.workflow) {
      const result = await this.executeStep(step, task, context);
      if (step.output) {
        context.set(step.output, result);
      }
    }
  }

  /**
   * Run all workflow steps concurrently, ignoring dependsOn.
   */
  private async runParallel(
    task: string,
    context: Map<string, string>,
  ): Promise<void> {
    const results = await Promise.all(
      this.config.workflow.map(async (step) => {
        const result = await this.executeStep(step, task, context);
        return { step, result };
      }),
    );

    for (const { step, result } of results) {
      if (step.output) {
        context.set(step.output, result);
      }
    }
  }

  /**
   * Run workflow steps respecting dependsOn, parallelizing independent steps.
   */
  private async runOrchestrated(
    task: string,
    context: Map<string, string>,
  ): Promise<void> {
    const completed = new Set<string>();
    const remaining = [...this.config.workflow];

    while (remaining.length > 0) {
      // Find steps whose dependencies are all satisfied
      const ready = remaining.filter((step) => {
        if (!step.dependsOn || step.dependsOn.length === 0) {
          return true;
        }
        return step.dependsOn.every((dep) => completed.has(dep));
      });

      if (ready.length === 0) {
        // Circular dependency or unresolvable -- list what's stuck
        const stuck = remaining.map((s) => s.agent).join(', ');
        throw new Error(
          `Fleet workflow is stuck. Remaining steps have unresolved dependencies: ${stuck}`,
        );
      }

      // Execute all ready steps in parallel
      const results = await Promise.all(
        ready.map(async (step) => {
          const result = await this.executeStep(step, task, context);
          return { step, result };
        }),
      );

      // Record outputs and mark completed
      for (const { step, result } of results) {
        if (step.output) {
          context.set(step.output, result);
        }
        completed.add(step.agent);

        // Remove from remaining
        const idx = remaining.indexOf(step);
        if (idx !== -1) {
          remaining.splice(idx, 1);
        }
      }
    }
  }

  /**
   * Execute a single workflow step by calling the designated agent.
   */
  private async executeStep(
    step: WorkflowStep,
    task: string,
    context: Map<string, string>,
  ): Promise<string> {
    const agent = this.agents.get(step.agent);
    if (!agent) {
      throw new Error(`Agent "${step.agent}" not found in loaded agents.`);
    }

    const agentDef = this.config.agents.find((a) => a.name === step.agent);
    const role = agentDef?.role ?? step.agent;

    // Build context summary from previous step outputs
    let contextBlock = '';
    if (context.size > 0) {
      const entries = [...context.entries()]
        .map(([key, value]) => `### ${key}\n${value}`)
        .join('\n\n');
      contextBlock = `\n\nContext from previous agents:\n${entries}`;
    }

    const prompt =
      `You are ${step.agent} (${role}). Your task: ${step.task}` +
      contextBlock +
      `\n\nOriginal request: ${task}`;

    // Log the task message
    this.logMessage('orchestrator', step.agent, step.task, 'task');

    // Print status
    const spinner = chalk.hex('#D4AF37')('>>');
    console.log(
      `  ${spinner} ${chalk.bold(step.agent)} ${chalk.dim(`(${role})`)} ${chalk.cyan('working...')}`,
    );
    const startTime = Date.now();

    try {
      const result = await this.callAgent(step.agent, prompt);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // Log the result message
      this.logMessage(step.agent, 'orchestrator', result, 'result');

      console.log(
        `  ${chalk.green('<<')} ${chalk.bold(step.agent)} ${chalk.green('done')} ${chalk.dim(`(${elapsed}s)`)}`,
      );

      // Print a short preview of the result
      const preview =
        result.length > 120 ? result.slice(0, 120) + '...' : result;
      console.log(chalk.dim(`     ${preview.replace(/\n/g, ' ')}`));
      console.log('');

      return result;
    } catch (err) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const msg = err instanceof Error ? err.message : String(err);
      console.log(
        `  ${chalk.red('!!')} ${chalk.bold(step.agent)} ${chalk.red('failed')} ${chalk.dim(`(${elapsed}s)`)}`,
      );
      console.log(chalk.red(`     ${msg}`));
      console.log('');

      this.logMessage(
        step.agent,
        'orchestrator',
        `Error: ${msg}`,
        'feedback',
      );

      return `[Error from ${step.agent}: ${msg}]`;
    }
  }

  /**
   * Send a prompt to a specific agent and get the LLM response.
   */
  private async callAgent(
    agentName: string,
    prompt: string,
  ): Promise<string> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      throw new Error(`Agent "${agentName}" is not loaded.`);
    }

    const messages: LLMMessage[] = [
      { role: 'system', content: agent.systemPrompt },
      { role: 'user', content: prompt },
    ];

    const response = await agent.provider.chat(messages, {
      model: agent.config.model.name,
      temperature: agent.config.model.temperature,
      maxTokens: agent.config.model.maxTokens,
    });

    return response.content;
  }

  /**
   * Load all agent configurations from their directories.
   * Supports both soul.md + agent.yaml and legacy AGENT.md formats.
   */
  private async loadAgents(): Promise<void> {
    for (const agentDef of this.config.agents) {
      const agentDir = path.resolve(agentDef.agentPath);

      try {
        const { systemPrompt, ...config } = await loadAgent(agentDir);
        const provider = this.providerFactory(config);
        this.agents.set(agentDef.name, { config, systemPrompt, provider });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(
          `Failed to load agent "${agentDef.name}" from ${agentDir}: ${msg}`,
        );
      }
    }
  }

  /**
   * Append a message to the fleet's message log.
   */
  private logMessage(
    from: string,
    to: string,
    content: string,
    type: FleetMessage['type'],
  ): void {
    this.messageLog.push({
      from,
      to,
      content,
      timestamp: new Date().toISOString(),
      type,
    });
  }
}
