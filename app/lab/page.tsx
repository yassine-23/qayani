'use client';

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useLabStore } from '@/lib/stores/labStore';
import StatusIndicator from '@/components/lab/StatusIndicator';
import { TEAM_STRUCTURES, type TeamStructure } from '@/lib/polytopes/geometry';

const PolytopeView = dynamic(() => import('@/components/3d/PolytopeView'), { ssr: false });

// ── Agent Node Card (for sidebar) ───────────────────────────────────────────

function AgentCard({
  agent,
  isSelected,
  onClick,
}: {
  agent: ReturnType<typeof useLabStore.getState>['agents'][0];
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        isSelected
          ? 'bg-cube/10 border-cube/30'
          : 'bg-surface-200/50 border-white/5 hover:border-white/10'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-white">{agent.name}</span>
        <StatusIndicator status={agent.status} size="xs" />
      </div>
      <p className="text-xs text-muted truncate">{agent.role}</p>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-[10px] font-mono text-muted bg-surface-300 px-1.5 py-0.5 rounded">
          {agent.provider}
        </span>
        <span className="text-[10px] font-mono text-muted bg-surface-300 px-1.5 py-0.5 rounded">
          {agent.tools.length} tools
        </span>
      </div>
    </motion.button>
  );
}

// ── Team Structure Card ─────────────────────────────────────────────────────

