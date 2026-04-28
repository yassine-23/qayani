'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, Sphere, Points, PointMaterial, Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

// --- Audio Analysis Hook ---
function useAudioAnalyser(audioUrl: string | null, isSpeaking: boolean) {
    const analyser = useRef<AnalyserNode | null>(null);
    const dataArray = useRef<Uint8Array | null>(null);
    const audioContext = useRef<AudioContext | null>(null);
    const source = useRef<MediaElementAudioSourceNode | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!audioUrl) return;

        if (!audioContext.current) {
            audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = audioUrl;
            audioRef.current.crossOrigin = "anonymous";

            // Re-create source if needed or just reconnect
            if (!source.current) {
                source.current = audioContext.current.createMediaElementSource(audioRef.current);
                analyser.current = audioContext.current.createAnalyser();
                analyser.current.fftSize = 256;
                source.current.connect(analyser.current);
                analyser.current.connect(audioContext.current.destination);
                dataArray.current = new Uint8Array(analyser.current.frequencyBinBinCount);
            }

            if (isSpeaking) {
                audioContext.current.resume().then(() => {
                    audioRef.current?.play().catch(e => console.error("Audio play error:", e));
                });
            }
        }
    }, [audioUrl, isSpeaking]);

    return { analyser, dataArray, audioRef };
}

// --- Ghost/Neural Entity Component ---
function GhostEntity({ isSpeaking, analyser, dataArray, primaryColor = "#00ffff", secondaryColor = "#ffffff" }: {
    isSpeaking: boolean,
    analyser: React.MutableRefObject<AnalyserNode | null>,
    dataArray: React.MutableRefObject<Uint8Array | null>,
    primaryColor?: string,
    secondaryColor?: string
}) {
    const pointsRef = useRef<THREE.Points>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const outerRingRef = useRef<THREE.Mesh>(null);
    const innerRingRef = useRef<THREE.Mesh>(null);

    // Generate particles for a "neural cloud" shape
    const particles = useMemo(() => {
        const count = 6000; // Increased density
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const color1 = new THREE.Color(primaryColor);
        const color2 = new THREE.Color(secondaryColor);

        for (let i = 0; i < count; i++) {
            // More organic, cloud-like distribution
            const r = 1.8 * Math.cbrt(Math.random());
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Mix colors
            const mixedColor = color1.clone().lerp(color2, Math.random());
            colors[i * 3] = mixedColor.r;
            colors[i * 3 + 1] = mixedColor.g;
            colors[i * 3 + 2] = mixedColor.b;
        }
        return { positions, colors };
    }, [primaryColor, secondaryColor]);

    useFrame((state) => {
        if (!pointsRef.current) return;

        const time = state.clock.elapsedTime;

        // Idle animation - slow rotation and breathing
        pointsRef.current.rotation.y = time * 0.05;
        pointsRef.current.rotation.z = Math.sin(time * 0.1) * 0.02;

        // Audio reactivity
        let volume = 0;
        if (isSpeaking && analyser.current && dataArray.current) {
            analyser.current.getByteFrequencyData(dataArray.current as unknown as Uint8Array);
            const sum = dataArray.current.reduce((a, b) => a + b, 0);
            volume = sum / dataArray.current.length;
        }

        const intensity = volume / 255;

        // Pulse the core
        if (coreRef.current) {
            const targetScale = 0.8 + intensity * 0.4;
            coreRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
            (coreRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + intensity * 0.4;
        }

        // Expand particles slightly
        if (pointsRef.current) {
            const targetScale = 1 + intensity * 0.05;
            pointsRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        }

        // Rotate rings
        if (outerRingRef.current) {
            outerRingRef.current.rotation.z -= 0.002 + (intensity * 0.02);
            outerRingRef.current.rotation.x = Math.sin(time * 0.2) * 0.1;
        }
        if (innerRingRef.current) {
            innerRingRef.current.rotation.z += 0.004 + (intensity * 0.04);
            innerRingRef.current.rotation.y = Math.cos(time * 0.3) * 0.1;
        }
    });

    return (
        <group>
            <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
                {/* The Particle Cloud */}
                <Points ref={pointsRef}>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            count={particles.positions.length / 3}
                            array={particles.positions}
                            itemSize={3}
                        />
                        <bufferAttribute
                            attach="attributes-color"
                            count={particles.colors.length / 3}
                            array={particles.colors}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <PointMaterial
                        transparent
                        vertexColors
                        size={0.02}
                        sizeAttenuation={true}
                        depthWrite={false}
                        blending={THREE.AdditiveBlending}
                    />
                </Points>

                {/* Inner Core Energy */}
                <Sphere ref={coreRef} args={[0.6, 32, 32]}>
                    <meshBasicMaterial color={primaryColor} transparent opacity={0.3} blending={THREE.AdditiveBlending} />
                </Sphere>

                {/* Data Rings */}
                <mesh ref={outerRingRef} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[2.2, 0.002, 16, 100]} />
                    <meshBasicMaterial color={secondaryColor} transparent opacity={0.2} blending={THREE.AdditiveBlending} />
                </mesh>
                <mesh ref={innerRingRef} rotation={[Math.PI / 2.2, 0, 0]}>
                    <torusGeometry args={[1.8, 0.003, 16, 100]} />
                    <meshBasicMaterial color={primaryColor} transparent opacity={0.15} blending={THREE.AdditiveBlending} />
                </mesh>
            </Float>
        </group>
    );
}

// --- Main Component ---
interface UniversalAvatarProps {
    audioUrl?: string | null;
    isSpeaking?: boolean;
    onAudioEnd?: () => void;
    primaryColor?: string;
    secondaryColor?: string;
}

export default function UniversalAvatar({
    audioUrl,
    isSpeaking = false,
    onAudioEnd,
    primaryColor = "#00ffff",
    secondaryColor = "#ffffff"
}: UniversalAvatarProps) {
    const { analyser, dataArray, audioRef } = useAudioAnalyser(audioUrl ?? null, isSpeaking);

    return (
        <div className="w-full h-full relative">
            {/* Audio Element */}
            <audio
                ref={audioRef}
                onEnded={() => {
                    if (onAudioEnd) onAudioEnd();
                }}
                className="hidden"
            />

            <Canvas camera={{ position: [0, 0, 6], fov: 40 }} gl={{ antialias: false, alpha: true }}>
                <color attach="background" args={['transparent']} />

                <ambientLight intensity={0.2} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color={primaryColor} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color={secondaryColor} />

                <GhostEntity
                    isSpeaking={isSpeaking}
                    analyser={analyser}
                    dataArray={dataArray}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                />

                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    autoRotate={!isSpeaking}
                    autoRotateSpeed={0.3}
                    minPolarAngle={Math.PI / 3}
                    maxPolarAngle={Math.PI / 1.5}
                />
            </Canvas>
        </div>
    );
}
