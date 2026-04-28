'use client';

import { useRef, useMemo, useEffect, Suspense, Component, ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Environment,
  Float,
  ContactShadows,
  RoundedBox,
  Sparkles,
  useGLTF,
} from '@react-three/drei';
import * as THREE from 'three';

/* ══════════════════════════════════════════════════════════════
   INTERACTIVE 3D HEAD
   Tries to load a GLB human model. If the model fails (network,
   CORS, 404), falls back to a premium procedural android head.
   Both versions share the same lighting, particles, and canvas.
   ══════════════════════════════════════════════════════════════ */

type AgentStatus = 'idle' | 'thinking' | 'speaking';

interface InteractiveAgentHeadProps {
  name?: string;
  status?: AgentStatus;
  modelUrl?: string;
  onTap?: () => void;
  className?: string;
}

// ── Error Boundary ─────────────────────────────────────────────
class ModelErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

// ═══════════════════════════════════════════════════════════════
// GLB HUMAN HEAD (loads external model with morph targets)
// ═══════════════════════════════════════════════════════════════
function GLBHead({ modelUrl, status, onTap }: { modelUrl: string; status: AgentStatus; onTap?: () => void }) {
  const { scene } = useGLTF(modelUrl);
  const groupRef = useRef<THREE.Group>(null);
  const mouseTarget = useRef({ x: 0, y: 0 });
  const jawRef = useRef(0);
  const blinkTimer = useRef(0);
  const nextBlink = useRef(2 + Math.random() * 3);
  const blinkPhase = useRef(0);
  const { mouse } = useThree();

  const morphMeshes = useMemo(() => {
    const meshes: THREE.SkinnedMesh[] = [];
    scene.traverse((child) => {
      const m = child as THREE.SkinnedMesh;
      if (m.isSkinnedMesh && m.morphTargetDictionary) meshes.push(m);
    });
    return meshes;
  }, [scene]);

  const setMorph = (name: string, value: number, lerp = 0.15) => {
    morphMeshes.forEach((mesh) => {
      const idx = mesh.morphTargetDictionary?.[name];
      if (idx !== undefined && mesh.morphTargetInfluences)
        mesh.morphTargetInfluences[idx] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[idx] || 0, value, lerp);
    });
  };

  useEffect(() => {
    scene.traverse((child) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat?.isMeshStandardMaterial) { mat.envMapIntensity = 1.4; mat.needsUpdate = true; }
    });
  }, [scene]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const t = _.clock.getElapsedTime();

    mouseTarget.current.x = THREE.MathUtils.lerp(mouseTarget.current.x, mouse.x * 0.35, 0.04);
    mouseTarget.current.y = THREE.MathUtils.lerp(mouseTarget.current.y, mouse.y * 0.25, 0.04);

    const neck = scene.getObjectByName('Neck');
    const head = scene.getObjectByName('Head');
    if (neck) {
      neck.rotation.y = THREE.MathUtils.lerp(neck.rotation.y, mouseTarget.current.x, 0.08);
      neck.rotation.x = THREE.MathUtils.lerp(neck.rotation.x, -mouseTarget.current.y * 0.6, 0.08);
    }
    if (head) {
      head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, mouseTarget.current.x * 0.4, 0.06);
    }

    groupRef.current.position.y = -1.55 + Math.sin(t * 0.7) * 0.008;

    // Blinking
    blinkTimer.current += delta;
    if (blinkPhase.current > 0) {
      blinkPhase.current += delta * 8;
      const v = blinkPhase.current < 1 ? blinkPhase.current : 2 - blinkPhase.current;
      setMorph('eyeBlinkLeft', THREE.MathUtils.clamp(v, 0, 1), 0.5);
      setMorph('eyeBlinkRight', THREE.MathUtils.clamp(v, 0, 1), 0.5);
      if (blinkPhase.current >= 2) { blinkPhase.current = 0; blinkTimer.current = 0; nextBlink.current = 2 + Math.random() * 4; }
    } else {
      setMorph('eyeBlinkLeft', 0, 0.3); setMorph('eyeBlinkRight', 0, 0.3);
      if (blinkTimer.current > nextBlink.current) blinkPhase.current = 0.01;
    }

    // Expressions by status
    if (status === 'speaking') {
      const jaw = Math.abs(Math.sin(t * 7.5)) * 0.45 + Math.abs(Math.sin(t * 13)) * 0.2;
      jawRef.current = THREE.MathUtils.lerp(jawRef.current, jaw, 0.25);
      setMorph('jawOpen', jawRef.current, 0.3);
      setMorph('mouthFunnel', Math.abs(Math.sin(t * 5.5)) * 0.25, 0.15);
      setMorph('mouthPucker', Math.abs(Math.sin(t * 3.5)) * 0.15, 0.12);
      setMorph('browInnerUp', 0.15 + Math.sin(t * 2) * 0.1, 0.08);
      setMorph('eyeSquintLeft', 0, 0.1); setMorph('eyeSquintRight', 0, 0.1);
      setMorph('mouthSmile', 0.05, 0.05);
    } else if (status === 'thinking') {
      jawRef.current = THREE.MathUtils.lerp(jawRef.current, 0, 0.1);
      setMorph('jawOpen', 0, 0.15);
      setMorph('eyeSquintLeft', 0.35, 0.06); setMorph('eyeSquintRight', 0.35, 0.06);
      setMorph('browDownLeft', 0.3, 0.05); setMorph('browDownRight', 0.3, 0.05);
      setMorph('browInnerUp', 0.4, 0.05);
      setMorph('mouthPressLeft', 0.2, 0.05); setMorph('mouthPressRight', 0.2, 0.05);
    } else {
      jawRef.current = THREE.MathUtils.lerp(jawRef.current, 0, 0.08);
      setMorph('jawOpen', 0, 0.1);
      setMorph('mouthSmile', 0.06, 0.03);
      setMorph('eyeSquintLeft', 0, 0.05); setMorph('eyeSquintRight', 0, 0.05);
      setMorph('browDownLeft', 0, 0.03); setMorph('browDownRight', 0, 0.03);
      setMorph('browInnerUp', 0, 0.03);
      setMorph('mouthFunnel', 0, 0.05); setMorph('mouthPucker', 0, 0.05);
      setMorph('mouthPressLeft', 0, 0.05); setMorph('mouthPressRight', 0, 0.05);
    }
  });

  return <group ref={groupRef} onClick={onTap} dispose={null}><primitive object={scene} /></group>;
}

