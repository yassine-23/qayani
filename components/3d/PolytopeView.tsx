'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { generatePolytope, type TeamStructure, type PolytopeGeometry } from '@/lib/polytopes/geometry';

// ── Agent Node (sphere at polytope vertex) ──────────────────────────────────

function AgentNode({
  position,
  isSelected,
  isManager,
  status = 'idle',
  onClick,
}: {
  position: [number, number, number];
  isSelected?: boolean;
  isManager?: boolean;
  status?: 'active' | 'working' | 'idle' | 'error';
  onClick?: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const color = useMemo(() => {
    if (isSelected) return '#00FF66';
    switch (status) {
      case 'active': return '#00FF66';
      case 'working': return '#FBBF24';
      case 'error': return '#EF4444';
      default: return '#666680';
    }
  }, [status, isSelected]);

  useFrame((state) => {
    if (meshRef.current) {
      const scale = isSelected ? 1.3 : isManager ? 1.1 : 0.85;
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 2) * 0.08;
    }
  });

  return (
    <group position={position}>
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
        <mesh ref={meshRef} onClick={onClick}>
          <sphereGeometry args={[0.18, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isSelected ? 0.8 : 0.4}
            metalness={0.7}
            roughness={0.2}
          />
        </mesh>
        {/* Outer glow */}
        <mesh ref={glowRef} scale={2.5}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.12} />
        </mesh>
      </Float>
    </group>
  );
}

// ── Edge Beam ───────────────────────────────────────────────────────────────

function EdgeBeam({
  start,
  end,
  isActive,
}: {
  start: [number, number, number];
  end: [number, number, number];
  isActive?: boolean;
}) {
  const geo = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...start),
      new THREE.Vector3(...end),
    ]);
  }, [start, end]);

  const mat = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: isActive ? '#00FF66' : '#333344',
      transparent: true,
      opacity: isActive ? 0.6 : 0.15,
    });
  }, [isActive]);

  return <primitive object={new THREE.Line(geo, mat)} />;
}

// ── Polytope Scene ──────────────────────────────────────────────────────────

function PolytopeScene({
  structure,
  selectedNodeIndex,
  onNodeClick,
  autoRotate4D = true,
}: {
  structure: TeamStructure;
  selectedNodeIndex?: number;
  onNodeClick?: (index: number) => void;
  autoRotate4D?: boolean;
}) {
  const rotationRef = useRef(0);
  const geometryRef = useRef<PolytopeGeometry>(generatePolytope(structure, 0));

  useFrame((_, delta) => {
    if (autoRotate4D && structure !== 'tetrahedron') {
      rotationRef.current += delta * 0.15;
      geometryRef.current = generatePolytope(structure, rotationRef.current);
    }
  });

  // For tetrahedron, generate once
  const staticGeometry = useMemo(() => {
    if (structure === 'tetrahedron') return generatePolytope(structure, 0);
    return null;
  }, [structure]);

  const geo = staticGeometry || geometryRef.current;

  return (
    <group>
      {/* Stars background */}
      <Stars radius={100} depth={50} count={2000} factor={3} saturation={0} fade speed={0.5} />

      {/* Ambient atmosphere */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-5, -5, 5]} intensity={0.3} color="#00FF66" />

      {/* Edges */}
      {geo.edges.map(([a, b], i) => (
        <EdgeBeam
          key={`edge-${i}`}
          start={geo.vertices[a]}
          end={geo.vertices[b]}
          isActive={selectedNodeIndex === a || selectedNodeIndex === b}
        />
      ))}

      {/* Nodes */}
      {geo.vertices.map((pos, i) => (
        <AgentNode
          key={`node-${i}`}
          position={pos}
          isSelected={selectedNodeIndex === i}
          isManager={i === geo.vertices.length - 1 && structure === 'tetrahedron'}
          status={i === selectedNodeIndex ? 'active' : i < 2 ? 'working' : 'idle'}
          onClick={() => onNodeClick?.(i)}
        />
      ))}
    </group>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function PolytopeView({
  structure = 'tetrahedron',
  selectedNodeIndex,
  onNodeClick,
  className = '',
  interactive = true,
}: {
  structure?: TeamStructure;
  selectedNodeIndex?: number;
  onNodeClick?: (index: number) => void;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <PolytopeScene
          structure={structure}
          selectedNodeIndex={selectedNodeIndex}
          onNodeClick={onNodeClick}
        />
        <OrbitControls
          enableZoom={interactive}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          maxDistance={15}
          minDistance={4}
        />
      </Canvas>
    </div>
  );
}