function StructureCard({
  structure,
  isActive,
  onClick,
}: {
  structure: (typeof TEAM_STRUCTURES)[0];
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-lg border text-left transition-all ${
        isActive
          ? 'bg-cube/10 border-cube/30'
          : 'bg-surface-200/50 border-white/5 hover:border-white/10'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{structure.name}</span>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
          structure.tier === 'free' ? 'text-cube bg-cube/10' :
          structure.tier === 'pro' ? 'text-amber-400 bg-amber-400/10' :
          'text-purple-400 bg-purple-400/10'
        }`}>
          {structure.tier}
        </span>
      </div>
      <p className="text-xs text-muted mt-1">{structure.agents} agents</p>
    </button>
  );
}

// ── Detail Panel ────────────────────────────────────────────────────────────

function DetailPanel() {
  const { agents, selectedAgentId, detailTab, setDetailTab, selectAgent } = useLabStore();
  const agent = agents.find((a) => a.id === selectedAgentId);

  if (!agent) return null;

  const tabs = [
    { id: 'config' as const, label: 'Config' },
    { id: 'todos' as const, label: 'Tasks' },
    { id: 'reports' as const, label: 'Reports' },
    { id: 'goals' as const, label: 'Goals' },
    { id: 'chat' as const, label: 'Chat' },
  ];

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="w-[320px] h-full bg-surface-100/95 backdrop-blur-2xl border-l border-white/5 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <StatusIndicator status={agent.status} size="sm" />
            <h3 className="text-base font-semibold text-white">{agent.name}</h3>
          </div>
          <button
            onClick={() => selectAgent(null)}
            className="text-muted hover:text-white transition-colors text-sm"
          >
            x
          </button>
        </div>
        <p className="text-xs text-muted">{agent.role}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setDetailTab(tab.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              detailTab === tab.id
                ? 'text-cube border-b border-cube'
                : 'text-muted hover:text-subtle'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {detailTab === 'config' && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-wider">Provider</label>
              <div className="mt-1 p-2 bg-surface-300 rounded text-sm text-white font-mono">{agent.provider}</div>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-wider">Model</label>
              <div className="mt-1 p-2 bg-surface-300 rounded text-sm text-white font-mono">{agent.model}</div>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted uppercase tracking-wider">Tools</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {agent.tools.map((tool) => (
                  <span key={tool} className="px-2 py-1 bg-surface-300 rounded text-xs text-subtle font-mono">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {detailTab === 'todos' && (
          <div className="space-y-3">
            {agent.tasks.length === 0 ? (
              <p className="text-xs text-muted text-center py-8">No tasks assigned yet</p>
            ) : (
              agent.tasks.map((task) => (
                <div key={task.id} className="p-2 bg-surface-300 rounded border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">{task.title}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      task.status === 'done' ? 'text-cube bg-cube/10' :
                      task.status === 'working' ? 'text-amber-400 bg-amber-400/10' :
                      task.status === 'blocked' ? 'text-red-400 bg-red-400/10' :
                      'text-subtle bg-surface-200'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                </div>
              ))
            )}
            <button className="w-full py-2 border border-dashed border-white/10 rounded text-xs text-muted hover:text-cube hover:border-cube/30 transition-colors">
              + Add Task
            </button>
          </div>
        )}

        {detailTab === 'reports' && (
          <p className="text-xs text-muted text-center py-8">No reports yet. Run the fleet to generate reports.</p>
        )}

        {detailTab === 'goals' && (
          <div className="space-y-3">
            {agent.goals.length === 0 ? (
              <p className="text-xs text-muted text-center py-8">No goals defined</p>
            ) : (
              agent.goals.map((goal) => (
                <div key={goal.id} className="p-2 bg-surface-300 rounded border border-white/5">
                  <span className="text-sm text-white">{goal.title}</span>
                  <p className="text-xs text-muted mt-1 line-clamp-2">{goal.content}</p>
                </div>
              ))
            )}
            <button className="w-full py-2 border border-dashed border-white/10 rounded text-xs text-muted hover:text-cube hover:border-cube/30 transition-colors">
              + Add Goal
            </button>
          </div>
        )}

        {detailTab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-muted">Talk to {agent.name} to update it</p>
            </div>
            <div className="mt-4">
              <input
                type="text"
                placeholder={`Message ${agent.name}...`}
                className="w-full px-3 py-2 bg-surface-300 border border-white/5 rounded text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cube/30"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-white/5 flex gap-2">
        <button className="flex-1 py-2 bg-cube/10 text-cube text-xs font-medium rounded hover:bg-cube/20 transition-colors">
          Deploy
        </button>
        <button className="flex-1 py-2 bg-surface-300 text-subtle text-xs font-medium rounded hover:text-white transition-colors">
          Duplicate
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Lab Page ───────────────────────────────────────────────────────────

export default function LabPage() {
  const {
    agents,
    selectedAgentId,
    viewMode,
    setViewMode,
    teamStructure,
    setTeamStructure,
    sidebarTab,
    setSidebarTab,
    selectAgent,
  } = useLabStore();

  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | undefined>();

  const handleNodeClick = (index: number) => {
    setSelectedNodeIndex(index);
    if (index < agents.length) {
      selectAgent(agents[index].id);
    }
  };

  return (
    <div className="fixed inset-0 top-16 flex bg-void">
      {/* Left Sidebar */}
      <div className="w-[280px] h-full bg-surface-50/95 backdrop-blur-xl border-r border-white/5 flex flex-col">
        {/* Sidebar Tabs */}
        <div className="flex border-b border-white/5">
          {(['agents', 'teams', 'deploy'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSidebarTab(tab)}
              className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider transition-colors ${
                sidebarTab === tab ? 'text-cube border-b border-cube' : 'text-muted hover:text-subtle'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sidebarTab === 'agents' && (
            <>
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isSelected={selectedAgentId === agent.id}
                  onClick={() => selectAgent(agent.id)}
                />
              ))}
              <button className="w-full py-3 border border-dashed border-white/10 rounded-lg text-xs text-muted hover:text-cube hover:border-cube/30 transition-all">
                + New Agent
              </button>
            </>
          )}

          {sidebarTab === 'teams' && (
            <div className="space-y-2">
              {TEAM_STRUCTURES.map((s) => (
                <StructureCard
                  key={s.id}
                  structure={s}
                  isActive={teamStructure === s.id}
                  onClick={() => setTeamStructure(s.id)}
                />
              ))}
            </div>
          )}

          {sidebarTab === 'deploy' && (
            <div className="space-y-4">
              <div className="p-3 bg-surface-200/50 rounded-lg border border-white/5">
                <h4 className="text-xs font-medium text-white mb-2">Local Deployment</h4>
                <p className="text-[10px] text-muted mb-3">Run on your device with your API keys</p>
                <code className="block p-2 bg-void text-[10px] font-mono text-cube rounded">
                  qayani fleet run --task &quot;your task&quot;
                </code>
              </div>
              <div className="p-3 bg-surface-200/50 rounded-lg border border-white/5">
                <h4 className="text-xs font-medium text-white mb-2">Cloud Deployment</h4>
                <p className="text-[10px] text-muted mb-3">Deploy to Qayani cloud for 24/7 uptime</p>
                <button className="w-full py-2 bg-cube text-void text-xs font-semibold rounded hover:bg-cube-bright transition-colors">
                  Deploy Fleet
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Stats */}
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center justify-between text-[10px] text-muted font-mono">
            <span>{agents.length} agents</span>
            <span>{agents.filter((a) => a.status === 'active' || a.status === 'working').length} active</span>
            <span>{teamStructure}</span>
          </div>
        </div>
      </div>

      {/* Center Canvas */}
      <div className="flex-1 relative">
        {/* View Mode Toggle */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex bg-surface-200/80 backdrop-blur-xl rounded-lg border border-white/5 p-0.5">
          <button
            onClick={() => setViewMode('2d')}
            className={`px-4 py-1.5 text-xs font-medium rounded transition-all ${
              viewMode === '2d' ? 'bg-cube/10 text-cube' : 'text-muted hover:text-white'
            }`}
          >
            Blueprint
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`px-4 py-1.5 text-xs font-medium rounded transition-all ${
              viewMode === '3d' ? 'bg-cube/10 text-cube' : 'text-muted hover:text-white'
            }`}
          >
            Hologram
          </button>
        </div>

        {/* Structure Label */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-surface-200/80 backdrop-blur-xl rounded-lg border border-white/5 px-4 py-2">
            <p className="text-xs font-mono text-subtle text-center">
              {TEAM_STRUCTURES.find((s) => s.id === teamStructure)?.name} — {agents.length} / {TEAM_STRUCTURES.find((s) => s.id === teamStructure)?.agents} agents
            </p>
          </div>
        </div>

        {/* 2D Blueprint View */}
        {viewMode === '2d' && (
          <div className="w-full h-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.03)_0%,transparent_70%)]">
            {/* Grid background */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
            {/* Agent nodes as 2D cards */}
            <div className="relative w-full h-full">
              {agents.map((agent) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  style={{ left: agent.position.x, top: agent.position.y }}
                  className="absolute cursor-pointer"
                  onClick={() => selectAgent(agent.id)}
                >
                  <div className={`p-3 rounded-xl border backdrop-blur-sm transition-all hover:scale-105 ${
                    selectedAgentId === agent.id
                      ? 'bg-cube/10 border-cube/40 shadow-glow-violet'
                      : 'bg-surface-200/60 border-white/5 hover:border-white/15'
                  }`}>
                    <div className="flex items-center gap-2">
                      <StatusIndicator status={agent.status} size="xs" />
                      <span className="text-sm font-medium text-white">{agent.name}</span>
                    </div>
                    <p className="text-[10px] text-muted mt-1 font-mono">{agent.model}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* 3D Hologram View */}
        {viewMode === '3d' && (
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-sm text-muted font-mono animate-pulse">Loading hologram...</div>
            </div>
          }>
            <PolytopeView
              structure={teamStructure}
              selectedNodeIndex={selectedNodeIndex}
              onNodeClick={handleNodeClick}
              className="w-full h-full"
            />
          </Suspense>
        )}
      </div>

      {/* Right Detail Panel */}
      <AnimatePresence>
        {selectedAgentId && <DetailPanel />}
      </AnimatePresence>
    </div>
  );
}