// ═══════════════════════════════════════════════════════════════
// PROCEDURAL ANDROID HEAD (always works, no external deps)
// ═══════════════════════════════════════════════════════════════
function ProceduralHead({ status, onTap }: { status: AgentStatus; onTap?: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const jawRef = useRef<THREE.Group>(null);
  const leftIrisRef = useRef<THREE.Group>(null);
  const rightIrisRef = useRef<THREE.Group>(null);
  const { mouse } = useThree();
  const mouseSmooth = useRef({ x: 0, y: 0 });

  const neon = useMemo(() => new THREE.Color('#00FF66'), []);
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0d0d12', metalness: 0.92, roughness: 0.12, envMapIntensity: 1.5 }), []);
  const panelMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0a0a10', metalness: 0.95, roughness: 0.08, envMapIntensity: 2 }), []);
  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#00FF66', emissive: '#00FF66', emissiveIntensity: 3, metalness: 0.5, roughness: 0.3 }), []);
  const accentDim = useMemo(() => new THREE.MeshStandardMaterial({ color: '#00FF66', emissive: '#00FF66', emissiveIntensity: 1, metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0.6 }), []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    mouseSmooth.current.x = THREE.MathUtils.lerp(mouseSmooth.current.x, mouse.x, 0.04);
    mouseSmooth.current.y = THREE.MathUtils.lerp(mouseSmooth.current.y, mouse.y, 0.04);

    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, mouseSmooth.current.x * 0.3, 0.04);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, mouseSmooth.current.y * 0.15, 0.04);
      groupRef.current.position.y = Math.sin(t * 0.8) * 0.03;
    }

    // Jaw
    if (jawRef.current) {
      const jawTarget = status === 'speaking' ? Math.abs(Math.sin(t * 8)) * 0.12 + Math.abs(Math.sin(t * 12)) * 0.06 : 0;
      jawRef.current.position.y = THREE.MathUtils.lerp(jawRef.current.position.y, -0.45 - jawTarget, 0.15);
      jawRef.current.rotation.x = THREE.MathUtils.lerp(jawRef.current.rotation.x, jawTarget * 0.5, 0.15);
    }

    // Eyes
    const ex = mouseSmooth.current.x * 0.06, ey = mouseSmooth.current.y * 0.04;
    [leftIrisRef, rightIrisRef].forEach(ref => {
      if (ref.current) {
        ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, ex, 0.08);
        ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, ey, 0.08);
      }
    });

    accentMat.emissiveIntensity = status === 'speaking' ? 4 + Math.sin(t * 5) : status === 'thinking' ? 2 + Math.sin(t * 2) : 3;
    if (status === 'thinking') { accentMat.emissive.set('#FFB800'); accentDim.emissive.set('#FFB800'); }
    else { accentMat.emissive.lerp(neon, 0.05); accentDim.emissive.lerp(neon, 0.05); }
  });

  return (
    <group ref={groupRef} onClick={onTap}>
      <RoundedBox args={[1.4, 1.7, 1.35]} radius={0.35} smoothness={8} material={bodyMat} position={[0, 0.2, 0]} />
      <RoundedBox args={[0.3, 0.15, 1.1]} radius={0.06} smoothness={4} material={panelMat} position={[0, 1.12, -0.05]} />
      <RoundedBox args={[0.08, 0.08, 0.9]} radius={0.03} smoothness={4} material={accentDim} position={[0, 1.2, -0.05]} />
      <RoundedBox args={[1.15, 1.25, 0.15]} radius={0.2} smoothness={6} material={panelMat} position={[0, 0.1, 0.62]} />
      <RoundedBox args={[1.1, 0.12, 0.2]} radius={0.04} smoothness={4} material={panelMat} position={[0, 0.55, 0.6]} />
      <RoundedBox args={[0.9, 0.025, 0.05]} radius={0.01} smoothness={4} material={accentMat} position={[0, 0.48, 0.72]} />
      <pointLight position={[0, 0.45, 0.9]} intensity={0.8} color="#00FF66" distance={2} />

      {/* Eyes */}
      {[[-0.28, 0.28], [0.28, 0.28]].map(([x, y], i) => (
        <group key={i} position={[x, y, 0.62]}>
          <mesh><cylinderGeometry args={[0.18, 0.18, 0.1, 32]} /><meshStandardMaterial color="#020204" metalness={0.95} roughness={0.05} /></mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.04]}><torusGeometry args={[0.16, 0.015, 16, 48]} /><primitive object={accentDim} /></mesh>
          <group ref={i === 0 ? leftIrisRef : rightIrisRef}>
            <mesh position={[0, 0, 0.06]}><circleGeometry args={[0.1, 32]} /><meshBasicMaterial color="#00FF66" transparent opacity={0.85} /></mesh>
            <mesh position={[0, 0, 0.065]}><circleGeometry args={[0.04, 32]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.9} /></mesh>
          </group>
        </group>
      ))}

      <RoundedBox args={[0.6, 0.08, 0.15]} radius={0.03} smoothness={4} material={panelMat} position={[0, -0.28, 0.64]} />
      <RoundedBox args={[0.4, 0.015, 0.04]} radius={0.005} smoothness={4} material={accentMat} position={[0, -0.32, 0.72]} />

      <group ref={jawRef} position={[0, -0.45, 0]}>
        <RoundedBox args={[1.1, 0.4, 1.15]} radius={0.2} smoothness={6} material={bodyMat} />
        <RoundedBox args={[0.3, 0.02, 0.06]} radius={0.008} smoothness={4} material={accentDim} position={[0, -0.15, 0.55]} />
      </group>

      <RoundedBox args={[0.12, 0.7, 0.9]} radius={0.04} smoothness={4} material={panelMat} position={[-0.72, 0.2, -0.05]} />
      <RoundedBox args={[0.02, 0.4, 0.04]} radius={0.008} smoothness={4} material={accentDim} position={[-0.79, 0.25, 0.15]} />
      <RoundedBox args={[0.12, 0.7, 0.9]} radius={0.04} smoothness={4} material={panelMat} position={[0.72, 0.2, -0.05]} />
      <RoundedBox args={[0.02, 0.4, 0.04]} radius={0.008} smoothness={4} material={accentDim} position={[0.79, 0.25, 0.15]} />

      <mesh position={[0, -0.85, 0]}><cylinderGeometry args={[0.3, 0.35, 0.4, 32]} /><meshStandardMaterial color="#0a0a10" metalness={0.95} roughness={0.1} /></mesh>
      {[0, 1, 2].map(i => (
        <mesh key={i} position={[0, -0.72 - i * 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.32 + i * 0.01, 0.008, 8, 48]} /><primitive object={accentDim} />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCENE (shared lighting + env for both head types)
// ═══════════════════════════════════════════════════════════════
function Scene({ status, modelUrl, onTap }: { status: AgentStatus; modelUrl?: string; onTap?: () => void }) {
  return (
    <>
      <Environment preset="apartment" />
      <directionalLight position={[-2.5, 3, 4]} intensity={2.2} color="#fff5e6" castShadow />
      <directionalLight position={[3, 1, 3]} intensity={0.7} color="#b0c4ff" />
      <directionalLight position={[0, 2, -4]} intensity={2.5} color="#00FF66" />
      <spotLight position={[0, 4, -2]} angle={0.4} penumbra={0.8} intensity={1.5} color="#ffffff" distance={8} />
      <pointLight position={[0, -1.5, 2]} intensity={0.3} color="#00FF66" distance={4} />
      <pointLight position={[0, 0.3, 1.5]} intensity={0.4} color="#00FF66" distance={3} />
      <ambientLight intensity={0.12} />

      <Float speed={0.8} rotationIntensity={0.02} floatIntensity={0.06}>
        {modelUrl ? (
          <ModelErrorBoundary fallback={<ProceduralHead status={status} onTap={onTap} />}>
            <Suspense fallback={<ProceduralHead status={status} onTap={onTap} />}>
              <GLBHead modelUrl={modelUrl} status={status} onTap={onTap} />
            </Suspense>
          </ModelErrorBoundary>
        ) : (
          <ProceduralHead status={status} onTap={onTap} />
        )}
      </Float>

      <Sparkles count={80} scale={5} size={1.2} speed={0.2} color="#00FF66" opacity={0.15} />
      <Sparkles count={40} scale={4} size={0.6} speed={0.1} color="#ffffff" opacity={0.06} />
      <ContactShadows position={[0, -2.1, 0]} opacity={0.5} scale={6} blur={2.5} far={4} color="#001a0d" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.1, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#020204" metalness={0.95} roughness={0.15} transparent opacity={0.4} />
      </mesh>
    </>
  );
}

// ── EXPORTED COMPONENT ─────────────────────────────────────────
export default function InteractiveAgentHead({
  name = 'Agent',
  status = 'idle',
  modelUrl,
  onTap,
  className = '',
}: InteractiveAgentHeadProps) {
  return (
    <div className={`relative ${className}`}>
      <Suspense fallback={
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-8 h-8 border-2 border-neon/20 border-t-neon rounded-full animate-spin" />
        </div>
      }>
        <Canvas
          camera={{ position: [0, 0.2, 3.2], fov: 30 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
          shadows dpr={[1, 2]} style={{ background: 'transparent' }}
        >
          <Scene status={status} modelUrl={modelUrl} onTap={onTap} />
        </Canvas>
      </Suspense>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/[0.06]">
        <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
          status === 'speaking' ? 'bg-neon shadow-[0_0_10px_rgba(0,255,102,0.8)] animate-pulse'
          : status === 'thinking' ? 'bg-amber-400 shadow-[0_0_10px_rgba(255,184,0,0.6)] animate-pulse'
          : 'bg-neon/40'
        }`} />
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">{status}</span>
        {status === 'speaking' && (
          <div className="flex items-end gap-[2px] h-3 ml-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-[2px] bg-neon/60 rounded-full animate-pulse"
                style={{ height: `${40 + Math.sin(i * 1.2) * 40}%`, animationDelay: `${i * 0.1}s`, animationDuration: '0.4s' }} />
            ))}
          </div>
        )}
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/10">{name}</span>
      </div>
    </div>
  );
}
