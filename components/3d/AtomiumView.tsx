'use client';

import React, {
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
// Bloom disabled - postprocessing has Three.js version compat issues
// import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AtomiumAgent {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'working' | 'idle' | 'error';
  provider: string;
  model: string;
  avatar?: string;
}

export interface AtomiumViewProps {
  agents: AtomiumAgent[];
  onAgentClick?: (agentId: string) => void;
  onAgentHover?: (agentId: string | null) => void;
  selectedAgentId?: string | null;
  mode?: 'single' | 'hive' | 'army';
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<AtomiumAgent['status'], string> = {
  active: '#22c55e',
  working: '#f59e0b',
  idle: '#9ca3af',
  error: '#ef4444',
};

const CUBE_HALF = 2.4;

/** 8 corners of a cube centred at origin */
const CORNER_POSITIONS: [number, number, number][] = [
  [-CUBE_HALF, -CUBE_HALF, -CUBE_HALF],
  [CUBE_HALF, -CUBE_HALF, -CUBE_HALF],
  [CUBE_HALF, CUBE_HALF, -CUBE_HALF],
  [-CUBE_HALF, CUBE_HALF, -CUBE_HALF],
  [-CUBE_HALF, -CUBE_HALF, CUBE_HALF],
  [CUBE_HALF, -CUBE_HALF, CUBE_HALF],
  [CUBE_HALF, CUBE_HALF, CUBE_HALF],
  [-CUBE_HALF, CUBE_HALF, CUBE_HALF],
];

const CENTER_POSITION: [number, number, number] = [0, 0, 0];

/** All 9 node positions (centre + 8 corners) */
function getNodePositions(): [number, number, number][] {
  return [CENTER_POSITION, ...CORNER_POSITIONS];
}

/** 12 cube edges (pairs of corner indices, 0-based offset into CORNER_POSITIONS) */
const CUBE_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0], // bottom face
  [4, 5], [5, 6], [6, 7], [7, 4], // top face
  [0, 4], [1, 5], [2, 6], [3, 7], // verticals
];

