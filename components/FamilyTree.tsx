'use client';

import React, { useMemo, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';

export interface FamilyMember {
  id: string;
  name: string;
  dateOfBirth?: string;
  dateOfPassing?: string;
  relationshipToCreator: string;
  avatarUrl?: string;
  personalityId?: string;
  isDigitalTwin: boolean;
  generation: number; // For layout: 0 = creator, -1 = parents, 1 = children, etc.
}

interface FamilyTreeProps {
  members: FamilyMember[];
  onMemberClick?: (member: FamilyMember) => void;
  creatorId: string;
}

// Custom node component
const FamilyMemberNode = ({ data }: { data: FamilyMember & { onClick?: () => void } }) => {
  const isAlive = !data.dateOfPassing;
  const age = data.dateOfBirth
    ? new Date().getFullYear() - new Date(data.dateOfBirth).getFullYear()
    : null;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      onClick={data.onClick}
      className={`relative cursor-pointer ${
        data.id === data.id ? 'ring-4 ring-purple-400' : ''
      }`}
    >
      <div
        className={`rounded-xl shadow-lg p-4 min-w-[200px] ${
          isAlive ? 'bg-white' : 'bg-gray-100'
        } border-2 ${
          data.isDigitalTwin ? 'border-purple-500' : 'border-gray-300'
        } hover:shadow-xl transition-all`}
      >
        {/* Avatar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-indigo-400 flex items-center justify-center text-white font-bold">
            {data.avatarUrl ? (
              <img src={data.avatarUrl} alt={data.name} className="w-full h-full object-cover" />
            ) : (
              <span>{data.name.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">{data.name}</h3>
            <p className="text-xs text-gray-600">{data.relationshipToCreator}</p>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-1 text-xs">
          {data.dateOfBirth && (
            <div className="flex items-center gap-2 text-gray-600">
              <span>🎂</span>
              <span>{new Date(data.dateOfBirth).toLocaleDateString()}</span>
              {age && isAlive && <span className="text-gray-500">({age} years)</span>}
            </div>
          )}
          {data.dateOfPassing && (
            <div className="flex items-center gap-2 text-gray-500">
              <span>🕊️</span>
              <span>{new Date(data.dateOfPassing).toLocaleDateString()}</span>
            </div>
          )}
          {data.isDigitalTwin && (
            <div className="mt-2 flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
              <span>🤖</span>
              <span className="font-medium">Digital Twin</span>
            </div>
          )}
        </div>

        {/* Status Indicator */}
        <div className="absolute top-2 right-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isAlive ? 'bg-green-400' : 'bg-gray-400'
            }`}
          ></div>
        </div>
      </div>
    </motion.div>
  );
};

const nodeTypes = {
  familyMember: FamilyMemberNode,
};

export default function FamilyTree({ members, onMemberClick, creatorId }: FamilyTreeProps) {
  // Convert family members to React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    return members.map((member, index) => {
      // Calculate position based on generation and index
      const generationY = member.generation * 250;
      const generationMembers = members.filter((m) => m.generation === member.generation);
      const memberIndex = generationMembers.findIndex((m) => m.id === member.id);
      const generationX = (memberIndex - generationMembers.length / 2) * 300;

      return {
        id: member.id,
        type: 'familyMember',
        position: { x: generationX, y: generationY },
        data: {
          ...member,
          onClick: () => onMemberClick?.(member),
        },
      };
    });
  }, [members, onMemberClick]);

  // Create edges based on relationships
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];

    members.forEach((member) => {
      // Connect parents to children (generation-based)
      if (member.generation > 0) {
        // Find parent generation members
        const parents = members.filter((m) => m.generation === member.generation - 1);

        parents.forEach((parent) => {
          // Create edge from parent to child
          edges.push({
            id: `${parent.id}-${member.id}`,
            source: parent.id,
            target: member.id,
            type: 'smoothstep',
            animated: member.isDigitalTwin,
            style: {
              stroke: member.isDigitalTwin ? '#a855f7' : '#9ca3af',
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: member.isDigitalTwin ? '#a855f7' : '#9ca3af',
            },
          });
        });
      }
    });

    return edges;
  }, [members]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="w-full h-full bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
        }}
        minZoom={0.2}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background color="#c4b5fd" gap={16} />
        <Controls className="bg-white rounded-lg shadow-lg" />
        <MiniMap
          nodeColor={(node) => {
            const member = node.data as FamilyMember;
            return member.isDigitalTwin ? '#a855f7' : member.dateOfPassing ? '#9ca3af' : '#10b981';
          }}
          className="bg-white rounded-lg shadow-lg"
        />
      </ReactFlow>
    </div>
  );
}
