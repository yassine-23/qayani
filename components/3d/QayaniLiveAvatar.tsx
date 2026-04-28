/**
 * Qayani Live Avatar with Emotional Intelligence
 *
 * This component renders a 3D avatar that reacts to user emotions in real-time.
 * Features:
 * - Real-time lip-sync from audio frequencies
 * - Emotional reactions based on user sentiment
 * - Natural blinking and breathing animations
 * - Gaze tracking (follows mouse/camera)
 *
 * This is the key differentiator: <300ms latency with emotional awareness.
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  EmotionDetector,
  emotionToAvatarReaction,
  type EmotionType,
  type AvatarReaction,
} from '@/lib/ai/emotion-detection';

interface QayaniLiveAvatarProps {
  audioContext: AudioContext | null;
  analyzerNode: AnalyserNode | null;
  isLive: boolean;
  modelUrl?: string;
  enableEmotions?: boolean; // New: Toggle emotional intelligence
  onEmotionDetected?: (emotion: EmotionType, intensity: number) => void; // Callback for emotion changes
}

export function QayaniLiveAvatar({
  audioContext,
  analyzerNode,
  isLive,
  modelUrl = 'https://models.readyplayer.me/65e7c3fbc6d8e9e2f5a1b2c3.glb', // Default RPM avatar
  enableEmotions = true,
  onEmotionDetected,
}: QayaniLiveAvatarProps) {
  const { scene, nodes } = useGLTF(modelUrl);
  const groupRef = useRef<THREE.Group>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const jawOpenRef = useRef(0);
  const mouseTargetRef = useRef({ x: 0, y: 0 });

  // Emotional intelligence state
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>('neutral');
  const [emotionIntensity, setEmotionIntensity] = useState(0);
  const emotionDetectorRef = useRef<EmotionDetector | null>(null);
  const emotionReactionRef = useRef<AvatarReaction>({});
  const emotionUpdateIntervalRef = useRef<number>(0);

  // Setup audio analysis data array
  useEffect(() => {
    if (analyzerNode && isLive) {
      dataArrayRef.current = new Uint8Array(analyzerNode.frequencyBinCount);

      // Initialize emotion detector if enabled
      if (enableEmotions && audioContext) {
        emotionDetectorRef.current = new EmotionDetector(audioContext, analyzerNode);
      }
    } else {
      dataArrayRef.current = null;
      emotionDetectorRef.current = null;
    }
  }, [analyzerNode, isLive, enableEmotions, audioContext]);

  // 60 FPS Animation Loop
  useFrame((state) => {
    if (!groupRef.current) return;

    const t = state.clock.getElapsedTime();

    // EMOTION DETECTION (every 10 frames = ~6 times per second)
    if (enableEmotions && emotionDetectorRef.current && isLive) {
      emotionUpdateIntervalRef.current++;

      if (emotionUpdateIntervalRef.current >= 10) {
        emotionUpdateIntervalRef.current = 0;

        const emotionResult = emotionDetectorRef.current.detectEmotion();

        // Update emotion state if confidence is high enough
        if (emotionResult.confidence > 0.5) {
          setCurrentEmotion(emotionResult.emotion);
          setEmotionIntensity(emotionResult.intensity);

          // Get avatar reaction for this emotion
          const reaction = emotionToAvatarReaction(
            emotionResult.emotion,
            emotionResult.intensity
          );
          emotionReactionRef.current = reaction;

          // Callback for external handling (e.g., adjust LLM tone)
          if (onEmotionDetected) {
            onEmotionDetected(emotionResult.emotion, emotionResult.intensity);
          }
        }
      }
    }

    // 1. IDLE BREATHING ANIMATION
    // Subtle up-and-down motion to simulate breathing
    const breathingOffset = enableEmotions
      ? (emotionReactionRef.current.leanForward || 0) * 0.05
      : 0;
    groupRef.current.position.y = -1.5 + Math.sin(t * 0.8) * 0.008 + breathingOffset;
    groupRef.current.rotation.z = Math.sin(t * 0.5) * 0.005;

    // 2. MOUSE LOOKING (Gaze Tracking)
    // Avatar follows mouse cursor smoothly
    const targetX = state.mouse.x * 0.3;
    const targetY = state.mouse.y * 0.3;

    mouseTargetRef.current.x = THREE.MathUtils.lerp(
      mouseTargetRef.current.x,
      targetX,
      0.05
    );
    mouseTargetRef.current.y = THREE.MathUtils.lerp(
      mouseTargetRef.current.y,
      targetY,
      0.05
    );

    // Apply to neck/head rotation
    const neck = scene.getObjectByName('Neck');
    const spine = scene.getObjectByName('Spine2');

    if (neck) {
      neck.rotation.y = THREE.MathUtils.lerp(
        neck.rotation.y,
        mouseTargetRef.current.x,
        0.1
      );
      neck.rotation.x = THREE.MathUtils.lerp(
        neck.rotation.x,
        -mouseTargetRef.current.y,
        0.1
      );
    }

    if (spine) {
      spine.rotation.y = THREE.MathUtils.lerp(
        spine.rotation.y,
        mouseTargetRef.current.x * 0.5,
        0.08
      );
    }

    // 3. REAL-TIME LIP SYNC (Audio-Driven)
    let jawOpenAmount = 0;

    if (analyzerNode && dataArrayRef.current && isLive) {
      analyzerNode.getByteFrequencyData(dataArrayRef.current);

      // Calculate average volume of speech frequencies (approx 300Hz - 3000Hz)
      // These bins contain most human speech energy
      let sum = 0;
      const startBin = 5; // ~300Hz at 24kHz sample rate
      const endBin = 60; // ~3000Hz
      const binCount = endBin - startBin;

      for (let i = startBin; i < endBin; i++) {
        sum += dataArrayRef.current[i];
      }

      const average = sum / binCount;

      // Map volume (0-255) to jaw open amount (0.0 - 1.0)
      // Adjusted threshold for natural mouth movement
      jawOpenAmount = THREE.MathUtils.mapLinear(average, 0, 140, 0, 1);
      jawOpenAmount = THREE.MathUtils.clamp(jawOpenAmount, 0, 0.75);

      // Apply exponential curve for more natural movement
      jawOpenAmount = Math.pow(jawOpenAmount, 1.5);
    }

    // Smooth interpolation to prevent jittery movement
    jawOpenRef.current = THREE.MathUtils.lerp(
      jawOpenRef.current,
      jawOpenAmount,
      0.35
    );

    // 4. APPLY MORPH TARGETS (Blendshapes) WITH EMOTIONAL REACTIONS
    // Ready Player Me avatars use standard blendshape names
    const headMesh = nodes.Wolf3D_Head as THREE.SkinnedMesh | undefined;
    const teethMesh = nodes.Wolf3D_Teeth as THREE.SkinnedMesh | undefined;

    if (headMesh?.morphTargetDictionary && headMesh?.morphTargetInfluences) {
      const jawIndex = headMesh.morphTargetDictionary['jawOpen'];
      const mouthSmileIndex = headMesh.morphTargetDictionary['mouthSmile'];
      const mouthFrownIndex = headMesh.morphTargetDictionary['mouthFrown'];
      const browInnerUpIndex = headMesh.morphTargetDictionary['browInnerUp'];
      const browDownIndex = headMesh.morphTargetDictionary['browDown'];
      const eyeBlinkLeftIndex = headMesh.morphTargetDictionary['eyeBlinkLeft'];
      const eyeBlinkRightIndex = headMesh.morphTargetDictionary['eyeBlinkRight'];
      const eyeWideLeftIndex = headMesh.morphTargetDictionary['eyeWideLeft'];
      const eyeWideRightIndex = headMesh.morphTargetDictionary['eyeWideRight'];
      const eyeSquintLeftIndex = headMesh.morphTargetDictionary['eyeSquintLeft'];
      const eyeSquintRightIndex = headMesh.morphTargetDictionary['eyeSquintRight'];

      // Apply jaw movement (lip-sync)
      if (jawIndex !== undefined) {
        const emotionalMouthOpen = emotionReactionRef.current.mouthOpen || 0;
        headMesh.morphTargetInfluences[jawIndex] = Math.max(
          jawOpenRef.current,
          emotionalMouthOpen
        );
      }

      // Apply emotional facial expressions
      if (enableEmotions) {
        // Mouth expressions
        if (mouthSmileIndex !== undefined) {
          const emotionalSmile = emotionReactionRef.current.mouthSmile || 0;
          const baseSmile = 0.05;
          const targetSmile = baseSmile + emotionalSmile;
          headMesh.morphTargetInfluences[mouthSmileIndex] = THREE.MathUtils.lerp(
            headMesh.morphTargetInfluences[mouthSmileIndex] || 0,
            targetSmile,
            0.1
          );
        }

        if (mouthFrownIndex !== undefined) {
          const emotionalFrown = emotionReactionRef.current.mouthFrown || 0;
          headMesh.morphTargetInfluences[mouthFrownIndex] = THREE.MathUtils.lerp(
            headMesh.morphTargetInfluences[mouthFrownIndex] || 0,
            emotionalFrown,
            0.1
          );
        }

        // Brow expressions
        if (browInnerUpIndex !== undefined) {
          const emotionalBrowUp = emotionReactionRef.current.browInnerUp || 0;
          headMesh.morphTargetInfluences[browInnerUpIndex] = THREE.MathUtils.lerp(
            headMesh.morphTargetInfluences[browInnerUpIndex] || 0,
            emotionalBrowUp,
            0.1
          );
        }

        if (browDownIndex !== undefined) {
          const emotionalBrowDown = emotionReactionRef.current.browDown || 0;
          headMesh.morphTargetInfluences[browDownIndex] = THREE.MathUtils.lerp(
            headMesh.morphTargetInfluences[browDownIndex] || 0,
            emotionalBrowDown,
            0.1
          );
        }

        // Eye expressions
        if (eyeWideLeftIndex !== undefined && eyeWideRightIndex !== undefined) {
          const emotionalEyeWide = emotionReactionRef.current.eyeWide || 0;
          headMesh.morphTargetInfluences[eyeWideLeftIndex] = THREE.MathUtils.lerp(
            headMesh.morphTargetInfluences[eyeWideLeftIndex] || 0,
            emotionalEyeWide,
            0.15
          );
          headMesh.morphTargetInfluences[eyeWideRightIndex] = THREE.MathUtils.lerp(
            headMesh.morphTargetInfluences[eyeWideRightIndex] || 0,
            emotionalEyeWide,
            0.15
          );
        }

        if (eyeSquintLeftIndex !== undefined && eyeSquintRightIndex !== undefined) {
          const emotionalEyeSquint = emotionReactionRef.current.eyeSquint || 0;
          headMesh.morphTargetInfluences[eyeSquintLeftIndex] = THREE.MathUtils.lerp(
            headMesh.morphTargetInfluences[eyeSquintLeftIndex] || 0,
            emotionalEyeSquint,
            0.1
          );
          headMesh.morphTargetInfluences[eyeSquintRightIndex] = THREE.MathUtils.lerp(
            headMesh.morphTargetInfluences[eyeSquintRightIndex] || 0,
            emotionalEyeSquint,
            0.1
          );
        }
      } else {
        // Fallback: subtle smile for friendly appearance
        if (mouthSmileIndex !== undefined) {
          const baseSmile = 0.05;
          const dynamicSmile = isLive ? 0.1 : 0;
          headMesh.morphTargetInfluences[mouthSmileIndex] = baseSmile + dynamicSmile;
        }
      }

      // Natural blinking animation
      if (eyeBlinkLeftIndex !== undefined && eyeBlinkRightIndex !== undefined) {
        const blinkCycle = Math.sin(t * 0.3) * 0.5 + 0.5;
        const shouldBlink = blinkCycle > 0.95;
        const blinkAmount = shouldBlink ? 1 : 0;

        headMesh.morphTargetInfluences[eyeBlinkLeftIndex] = THREE.MathUtils.lerp(
          headMesh.morphTargetInfluences[eyeBlinkLeftIndex] || 0,
          blinkAmount,
          0.3
        );
        headMesh.morphTargetInfluences[eyeBlinkRightIndex] = THREE.MathUtils.lerp(
          headMesh.morphTargetInfluences[eyeBlinkRightIndex] || 0,
          blinkAmount,
          0.3
        );
      }

      // Sync teeth with jaw
      if (teethMesh?.morphTargetDictionary && teethMesh?.morphTargetInfluences) {
        const teethJawIndex = teethMesh.morphTargetDictionary['jawOpen'];
        if (teethJawIndex !== undefined) {
          teethMesh.morphTargetInfluences[teethJawIndex] = jawOpenRef.current;
        }
      }
    }

    // 5. ACTIVE STATE GLOW (Visual Feedback)
    if (isLive && headMesh) {
      const material = headMesh.material as THREE.MeshStandardMaterial;
      if (material) {
        // Subtle emissive glow when speaking
        const glowIntensity = jawOpenRef.current * 0.1;
        material.emissive = new THREE.Color(0x3b82f6);
        material.emissiveIntensity = glowIntensity;
      }
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

// Preload the default avatar model
useGLTF.preload('https://models.readyplayer.me/65e7c3fbc6d8e9e2f5a1b2c3.glb');