/** Build all beam connections (centre-to-corner + cube edges) using global indices */
function getBeamPairs(): [number, number][] {
  const pairs: [number, number][] = [];
  // Centre (index 0) to each corner (indices 1-8)
  for (let i = 1; i <= 8; i++) {
    pairs.push([0, i]);
  }
  // Cube edges – corner indices are offset by 1 in the full array
  for (const [a, b] of CUBE_EDGES) {
    pairs.push([a + 1, b + 1]);
  }
  return pairs;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function midpoint(
  a: [number, number, number],
  b: [number, number, number],
): [number, number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

function distance(
  a: [number, number, number],
  b: [number, number, number],
): number {
  return Math.sqrt(
    (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2,
  );
}

/** Quaternion that rotates +Y axis to point from `a` toward `b` */
function orientationBetween(
  a: [number, number, number],
  b: [number, number, number],
): THREE.Quaternion {
  const dir = new THREE.Vector3(
    b[0] - a[0],
    b[1] - a[1],
    b[2] - a[2],
  ).normalize();
  const quat = new THREE.Quaternion();
  quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return quat;
}

// ---------------------------------------------------------------------------
// Sphere (Agent Node)
// ---------------------------------------------------------------------------

interface SphereProps {
  agent: AtomiumAgent;
  position: [number, number, number];
  isSelected: boolean;
  isFaded: boolean;
  onClick: () => void;
  onHover: (hovering: boolean) => void;
}

function Sphere({
  agent,
  position,
  isSelected,
  isFaded,
  onClick,
  onHover,
}: SphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const [hovered, setHovered] = useState(false);

  const color = new THREE.Color(STATUS_COLORS[agent.status]);
  const isAnimated = agent.status === 'working';
  const isActive = agent.status === 'active' || agent.status === 'working';

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();

    // Pulse / breathe when working
    let targetScale = 1;
    if (isAnimated) {
      targetScale = 1 + Math.sin(t * 3) * 0.08;
    }
    if (hovered) {
      targetScale *= 1.12;
    }
    if (isSelected) {
      targetScale *= 1.15;
    }

    const s = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.1);
    meshRef.current.scale.setScalar(s);

    // Emissive intensity pulsing for active agents
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    if (mat) {
      const baseIntensity = isActive ? 0.4 : 0.05;
      const pulse = isAnimated ? Math.sin(t * 4) * 0.2 : 0;
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        baseIntensity + pulse + (hovered ? 0.3 : 0),
        0.1,
      );
    }

    // Point light intensity
    if (lightRef.current) {
      lightRef.current.intensity = THREE.MathUtils.lerp(
        lightRef.current.intensity,
        isActive ? 1.5 + (hovered ? 1 : 0) : 0.2,
        0.1,
      );
    }
  });

  const handlePointerOver = useCallback(
    (e: THREE.Event) => {
      (e as any).stopPropagation();
      setHovered(true);
      onHover(true);
      document.body.style.cursor = 'pointer';
    },
    [onHover],
  );

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    onHover(false);
    document.body.style.cursor = 'auto';
  }, [onHover]);

  const handleClick = useCallback(
    (e: THREE.Event) => {
      (e as any).stopPropagation();
      onClick();
    },
    [onClick],
  );

  return (
    <group position={position}>
      {/* Inner point light */}
      <pointLight
        ref={lightRef}
        color={color}
        intensity={isActive ? 1.5 : 0.2}
        distance={6}
        decay={2}
      />

      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.65, 48, 48]} />
        <meshPhysicalMaterial
          color="#e0e0e0"
          metalness={0.6}
          roughness={0.15}
          transmission={0.3}
          thickness={1.2}
          ior={1.5}
          emissive={color}
          emissiveIntensity={isActive ? 0.4 : 0.05}
          transparent
          opacity={isFaded ? 0.2 : 1}
          envMapIntensity={1}
        />
      </mesh>

      {/* Status ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.78, 0.03, 16, 64]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={isFaded ? 0.1 : 0.9}
        />
      </mesh>

      {/* Floating label */}
      <Html
        position={[0, 1.1, 0]}
        center
        distanceFactor={12}
        style={{
          pointerEvents: 'none',
          opacity: isFaded ? 0.15 : 1,
          transition: 'opacity 0.4s ease',
        }}
      >
        <div
          style={{
            background: 'rgba(10,10,10,0.85)',
            backdropFilter: 'blur(8px)',
            padding: '4px 10px',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
            fontSize: '11px',
            fontWeight: 600,
            color: '#fff',
            border: `1px solid ${STATUS_COLORS[agent.status]}44`,
            userSelect: 'none',
          }}
        >
          {agent.name}
        </div>
      </Html>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Beam (Connection Tube)
// ---------------------------------------------------------------------------

interface BeamProps {
  start: [number, number, number];
  end: [number, number, number];
  isActive: boolean;
  isFaded: boolean;
}

