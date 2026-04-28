'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface ThreeDGearVisualizationProps {
  params: {
    teeth: number;
    module: number;
    pressureAngle: number;
    gearType: string;
    material: string;
  };
  calculations: any;
  isAnimating: boolean;
  setIsAnimating: (val: boolean) => void;
}

export default function ThreeDGearVisualization({
  params,
  calculations,
  isAnimating,
  setIsAnimating
}: ThreeDGearVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const gearRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const createGearGeometry = () => {
    const teeth = params.teeth;
    const outerRadius = calculations.outsideDiameter / 200; // Scale down for 3D
    const pitchRadius = calculations.pitchDiameter / 200;
    const rootRadius = calculations.rootDiameter / 200;
    const thickness = calculations.faceWidth / 400;

    const shape = new THREE.Shape();
    const angleStep = (Math.PI * 2) / teeth;
    const toothWidth = angleStep * 0.4;

    // Create gear profile
    for (let i = 0; i <= teeth; i++) {
      const angle = i * angleStep;
      const isEvenTooth = i % 2 === 0;

      if (i === 0) {
        // Start at root circle
        const x = Math.cos(angle - toothWidth/2) * rootRadius;
        const y = Math.sin(angle - toothWidth/2) * rootRadius;
        shape.moveTo(x, y);
      }

      // Tooth tip
      const tipX1 = Math.cos(angle - toothWidth/2) * outerRadius;
      const tipY1 = Math.sin(angle - toothWidth/2) * outerRadius;
      const tipX2 = Math.cos(angle + toothWidth/2) * outerRadius;
      const tipY2 = Math.sin(angle + toothWidth/2) * outerRadius;

      // Root points
      const rootX1 = Math.cos(angle - angleStep/2) * rootRadius;
      const rootY1 = Math.sin(angle - angleStep/2) * rootRadius;
      const rootX2 = Math.cos(angle + angleStep/2) * rootRadius;
      const rootY2 = Math.sin(angle + angleStep/2) * rootRadius;

      // Draw tooth profile
      shape.lineTo(tipX1, tipY1);
      shape.lineTo(tipX2, tipY2);
      shape.lineTo(rootX2, rootY2);
    }

    // Extrude the gear shape
    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 2,
      bevelSize: thickness * 0.05,
      bevelThickness: thickness * 0.05,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  };

  const getMaterialByType = () => {
    const materialProps = {
      metalness: 0.7,
      roughness: 0.3,
    };

    switch (params.material) {
      case 'steel':
        return new THREE.MeshStandardMaterial({
          color: 0x888888,
          ...materialProps
        });
      case 'brass':
        return new THREE.MeshStandardMaterial({
          color: 0xB5A642,
          ...materialProps
        });
      case 'aluminum':
        return new THREE.MeshStandardMaterial({
          color: 0xC0C0C0,
          ...materialProps
        });
      case 'plastic':
        return new THREE.MeshStandardMaterial({
          color: 0x2C3E50,
          metalness: 0.1,
          roughness: 0.8
        });
      default:
        return new THREE.MeshStandardMaterial({
          color: 0x666666,
          ...materialProps
        });
    }
  };

  const initThreeJS = () => {
    if (!containerRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 8);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    containerRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.4, 100);
    pointLight.position.set(-10, -10, 10);
    scene.add(pointLight);

    // Create gear group
    const gearGroup = new THREE.Group();
    gearRef.current = gearGroup;
    scene.add(gearGroup);

    updateGear();

    // Mouse controls
    const handleMouseDown = (event: MouseEvent) => {
      setIsDragging(true);
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging || !gearRef.current) return;

      const deltaX = event.clientX - mousePosition.x;
      const deltaY = event.clientY - mousePosition.y;

      gearRef.current.rotation.y += deltaX * 0.01;
      gearRef.current.rotation.x += deltaY * 0.01;

      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Animation loop
    const animate = () => {
      if (isAnimating && gearRef.current) {
        gearRef.current.rotation.z += 0.01;
      }

      renderer.render(scene, camera);
      animationIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);

      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  };

  const updateGear = () => {
    if (!gearRef.current) return;

    // Clear existing gear
    gearRef.current.clear();

    // Create new gear geometry and material
    const geometry = createGearGeometry();
    const material = getMaterialByType();

    // Main gear body
    const gear = new THREE.Mesh(geometry, material);
    gear.castShadow = true;
    gear.receiveShadow = true;

    // Center the gear
    gear.position.set(0, 0, -calculations.faceWidth / 800);

    gearRef.current.add(gear);

    // Add center hub
    const hubGeometry = new THREE.CylinderGeometry(
      calculations.rootDiameter / 600,
      calculations.rootDiameter / 600,
      calculations.faceWidth / 300,
      32
    );
    const hubMaterial = getMaterialByType();
    const hub = new THREE.Mesh(hubGeometry, hubMaterial);
    hub.rotation.x = Math.PI / 2;
    hub.castShadow = true;
    hub.receiveShadow = true;

    gearRef.current.add(hub);

    // Add center hole
    const holeGeometry = new THREE.CylinderGeometry(
      calculations.rootDiameter / 1200,
      calculations.rootDiameter / 1200,
      calculations.faceWidth / 250,
      16
    );
    const holeMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0,
      roughness: 1
    });
    const hole = new THREE.Mesh(holeGeometry, holeMaterial);
    hole.rotation.x = Math.PI / 2;

    gearRef.current.add(hole);
  };

  useEffect(() => {
    const cleanup = initThreeJS();
    return cleanup;
  }, []);

  useEffect(() => {
    updateGear();
  }, [params, calculations]);

  useEffect(() => {
    // Update animation state - no need to recreate scene
  }, [isAnimating]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full h-96 bg-gray-50 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      />

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        <button
          onClick={() => setIsAnimating(!isAnimating)}
          className="px-3 py-1.5 bg-white/90 hover:bg-white backdrop-blur-sm rounded-md shadow text-sm transition-colors"
        >
          {isAnimating ? '⏸️ Pause' : '▶️ Play'}
        </button>

        <button
          onClick={() => {
            if (gearRef.current) {
              gearRef.current.rotation.set(0, 0, 0);
            }
          }}
          className="px-3 py-1.5 bg-white/90 hover:bg-white backdrop-blur-sm rounded-md shadow text-sm transition-colors"
        >
          🔄 Reset
        </button>
      </div>

      {/* Info */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-md p-2 text-xs">
        <div className="font-medium">{params.material} {params.gearType}</div>
        <div className="text-gray-600">{params.teeth}T • {params.module}mm</div>
      </div>

      {/* Dimensions */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-md p-2 text-xs">
        <div>⌀ {calculations.outsideDiameter.toFixed(1)}mm</div>
        <div>Pitch ⌀ {calculations.pitchDiameter.toFixed(1)}mm</div>
      </div>
    </div>
  );
}