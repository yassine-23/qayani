'use client';

import React, { Suspense, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface Avatar3DProps {
  imageUrl?: string;
  name?: string;
  personality?: {
    core_values?: string;
    humor_style?: string;
    communication_style?: string;
  };
  size?: number;
  interactive?: boolean;
}

// Avatar head component with dynamic features based on personality
function AvatarHead({ imageUrl, personality, name }: { imageUrl?: string; personality?: any; name?: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Load texture from image if available
  const texture = useMemo(() => {
    if (imageUrl) {
      const loader = new THREE.TextureLoader();
      return loader.load(imageUrl);
    }
    return null;
  }, [imageUrl]);

  // Animate based on personality traits
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.1;

      if (hovered) {
        meshRef.current.scale.setScalar(1.1);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }
  });

  // Generate colors based on personality
  const getPersonalityColors = () => {
    const humor = personality?.humor_style?.toLowerCase() || '';
    const values = personality?.core_values?.toLowerCase() || '';
    const communication = personality?.communication_style?.toLowerCase() || '';

    if (humor.includes('playful') || humor.includes('fun')) return ['#ff6b6b', '#4ecdc4'];
    if (values.includes('serious') || communication.includes('formal')) return ['#2c3e50', '#34495e'];
    if (values.includes('creative') || values.includes('artistic')) return ['#9b59b6', '#e74c3c'];
    if (communication.includes('warm') || values.includes('family')) return ['#f39c12', '#e67e22'];

    return ['#3498db', '#2980b9']; // Default blue
  };

  const [primaryColor, secondaryColor] = getPersonalityColors();

  return (
    <group>
      {/* Main head sphere */}
      <Sphere
        ref={meshRef}
        args={[1, 32, 32]}
        position={[0, 0, 0]}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        {texture ? (
          <meshStandardMaterial map={texture} />
        ) : (
          <MeshWobbleMaterial
            color={primaryColor}
            factor={0.3}
            speed={2}
            roughness={0.1}
            metalness={0.2}
          />
        )}
      </Sphere>

      {/* Eyes */}
      <Sphere args={[0.1, 16, 16]} position={[-0.3, 0.2, 0.8]}>
        <meshStandardMaterial color="white" />
      </Sphere>
      <Sphere args={[0.1, 16, 16]} position={[0.3, 0.2, 0.8]}>
        <meshStandardMaterial color="white" />
      </Sphere>

      {/* Pupils */}
      <Sphere args={[0.05, 16, 16]} position={[-0.3, 0.2, 0.85]}>
        <meshStandardMaterial color="black" />
      </Sphere>
      <Sphere args={[0.05, 16, 16]} position={[0.3, 0.2, 0.85]}>
        <meshStandardMaterial color="black" />
      </Sphere>

      {/* Mouth - varies based on personality */}
      <mesh position={[0, -0.3, 0.8]}>
        <torusGeometry args={[0.2, 0.03, 8, 16, Math.PI]} />
        <meshStandardMaterial color={secondaryColor} />
      </mesh>

      {/* Floating personality indicators */}
      {personality?.core_values && (
        <Text
          position={[0, -2, 0]}
          fontSize={0.3}
          color={primaryColor}
          anchorX="center"
          anchorY="middle"
        >
          {name || 'Digital Self'}
        </Text>
      )}
    </group>
  );
}

// Environment setup
function AvatarEnvironment() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
    </>
  );
}

// Loading fallback
function AvatarLoader() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#cccccc" wireframe />
    </mesh>
  );
}

// Main Avatar 3D Component
export default function Avatar3D({
  imageUrl,
  name,
  personality,
  size = 300,
  interactive = true
}: Avatar3DProps) {
  return (
    <div style={{ width: size, height: size }} className="rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <AvatarEnvironment />

        <Suspense fallback={<AvatarLoader />}>
          <AvatarHead
            imageUrl={imageUrl}
            personality={personality}
            name={name}
          />
        </Suspense>

        {interactive && (
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI - Math.PI / 3}
            autoRotate
            autoRotateSpeed={0.5}
          />
        )}
      </Canvas>

      {/* Avatar Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4 text-white">
        <div className="text-center">
          <h3 className="font-semibold text-sm">{name || 'Digital Self'}</h3>
          {personality?.core_values && (
            <p className="text-xs opacity-75 mt-1">
              {personality.core_values.split(' ').slice(0, 3).join(' ')}...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}