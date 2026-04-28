// ── Atomium topology types ──────────────────────────────────────────────────

export interface AtomiumNode {
  id: string;
  name: string;
  role: string;
  agentPath: string;
  position: { x: number; y: number; z: number };
  connections: string[];  // IDs of connected nodes
  status: 'active' | 'working' | 'idle' | 'error';
}

export interface AtomiumStructure {
  id: string;
  name: string;
  nodes: AtomiumNode[];
  centerNodeId: string;       // The hub agent
  layout: 'classic' | 'ring' | 'star' | 'grid';
}

export interface HiveConfig {
  structures: AtomiumStructure[];
  links: Array<{
    fromStructure: string;
    fromNode: string;
    toStructure: string;
    toNode: string;
  }>;
}

export interface ArmyConfig {
  name: string;
  version: string;
  description: string;
  hives: HiveConfig[];
  maxAgents: number;          // Cap at 100
  orchestrationMode: 'centralized' | 'distributed' | 'swarm';
}
