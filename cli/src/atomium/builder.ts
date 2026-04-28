/**
 * AtomiumBuilder — construct and manage Atomium structures, Hives, and Armies.
 *
 * Provides static helpers for creating, duplicating, linking, and validating
 * topology objects. Enforces the 100-agent maximum across all operations.
 */

import { randomUUID } from 'crypto';
import { buildAtomiumStructure } from './layout.js';
import type {
  AtomiumNode,
  AtomiumStructure,
  HiveConfig,
  ArmyConfig,
} from './types.js';
import type { FleetAgent } from '../fleet/types.js';

// ── Constants ───────────────────────────────────────────────────────────────

const MAX_AGENTS = 100;

// ── Builder ─────────────────────────────────────────────────────────────────

export class AtomiumBuilder {
  /**
   * Create a new AtomiumStructure from fleet agents.
   */
  static fromAgents(
    name: string,
    agents: FleetAgent[],
    layout?: 'classic' | 'ring' | 'star' | 'grid',
  ): AtomiumStructure {
    return buildAtomiumStructure(
      name,
      agents.map((a) => ({
        name: a.name,
        role: a.role,
        agentPath: a.agentPath,
      })),
      layout,
    );
  }

  /**
   * Duplicate an AtomiumStructure with a new name.
   * Generates fresh IDs for all nodes while preserving topology.
   */
  static duplicate(
    source: AtomiumStructure,
    newName: string,
  ): AtomiumStructure {
    // Build a mapping from old node IDs to new node IDs
    const idMap = new Map<string, string>();
    for (const node of source.nodes) {
      idMap.set(node.id, `${newName}:${node.name}`);
    }

    const nodes: AtomiumNode[] = source.nodes.map((node) => ({
      id: idMap.get(node.id)!,
      name: node.name,
      role: node.role,
      agentPath: node.agentPath,
      position: { ...node.position },
      connections: node.connections.map((connId) => idMap.get(connId) ?? connId),
      status: 'idle' as const,
    }));

    const centerNodeId = idMap.get(source.centerNodeId) ?? nodes[0]?.id ?? '';

    return {
      id: randomUUID(),
      name: newName,
      nodes,
      centerNodeId,
      layout: source.layout,
    };
  }

  /**
   * Link multiple AtomiumStructures into a Hive.
   * Automatically creates links between center nodes of each structure.
   */
  static createHive(structures: AtomiumStructure[]): HiveConfig {
    const links: HiveConfig['links'] = [];

    // Link center nodes of adjacent structures
    for (let i = 0; i < structures.length - 1; i++) {
      const from = structures[i];
      const to = structures[i + 1];

      const fromCenter = from.nodes.find((n) => n.id === from.centerNodeId);
      const toCenter = to.nodes.find((n) => n.id === to.centerNodeId);

      if (fromCenter && toCenter) {
        links.push({
          fromStructure: from.name,
          fromNode: fromCenter.name,
          toStructure: to.name,
          toNode: toCenter.name,
        });
      }
    }

    return { structures, links };
  }

  /**
   * Link hives into an Army configuration.
   * Enforces the 100-agent maximum.
   */
  static createArmy(
    name: string,
    hives: HiveConfig[],
    options?: {
      description?: string;
      orchestrationMode?: ArmyConfig['orchestrationMode'];
    },
  ): ArmyConfig {
    const army: ArmyConfig = {
      name,
      version: '1.0',
      description: options?.description ?? `Army: ${name}`,
      hives,
      maxAgents: MAX_AGENTS,
      orchestrationMode: options?.orchestrationMode ?? 'distributed',
    };

    const validation = AtomiumBuilder.validateArmySize(army);
    if (!validation.valid) {
      throw new Error(validation.message ?? 'Army exceeds maximum agent count.');
    }

    return army;
  }

  /**
   * Add a new agent node to an existing AtomiumStructure.
   * The new node connects to the center hub.
   * Returns a new structure (immutable).
   */
  static addNode(
    structure: AtomiumStructure,
    agent: FleetAgent,
  ): AtomiumStructure {
    const newId = `${structure.name}:${agent.name}`;

    // Position: place on the outer shell relative to center
    const existingCount = structure.nodes.length;
    const angle = (2 * Math.PI * existingCount) / (existingCount + 1);
    const position = {
      x: 0.5 + 0.35 * Math.cos(angle),
      y: 0.5 + 0.35 * Math.sin(angle),
      z: 0.5,
    };

    const newNode: AtomiumNode = {
      id: newId,
      name: agent.name,
      role: agent.role,
      agentPath: agent.agentPath,
      position,
      connections: [structure.centerNodeId],
      status: 'idle',
    };

    // Update center node to include the new connection
    const nodes = structure.nodes.map((node) => {
      if (node.id === structure.centerNodeId) {
        return {
          ...node,
          connections: [...node.connections, newId],
        };
      }
      return node;
    });

    nodes.push(newNode);

    return {
      ...structure,
      id: structure.id,
      nodes,
    };
  }

  /**
   * Remove an agent node from an AtomiumStructure.
   * Also removes all connections referencing the removed node.
   * Cannot remove the center node if other nodes exist.
   * Returns a new structure (immutable).
   */
  static removeNode(
    structure: AtomiumStructure,
    nodeId: string,
  ): AtomiumStructure {
    if (nodeId === structure.centerNodeId && structure.nodes.length > 1) {
      throw new Error(
        'Cannot remove the center node while other nodes exist. ' +
        'Remove all other nodes first, or reassign the center.',
      );
    }

    const nodes = structure.nodes
      .filter((n) => n.id !== nodeId)
      .map((n) => ({
        ...n,
        connections: n.connections.filter((c) => c !== nodeId),
      }));

    // If the removed node was the center and it was the only one, reset
    let centerNodeId = structure.centerNodeId;
    if (nodeId === centerNodeId) {
      centerNodeId = nodes[0]?.id ?? '';
    }

    return {
      ...structure,
      id: structure.id,
      nodes,
      centerNodeId,
    };
  }

  /**
   * Validate that an Army does not exceed the 100-agent maximum.
   */
  static validateArmySize(
    army: ArmyConfig,
  ): { valid: boolean; agentCount: number; message?: string } {
    let agentCount = 0;

    for (const hive of army.hives) {
      for (const structure of hive.structures) {
        agentCount += structure.nodes.length;
      }
    }

    if (agentCount > MAX_AGENTS) {
      return {
        valid: false,
        agentCount,
        message:
          `Army "${army.name}" has ${agentCount} agents, which exceeds the ` +
          `maximum of ${MAX_AGENTS}. Remove some agents or structures to proceed.`,
      };
    }

    return { valid: true, agentCount };
  }

  /**
   * Count total agents across all hives and structures.
   */
  static countAgents(army: ArmyConfig): number {
    let count = 0;
    for (const hive of army.hives) {
      for (const structure of hive.structures) {
        count += structure.nodes.length;
      }
    }
    return count;
  }
}
