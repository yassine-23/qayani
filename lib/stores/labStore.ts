import { create } from 'zustand';
import type { TeamStructure } from '../polytopes/geometry';

export interface LabAgent {
  id: string;
  name: string;
  role: string;
  provider: string;
  model: string;
  status: 'active' | 'working' | 'idle' | 'error';
  tools: string[];
  position: { x: number; y: number };
  tasks: AgentTask[];
  goals: AgentGoal[];
}

export interface AgentTask {
  id: string;
  title: string;
  status: 'pending' | 'working' | 'done' | 'blocked';
  assignedBy: string;
  output?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AgentGoal {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
}

interface LabState {
  // Agents
  agents: LabAgent[];
  selectedAgentId: string | null;

  // View
  viewMode: '2d' | '3d';
  teamStructure: TeamStructure;
  sidebarTab: 'agents' | 'teams' | 'deploy';
  detailTab: 'config' | 'todos' | 'reports' | 'goals' | 'chat';

  // Actions
  setViewMode: (mode: '2d' | '3d') => void;
  setTeamStructure: (structure: TeamStructure) => void;
  selectAgent: (id: string | null) => void;
  setSidebarTab: (tab: LabState['sidebarTab']) => void;
  setDetailTab: (tab: LabState['detailTab']) => void;
  addAgent: (agent: LabAgent) => void;
  updateAgent: (id: string, updates: Partial<LabAgent>) => void;
  removeAgent: (id: string) => void;
  addTask: (agentId: string, task: AgentTask) => void;
  updateTask: (agentId: string, taskId: string, updates: Partial<AgentTask>) => void;
  addGoal: (agentId: string, goal: AgentGoal) => void;
}

const DEFAULT_AGENTS: LabAgent[] = [
  {
    id: 'manager',
    name: 'Manager',
    role: 'Team orchestrator and task delegator',
    provider: 'anthropic',
    model: 'claude-sonnet-4',
    status: 'active',
    tools: ['web_search', 'file_read'],
    position: { x: 400, y: 100 },
    tasks: [],
    goals: [],
  },
  {
    id: 'researcher',
    name: 'Researcher',
    role: 'Information gathering and analysis',
    provider: 'openai',
    model: 'gpt-4o',
    status: 'idle',
    tools: ['web_search'],
    position: { x: 200, y: 300 },
    tasks: [],
    goals: [],
  },
  {
    id: 'writer',
    name: 'Writer',
    role: 'Content creation and documentation',
    provider: 'openai',
    model: 'gpt-4o-mini',
    status: 'idle',
    tools: ['file_write'],
    position: { x: 600, y: 300 },
    tasks: [],
    goals: [],
  },
  {
    id: 'coder',
    name: 'Coder',
    role: 'Code generation and debugging',
    provider: 'anthropic',
    model: 'claude-sonnet-4',
    status: 'idle',
    tools: ['file_read', 'file_write', 'shell_exec'],
    position: { x: 100, y: 500 },
    tasks: [],
    goals: [],
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    role: 'Quality assurance and validation',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    status: 'idle',
    tools: ['file_read'],
    position: { x: 700, y: 500 },
    tasks: [],
    goals: [],
  },
];

export const useLabStore = create<LabState>((set) => ({
  agents: DEFAULT_AGENTS,
  selectedAgentId: null,
  viewMode: '2d',
  teamStructure: 'tetrahedron',
  sidebarTab: 'agents',
  detailTab: 'config',

  setViewMode: (mode) => set({ viewMode: mode }),
  setTeamStructure: (structure) => set({ teamStructure: structure }),
  selectAgent: (id) => set({ selectedAgentId: id }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setDetailTab: (tab) => set({ detailTab: tab }),

  addAgent: (agent) =>
    set((state) => ({ agents: [...state.agents, agent] })),

  updateAgent: (id, updates) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  removeAgent: (id) =>
    set((state) => ({
      agents: state.agents.filter((a) => a.id !== id),
      selectedAgentId: state.selectedAgentId === id ? null : state.selectedAgentId,
    })),

  addTask: (agentId, task) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, tasks: [...a.tasks, task] } : a
      ),
    })),

  updateTask: (agentId, taskId, updates) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId
          ? {
              ...a,
              tasks: a.tasks.map((t) =>
                t.id === taskId ? { ...t, ...updates } : t
              ),
            }
          : a
      ),
    })),

  addGoal: (agentId, goal) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, goals: [...a.goals, goal] } : a
      ),
    })),
}));