function Beam({ start, end, isActive, isFaded }: BeamProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const particleRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(Math.random()); // stagger particles

  const mid = useMemo(() => midpoint(start, end), [start, end]);
  const len = useMemo(() => distance(start, end), [start, end]);
  const quat = useMemo(() => orientationBetween(start, end), [start, end]);

  useFrame((_, delta) => {
    // Animate particle along beam
    if (particleRef.current && isActive) {
      progressRef.current += delta * 0.6;
      if (progressRef.current > 1) progressRef.current = 0;

      const t = progressRef.current;
      particleRef.current.position.set(
        start[0] + (end[0] - start[0]) * t,
        start[1] + (end[1] - start[1]) * t,
        start[2] + (end[2] - start[2]) * t,
      );
      particleRef.current.visible = true;
    } else if (particleRef.current) {
      particleRef.current.visible = false;
    }
  });

  return (
    <>
      {/* Tube */}
      <mesh
        ref={meshRef}
        position={mid}
        quaternion={quat}
      >
        <cylinderGeometry args={[0.04, 0.04, len, 8, 1]} />
        <meshPhysicalMaterial
          color="#c0c0c0"
          metalness={0.8}
          roughness={0.25}
          transparent
          opacity={isFaded ? 0.08 : 0.7}
        />
      </mesh>

      {/* Traveling particle */}
      {isActive && (
        <mesh ref={particleRef}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial
            color="#D4AF37"
            emissive="#D4AF37"
            emissiveIntensity={2}
            transparent
            opacity={isFaded ? 0.05 : 0.95}
          />
        </mesh>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Agent Detail Overlay (shown when zoomed in)
// ---------------------------------------------------------------------------

interface AgentOverlayProps {
  agent: AtomiumAgent;
  position: [number, number, number];
  onChat?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
}

function AgentOverlay({
  agent,
  position,
  onChat,
  onEdit,
  onDuplicate,
}: AgentOverlayProps) {
  const statusLabel =
    agent.status.charAt(0).toUpperCase() + agent.status.slice(1);

  return (
    <Html position={position} center distanceFactor={8} zIndexRange={[100, 0]}>
      <div
        style={{
          background: 'rgba(10,10,10,0.92)',
          backdropFilter: 'blur(20px)',
          borderRadius: '14px',
          padding: '20px 24px',
          minWidth: '240px',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          userSelect: 'none',
        }}
      >
        {/* Agent name */}
        <div
          style={{
            fontSize: '18px',
            fontWeight: 700,
            marginBottom: '4px',
            letterSpacing: '-0.02em',
          }}
        >
          {agent.name}
        </div>

        {/* Role */}
        <div
          style={{
            fontSize: '13px',
            color: '#a1a1aa',
            marginBottom: '12px',
          }}
        >
          {agent.role}
        </div>

        {/* Provider + Model */}
        <div
          style={{
            fontSize: '12px',
            color: '#71717a',
            marginBottom: '6px',
            display: 'flex',
            gap: '6px',
          }}
        >
          <span
            style={{
              background: 'rgba(255,255,255,0.08)',
              padding: '2px 8px',
              borderRadius: '4px',
            }}
          >
            {agent.provider}
          </span>
          <span
            style={{
              background: 'rgba(255,255,255,0.08)',
              padding: '2px 8px',
              borderRadius: '4px',
            }}
          >
            {agent.model}
          </span>
        </div>

        {/* Status badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '16px',
            color: STATUS_COLORS[agent.status],
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: STATUS_COLORS[agent.status],
              display: 'inline-block',
              boxShadow: `0 0 6px ${STATUS_COLORS[agent.status]}`,
            }}
          />
          {statusLabel}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <OverlayButton label="Chat" onClick={onChat} />
          <OverlayButton label="Edit" onClick={onEdit} />
          <OverlayButton label="Duplicate" onClick={onDuplicate} />
        </div>
      </div>
    </Html>
  );
}

function OverlayButton({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      style={{
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '8px',
        padding: '6px 14px',
        color: '#fff',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          'rgba(255,255,255,0.2)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          'rgba(255,255,255,0.1)';
      }}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Camera Controller
// ---------------------------------------------------------------------------

interface CameraControllerProps {
  targetPosition: [number, number, number] | null;
  isZoomed: boolean;
  controlsRef: React.RefObject<any>;
}

function CameraController({
  targetPosition,
  isZoomed,
  controlsRef,
}: CameraControllerProps) {
  const { camera } = useThree();
  const defaultPos = useRef(new THREE.Vector3(0, 0, 15));
  const lerpTarget = useRef(new THREE.Vector3());
  const lerpLookAt = useRef(new THREE.Vector3());
  const transitionProgress = useRef(0);

  useEffect(() => {
    // Reset transition progress on zoom state change
    transitionProgress.current = 0;
  }, [isZoomed, targetPosition]);

  useFrame(() => {
    if (transitionProgress.current >= 1) return;

    transitionProgress.current = Math.min(
      transitionProgress.current + 0.02,
      1,
    );
    const t = easeInOutCubic(transitionProgress.current);

    if (isZoomed && targetPosition) {
      // Compute a camera position offset from the target sphere
      const offset = new THREE.Vector3(
        targetPosition[0] * 0.3 + 2.5,
        targetPosition[1] * 0.3 + 1.5,
        targetPosition[2] * 0.3 + 5,
      );
      lerpTarget.current.lerpVectors(defaultPos.current, offset, t);
      lerpLookAt.current.set(
        targetPosition[0],
        targetPosition[1],
        targetPosition[2],
      );
    } else {
      // Return to default
      const currentPos = camera.position.clone();
      lerpTarget.current.lerpVectors(currentPos, defaultPos.current, t);
      lerpLookAt.current.set(0, 0, 0);
    }

    camera.position.copy(lerpTarget.current);
    camera.lookAt(lerpLookAt.current);

    // Update orbit controls target
    if (controlsRef.current) {
      controlsRef.current.target.lerp(lerpLookAt.current, t);
      controlsRef.current.update();
    }
  });

  return null;
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

// ---------------------------------------------------------------------------
// Single Atomium Structure
// ---------------------------------------------------------------------------

interface AtomiumStructureProps {
  agents: AtomiumAgent[];
  positions: [number, number, number][];
  beamPairs: [number, number][];
  selectedId: string | null;
  onAgentClick: (agentId: string) => void;
  onAgentHover: (agentId: string | null) => void;
  offset?: [number, number, number];
  scale?: number;
}

function AtomiumStructure({
  agents,
  positions,
  beamPairs,
  selectedId,
  onAgentClick,
  onAgentHover,
  offset = [0, 0, 0],
  scale = 1,
}: AtomiumStructureProps) {
  const anySelected = selectedId !== null;

  // Map agents to positions (cycle if fewer agents than positions)
  const agentAtNode = useMemo(() => {
    return positions.map((_, i) => agents[i % agents.length]);
  }, [agents, positions]);

  return (
    <group position={offset} scale={[scale, scale, scale]}>
      {/* Beams */}
      {beamPairs.map(([a, b], i) => {
        const agentA = agentAtNode[a];
        const agentB = agentAtNode[b];
        const isBeamActive =
          agentA?.status === 'active' ||
          agentA?.status === 'working' ||
          agentB?.status === 'active' ||
          agentB?.status === 'working';
        const isFaded =
          anySelected &&
          selectedId !== agentA?.id &&
          selectedId !== agentB?.id;

        return (
          <Beam
            key={`beam-${i}`}
            start={positions[a]}
            end={positions[b]}
            isActive={isBeamActive}
            isFaded={isFaded}
          />
        );
      })}

      {/* Spheres */}
      {positions.map((pos, i) => {
        const agent = agentAtNode[i];
        if (!agent) return null;

        const isSelected = selectedId === agent.id;
        const isFaded = anySelected && !isSelected;

        return (
          <Sphere
            key={`sphere-${agent.id}-${i}`}
            agent={agent}
            position={pos}
            isSelected={isSelected}
            isFaded={isFaded}
            onClick={() => onAgentClick(agent.id)}
            onHover={(hovering) =>
              onAgentHover(hovering ? agent.id : null)
            }
          />
        );
      })}

      {/* Agent detail overlay when selected */}
      {selectedId &&
        positions.map((pos, i) => {
          const agent = agentAtNode[i];
          if (!agent || agent.id !== selectedId) return null;
          return (
            <AgentOverlay
              key={`overlay-${agent.id}`}
              agent={agent}
              position={[pos[0], pos[1] - 1.6, pos[2]]}
            />
          );
        })}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Hive Mode: Multiple Atomiums linked together
// ---------------------------------------------------------------------------

interface HiveLayoutProps {
  agents: AtomiumAgent[];
  selectedId: string | null;
  onAgentClick: (agentId: string) => void;
  onAgentHover: (agentId: string | null) => void;
}

function HiveLayout({
  agents,
  selectedId,
  onAgentClick,
  onAgentHover,
}: HiveLayoutProps) {
  const positions = useMemo(() => getNodePositions(), []);
  const beamPairs = useMemo(() => getBeamPairs(), []);
  const nodesPerAtomium = 9;

  // Split agents across 2-4 Atomiums
  const atomiumCount = Math.min(4, Math.max(2, Math.ceil(agents.length / nodesPerAtomium)));
  const atomiums = useMemo(() => {
    const result: AtomiumAgent[][] = [];
    for (let i = 0; i < atomiumCount; i++) {
      const start = i * nodesPerAtomium;
      const chunk = agents.slice(start, start + nodesPerAtomium);
      if (chunk.length > 0) result.push(chunk);
    }
    // If we have fewer agents, pad first atomium
    if (result.length === 0) result.push(agents);
    return result;
  }, [agents, atomiumCount]);

  const spacing = 7;
  const offsets: [number, number, number][] = useMemo(() => {
    const totalWidth = (atomiums.length - 1) * spacing;
    return atomiums.map((_, i) => [
      -totalWidth / 2 + i * spacing,
      0,
      0,
    ]);
  }, [atomiums, spacing]);

  return (
    <group>
      {atomiums.map((chunk, i) => (
        <AtomiumStructure
          key={`atomium-${i}`}
          agents={chunk}
          positions={positions}
          beamPairs={beamPairs}
          selectedId={selectedId}
          onAgentClick={onAgentClick}
          onAgentHover={onAgentHover}
          offset={offsets[i]}
          scale={0.7}
        />
      ))}

      {/* Link beams between adjacent Atomiums */}
      {offsets.length > 1 &&
        offsets.slice(0, -1).map((off, i) => {
          const nextOff = offsets[i + 1];
          return (
            <Beam
              key={`hive-link-${i}`}
              start={[off[0] + CUBE_HALF * 0.7, 0, 0]}
              end={[nextOff[0] - CUBE_HALF * 0.7, 0, 0]}
              isActive={true}
              isFaded={false}
            />
          );
        })}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Army Mode: Grid of mini-Atomiums
// ---------------------------------------------------------------------------

interface ArmyLayoutProps {
  agents: AtomiumAgent[];
  selectedId: string | null;
  onAgentClick: (agentId: string) => void;
  onAgentHover: (agentId: string | null) => void;
}

function ArmyLayout({
  agents,
  selectedId,
  onAgentClick,
  onAgentHover,
}: ArmyLayoutProps) {
  const positions = useMemo(() => getNodePositions(), []);
  const beamPairs = useMemo(() => getBeamPairs(), []);
  const nodesPerAtomium = 9;

  const atomiumCount = Math.max(1, Math.ceil(agents.length / nodesPerAtomium));
  const cols = Math.ceil(Math.sqrt(atomiumCount));
  const rows = Math.ceil(atomiumCount / cols);

  const atomiums = useMemo(() => {
    const result: AtomiumAgent[][] = [];
    for (let i = 0; i < atomiumCount; i++) {
      const start = i * nodesPerAtomium;
      const chunk = agents.slice(start, start + nodesPerAtomium);
      if (chunk.length > 0) result.push(chunk);
    }
    if (result.length === 0) result.push(agents);
    return result;
  }, [agents, atomiumCount]);

  const spacing = 8;

  return (
    <group>
      {atomiums.map((chunk, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = (col - (cols - 1) / 2) * spacing;
        const y = ((rows - 1) / 2 - row) * spacing;

        return (
          <AtomiumStructure
            key={`army-${i}`}
            agents={chunk}
            positions={positions}
            beamPairs={beamPairs}
            selectedId={selectedId}
            onAgentClick={onAgentClick}
            onAgentHover={onAgentHover}
            offset={[x, y, 0]}
            scale={0.4}
          />
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Scene (inner Canvas content)
// ---------------------------------------------------------------------------

interface SceneProps {
  agents: AtomiumAgent[];
  mode: 'single' | 'hive' | 'army';
  selectedAgentId: string | null;
  onAgentClick: (agentId: string) => void;
  onAgentHover: (agentId: string | null) => void;
  onDeselect: () => void;
}

function Scene({
  agents,
  mode,
  selectedAgentId,
  onAgentClick,
  onAgentHover,
  onDeselect,
}: SceneProps) {
  const controlsRef = useRef<any>(null);
  const positions = useMemo(() => getNodePositions(), []);
  const beamPairs = useMemo(() => getBeamPairs(), []);

  const isZoomed = selectedAgentId !== null;

  // Find the position of the selected agent
  const selectedPosition = useMemo<[number, number, number] | null>(() => {
    if (!selectedAgentId) return null;
    const idx = agents.findIndex((a) => a.id === selectedAgentId);
    if (idx === -1) return null;
    // Single mode uses direct positions; hive/army use offset structures
    if (mode === 'single') {
      return positions[idx % positions.length];
    }
    return null; // For hive/army, camera doesn't zoom to individual sphere
  }, [selectedAgentId, agents, positions, mode]);

  // Handle background click to deselect
  const handlePointerMissed = useCallback(() => {
    onDeselect();
  }, [onDeselect]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} color="#e0e8ff" />
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.8}
        color="#fff5e0"
        castShadow
      />
      <directionalLight
        position={[-5, -5, -5]}
        intensity={0.15}
        color="#c0c8ff"
      />

      {/* Atomium structure based on mode */}
      <group onPointerMissed={handlePointerMissed}>
        {mode === 'single' && (
          <AtomiumStructure
            agents={agents}
            positions={positions}
            beamPairs={beamPairs}
            selectedId={selectedAgentId}
            onAgentClick={onAgentClick}
            onAgentHover={onAgentHover}
          />
        )}

        {mode === 'hive' && (
          <HiveLayout
            agents={agents}
            selectedId={selectedAgentId}
            onAgentClick={onAgentClick}
            onAgentHover={onAgentHover}
          />
        )}

        {mode === 'army' && (
          <ArmyLayout
            agents={agents}
            selectedId={selectedAgentId}
            onAgentClick={onAgentClick}
            onAgentHover={onAgentHover}
          />
        )}
      </group>

      {/* Camera animation */}
      <CameraController
        targetPosition={selectedPosition}
        isZoomed={isZoomed && mode === 'single'}
        controlsRef={controlsRef}
      />

      {/* Orbit controls */}
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={!isZoomed}
        autoRotateSpeed={0.5}
        minDistance={5}
        maxDistance={mode === 'army' ? 40 : 25}
        dampingFactor={0.08}
        enableDamping
      />

      {/* Bloom disabled - Three.js version compat */}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main AtomiumView Component
// ---------------------------------------------------------------------------

export default function AtomiumView({
  agents,
  onAgentClick,
  onAgentHover,
  selectedAgentId = null,
  mode = 'single',
  className,
}: AtomiumViewProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    selectedAgentId,
  );

  // Sync external prop
  useEffect(() => {
    setInternalSelectedId(selectedAgentId);
  }, [selectedAgentId]);

  // Escape key to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInternalSelectedId(null);
        onAgentClick?.('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAgentClick]);

  const handleAgentClick = useCallback(
    (agentId: string) => {
      setInternalSelectedId((prev) => (prev === agentId ? null : agentId));
      onAgentClick?.(agentId);
    },
    [onAgentClick],
  );

  const handleAgentHover = useCallback(
    (agentId: string | null) => {
      onAgentHover?.(agentId);
    },
    [onAgentHover],
  );

  const handleDeselect = useCallback(() => {
    setInternalSelectedId(null);
  }, []);

  // Determine camera distance based on mode
  const cameraZ = mode === 'army' ? 25 : mode === 'hive' ? 18 : 15;

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        position: 'relative',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, cameraZ], fov: 50, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        style={{ width: '100%', height: '100%' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
        }}
      >
        <Scene
          agents={agents}
          mode={mode}
          selectedAgentId={internalSelectedId}
          onAgentClick={handleAgentClick}
          onAgentHover={handleAgentHover}
          onDeselect={handleDeselect}
        />
      </Canvas>

      {/* Mode indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          background: 'rgba(10,10,10,0.7)',
          backdropFilter: 'blur(8px)',
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#71717a',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          border: '1px solid rgba(255,255,255,0.06)',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {mode.toUpperCase()} MODE
        {' '}
        <span style={{ color: '#D4AF37' }}>{agents.length} agents</span>
      </div>

      {/* Keyboard hint */}
      {internalSelectedId && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(10,10,10,0.7)',
            backdropFilter: 'blur(8px)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#71717a',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
            border: '1px solid rgba(255,255,255,0.06)',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          Press ESC to zoom out
        </div>
      )}
    </div>
  );
}
