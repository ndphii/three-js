import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler';
import { GestureState } from '../types';

// Constants
const PARTICLE_COUNT = 6000; // Increased significantly for denser, smoother look
const FONT_URL = 'https://threejs.org/examples/fonts/helvetiker_bold.typeface.json';

interface SceneProps {
  gestureState: GestureState;
}

export const Scene: React.FC<SceneProps> = ({ gestureState }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [font, setFont] = useState<any>(null);

  // Load Font
  useEffect(() => {
    const loader = new FontLoader();
    loader.load(FONT_URL, (loadedFont) => {
      setFont(loadedFont);
    });
  }, []);

  // Generate target positions for text
  const targetPositions = useMemo(() => {
    if (!font) return null;

    const getTextPoints = (text: string, size: number = 5) => {
      const geometry = new TextGeometry(text, {
        font: font,
        size: size,
        depth: 0.5, // Reduced depth for cleaner text
        curveSegments: 20, // Higher segments for smoother curves
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.02,
        bevelOffset: 0,
        bevelSegments: 8,
      });
      geometry.center();
      
      const count = PARTICLE_COUNT;
      const points = new Float32Array(count * 3);
      
      const material = new THREE.MeshBasicMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      const sampler = new MeshSurfaceSampler(mesh).build();
      const tempPosition = new THREE.Vector3();

      for (let i = 0; i < count; i++) {
        sampler.sample(tempPosition);
        points[i * 3] = tempPosition.x;
        points[i * 3 + 1] = tempPosition.y;
        points[i * 3 + 2] = tempPosition.z;
      }
      return points;
    };

    // MAPPING: 1=I, 2=LOVE, 3=YOU
    return {
      1: getTextPoints('I', 8),
      2: getTextPoints('LOVE', 6),
      3: getTextPoints('YOU', 6),
    };
  }, [font]);

  // Current physics state for each particle
  const particles = useMemo(() => {
    const data = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      data.push({
        x: (Math.random() - 0.5) * 50,
        y: (Math.random() - 0.5) * 50,
        z: (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0,
        vz: 0,
      });
    }
    return data;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current || !targetPositions) return;

    const time = state.clock.getElapsedTime();
    const { activeShapeIndex, dispersionFactor } = gestureState;
    
    // Get the target coordinate array based on gesture
    const currentTarget = targetPositions[activeShapeIndex as 1 | 2 | 3] || targetPositions[1];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i];
      const i3 = i * 3;

      // 1. Target Attraction
      const tx = currentTarget[i3];
      const ty = currentTarget[i3 + 1];
      const tz = currentTarget[i3 + 2];

      // 2. Dispersion Logic
      // Noise calculation
      const noiseX = Math.sin(i * 0.15 + time) * 30;
      const noiseY = Math.cos(i * 0.13 + time) * 30;
      const noiseZ = Math.sin(i * 0.17 + time * 0.5) * 30;

      // Target with dispersion
      const effectiveTx = tx + (noiseX * dispersionFactor * 3.5);
      const effectiveTy = ty + (noiseY * dispersionFactor * 3.5);
      const effectiveTz = tz + (noiseZ * dispersionFactor * 3.5);

      // Physics: FASTER RESPONSE (Reduced Delay)
      const dx = effectiveTx - p.x;
      const dy = effectiveTy - p.y;
      const dz = effectiveTz - p.z;

      // Stiffness increased significantly (was ~0.025) to snap to shape faster
      const stiffness = 0.12 + (1 - dispersionFactor) * 0.05; 
      // Friction adjusted to allow speed but prevent overshoot
      const friction = 0.86; 

      p.vx += dx * stiffness;
      p.vy += dy * stiffness;
      p.vz += dz * stiffness;

      p.vx *= friction;
      p.vy *= friction;
      p.vz *= friction;

      // Update position
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;

      // Extremely subtle idle motion
      const idleAmp = 0.005; 
      p.x += Math.sin(time * 0.5 + i) * idleAmp;
      p.y += Math.cos(time * 0.3 + i) * idleAmp;

      // Update Matrix
      dummy.position.set(p.x, p.y, p.z);
      
      // Smaller particle size (was 0.12)
      const scale = 0.08; 
      dummy.scale.set(scale, scale, scale);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      
      // Color Logic
      const color = new THREE.Color();
      
      // Pink/Purple theme
      const hue = 0.85 + (p.x * 0.005) + (Math.sin(time * 0.2) * 0.05);
      const saturation = 0.9;
      const lightness = 0.6 + (p.z * 0.02) + (dispersionFactor * 0.4);
      
      color.setHSL(hue % 1, saturation, Math.min(Math.max(lightness, 0.3), 1));
      meshRef.current.setColorAt(i, color);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  if (!font) return null;

  return (
    <>
      {/* @ts-ignore */}
      <ambientLight intensity={0.6} />
      {/* @ts-ignore */}
      <pointLight position={[20, 20, 20]} intensity={1.2} color="#ffaaee" />
      {/* @ts-ignore */}
      <pointLight position={[-20, -10, 10]} intensity={0.8} color="#ff0088" />
      
      {/* @ts-ignore */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
        {/* @ts-ignore */}
        <sphereGeometry args={[1, 6, 6]} /> 
        {/* @ts-ignore */}
        <meshStandardMaterial 
          toneMapped={false} 
          emissive="#ff0066" 
          emissiveIntensity={0.4}
          roughness={0.2}
          metalness={0.8}
        />
      </instancedMesh>
    </>
  );
};