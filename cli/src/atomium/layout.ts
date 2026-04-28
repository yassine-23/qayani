/**
 * Atomium layout engine — positions agents in 3D space using
 * crystal-inspired topologies.
 *
 * All coordinate systems produce deterministic results:
 * same input always produces the same layout.
 * Positions are normalized to the 0-1 range.
 */

import { randomUUID } from 'crypto';
import type { AtomiumNode, AtomiumStructure } from './types.js';

// ── Position type alias ─────────────────────────────────────────────────────

type Position = { x: number; y: number; z: number };

// ── Classic Atomium layout (BCC crystal) ────────────────────────────────────

/**
 * Generate classic Atomium layout inspired by the BCC (body-centered cubic)
 * crystal structure, like the Brussels Atomium.
 *
 * - 1 agent:   center only
 * - 2-3:       center + surrounding ring
 * - 4-6:       two layers (top ring + bottom ring + center)
 * - 7-9:       full BCC crystal (8 corners + 1 center)
 * - 10+:       BCC core + extra nodes distributed on outer shell
 *
 * Returns normalized coordinates (0-1 range).
 */
export function classicAtomiumLayout(agentCount: number): Position[] {
  if (agentCount <= 0) return [];

  const positions: Position[] = [];

  if (agentCount === 1) {
    positions.push({ x: 0.5, y: 0.5, z: 0.5 });
  } else if (agentCount <= 3) {
    // Center + ring on the XY plane
    positions.push({ x: 0.5, y: 0.5, z: 0.5 });
    const ringCount = agentCount - 1;
    for (let i = 0; i < ringCount; i++) {
      const angle = (2 * Math.PI * i) / ringCount;
      positions.push({
        x: 0.5 + 0.3 * Math.cos(angle),
        y: 0.5 + 0.3 * Math.sin(angle),
        z: 0.5,
      });
    }
  } else if (agentCount <= 6) {
    // Center + top ring + bottom ring
    positions.push({ x: 0.5, y: 0.5, z: 0.5 });
    const perLayer = Math.ceil((agentCount - 1) / 2);
    const bottomCount = agentCount - 1 - perLayer;

    // Top layer
    for (let i = 0; i < perLayer; i++) {
      const angle = (2 * Math.PI * i) / perLayer;
      positions.push({
        x: 0.5 + 0.3 * Math.cos(angle),
        y: 0.5 + 0.3 * Math.sin(angle),
        z: 0.7,
      });
    }
    // Bottom layer
    for (let i = 0; i < bottomCount; i++) {
      const angle = (2 * Math.PI * i) / bottomCount + Math.PI / bottomCount;
      positions.push({
        x: 0.5 + 0.3 * Math.cos(angle),
        y: 0.5 + 0.3 * Math.sin(angle),
        z: 0.3,
      });
    }
  } else {
    // Full BCC: 8 corners + center, then extras on outer shell
    // BCC corners at (+-1, +-1, +-1) normalized to 0-1
    const corners: Position[] = [];
    for (let xi = 0; xi <= 1; xi++) {
      for (let yi = 0; yi <= 1; yi++) {
        for (let zi = 0; zi <= 1; zi++) {
          corners.push({
            x: 0.2 + xi * 0.6,
            y: 0.2 + yi * 0.6,
            z: 0.2 + zi * 0.6,
          });
        }
      }
    }

    // Center
    positions.push({ x: 0.5, y: 0.5, z: 0.5 });

    // Add corners (up to 8)
    const cornerCount = Math.min(agentCount - 1, 8);
    for (let i = 0; i < cornerCount; i++) {
      positions.push(corners[i]);
    }

    // Extra nodes beyond 9: distribute on outer shell using
    // Fibonacci sphere for even distribution
    const extraCount = agentCount - 9;
    if (extraCount > 0) {
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < extraCount; i++) {
        const t = i / Math.max(extraCount - 1, 1);
        const inclination = Math.acos(1 - 2 * t);
        const azimuth = goldenAngle * i;

        positions.push({
          x: 0.5 + 0.4 * Math.sin(inclination) * Math.cos(azimuth),
          y: 0.5 + 0.4 * Math.sin(inclination) * Math.sin(azimuth),
          z: 0.5 + 0.4 * Math.cos(inclination),
        });
      }
    }
  }

  return normalize(positions);
}

// ── Ring layout ─────────────────────────────────────────────────────────────

/**
 * Ring layout: agents arranged in a circle on the XY plane with a center hub.
 * The first position is always the center hub.
 */
export function ringLayout(agentCount: number): Position[] {
  if (agentCount <= 0) return [];

  const positions: Position[] = [];

  // Center hub
  positions.push({ x: 0.5, y: 0.5, z: 0.5 });

  // Surrounding ring
  const ringCount = agentCount - 1;
  for (let i = 0; i < ringCount; i++) {
    const angle = (2 * Math.PI * i) / ringCount;
    positions.push({
      x: 0.5 + 0.35 * Math.cos(angle),
      y: 0.5 + 0.35 * Math.sin(angle),
      z: 0.5,
    });
  }

  return normalize(positions);
}

// ── Star layout ─────────────────────────────────────────────────────────────

/**
 * Star layout: center hub with radial spokes.
 * Agents sit at the tip of each spoke, all connected to center.
 */
export function starLayout(agentCount: number): Position[] {
  if (agentCount <= 0) return [];

  const positions: Position[] = [];

  // Center hub
  positions.push({ x: 0.5, y: 0.5, z: 0.5 });

  // Spoke tips
  const spokeCount = agentCount - 1;
  for (let i = 0; i < spokeCount; i++) {
    const angle = (2 * Math.PI * i) / spokeCount;
    // Alternate Z for 3D effect
    const zOffset = 0.15 * (i % 2 === 0 ? 1 : -1);
    positions.push({
      x: 0.5 + 0.4 * Math.cos(angle),
      y: 0.5 + 0.4 * Math.sin(angle),
      z: 0.5 + zOffset,
    });
  }

  return normalize(positions);
}

// ── Grid layout ─────────────────────────────────────────────────────────────

/**
 * Grid layout: agents arranged in a 3D grid.
 * Attempts a roughly cubic distribution.
 */
export function gridLayout(agentCount: number): Position[] {
  if (agentCount <= 0) return [];

  const dim = Math.ceil(Math.cbrt(agentCount));
  const positions: Position[] = [];

  let count = 0;
  for (let xi = 0; xi < dim && count < agentCount; xi++) {
    for (let yi = 0; yi < dim && count < agentCount; yi++) {
      for (let zi = 0; zi < dim && count < agentCount; zi++) {
        positions.push({
          x: dim === 1 ? 0.5 : 0.15 + (xi / (dim - 1)) * 0.7,
          y: dim === 1 ? 0.5 : 0.15 + (yi / (dim - 1)) * 0.7,
          z: dim === 1 ? 0.5 : 0.15 + (zi / (dim - 1)) * 0.7,
        });
        count++;
      }
    }
  }

  return normalize(positions);
}

// ── Connection calculation ──────────────────────────────────────────────────

/**
 * Calculate connections between nodes based on layout type.
 *
 * Returns an array of string arrays. Each inner array at index i contains
 * the indices (as strings) of nodes that node i should connect to.
 *
 * - classic: center connects to all corners; corners connect to adjacent
 * - ring/star: center connects to all; ring nodes connect to neighbors
 * - grid: connect to immediate neighbors in the grid
 */
export function calculateConnections(
  positions: Position[],
  layout: string,
): string[][] {
  const n = positions.length;
  if (n === 0) return [];

  const connections: string[][] = Array.from({ length: n }, () => []);

  if (layout === 'ring' || layout === 'star') {
    // Center (index 0) connects to everyone
    for (let i = 1; i < n; i++) {
      connections[0].push(String(i));
      connections[i].push('0');
    }

    // Ring neighbors
    if (layout === 'ring' && n > 2) {
      for (let i = 1; i < n; i++) {
        const prev = i === 1 ? n - 1 : i - 1;
        const next = i === n - 1 ? 1 : i + 1;
        if (!connections[i].includes(String(prev))) {
          connections[i].push(String(prev));
        }
        if (!connections[i].includes(String(next))) {
          connections[i].push(String(next));
        }
      }
    }
  } else if (layout === 'grid') {
    // Connect nodes within a distance threshold
    const threshold = 1.5 / Math.max(Math.cbrt(n), 1);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dist = distance(positions[i], positions[j]);
        if (dist <= threshold) {
          connections[i].push(String(j));
          connections[j].push(String(i));
        }
      }
    }
  } else {
    // Classic BCC: center (index 0) to all, corners to adjacent corners
    if (n >= 1) {
      for (let i = 1; i < n; i++) {
        connections[0].push(String(i));
        connections[i].push('0');
      }
    }
    // Connect nodes that share 2 of 3 similar coordinates (adjacent corners)
    if (n > 2) {
      const adjacencyThreshold = 0.65;
      for (let i = 1; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dist = distance(positions[i], positions[j]);
          if (dist < adjacencyThreshold) {
            connections[i].push(String(j));
            connections[j].push(String(i));
          }
        }
      }
    }
  }

  return connections;
}

// ── Build full AtomiumStructure ─────────────────────────────────────────────

/**
 * Build a complete AtomiumStructure from a list of agents.
 *
 * @param name    Name for the structure
 * @param agents  Array of agent definitions (name, role, agentPath)
 * @param layout  Layout algorithm to use (defaults to auto-selection)
 */
export function buildAtomiumStructure(
  name: string,
  agents: Array<{ name: string; role: string; agentPath: string }>,
  layout?: 'classic' | 'ring' | 'star' | 'grid',
): AtomiumStructure {
  const count = agents.length;

  // Auto-select layout if not specified
  const selectedLayout = layout ?? autoSelectLayout(count);

  // Generate positions
  let positions: Position[];
  switch (selectedLayout) {
    case 'classic':
      positions = classicAtomiumLayout(count);
      break;
    case 'ring':
      positions = ringLayout(count);
      break;
    case 'star':
      positions = starLayout(count);
      break;
    case 'grid':
      positions = gridLayout(count);
      break;
    default:
      positions = classicAtomiumLayout(count);
  }

  // Calculate connections (using indices as temporary IDs)
  const connectionMap = calculateConnections(positions, selectedLayout);

  // Generate stable IDs based on structure name + agent name
  const nodeIds = agents.map((a) => `${name}:${a.name}`);

  // Build nodes
  const nodes: AtomiumNode[] = agents.map((agent, i) => ({
    id: nodeIds[i],
    name: agent.name,
    role: agent.role,
    agentPath: agent.agentPath,
    position: positions[i],
    connections: connectionMap[i].map((idx) => nodeIds[Number(idx)]),
    status: 'idle' as const,
  }));

  // Center node is always index 0
  const centerNodeId = nodeIds[0] ?? '';

  return {
    id: randomUUID(),
    name,
    nodes,
    centerNodeId,
    layout: selectedLayout,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function autoSelectLayout(count: number): 'classic' | 'ring' | 'star' | 'grid' {
  if (count <= 3) return 'star';
  if (count <= 6) return 'ring';
  if (count <= 9) return 'classic';
  return 'grid';
}

function distance(a: Position, b: Position): number {
  return Math.sqrt(
    (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2,
  );
}

/**
 * Normalize all positions to the 0-1 range.
 * If all positions are identical, returns all at 0.5.
 */
function normalize(positions: Position[]): Position[] {
  if (positions.length === 0) return [];

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const p of positions) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }

  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const rangeZ = maxZ - minZ;

  // Use a uniform scale to preserve proportions
  const maxRange = Math.max(rangeX, rangeY, rangeZ);

  if (maxRange === 0) {
    return positions.map(() => ({ x: 0.5, y: 0.5, z: 0.5 }));
  }

  // Add padding so nodes don't sit at exact 0 or 1
  const padding = 0.1;
  const scale = 1 - 2 * padding;

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;

  return positions.map((p) => ({
    x: 0.5 + ((p.x - centerX) / maxRange) * scale,
    y: 0.5 + ((p.y - centerY) / maxRange) * scale,
    z: 0.5 + ((p.z - centerZ) / maxRange) * scale,
  }));
}
