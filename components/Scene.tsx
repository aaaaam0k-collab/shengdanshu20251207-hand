
import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Sparkles, Float, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';
import { PearlChains } from './PearlChains';
import { Star } from './Star';
import { TreeState } from '../types';
import { COLORS } from '../constants';

interface SceneProps {
  state: TreeState;
  rotationRef: React.MutableRefObject<{ x: number, y: number, isPresent: boolean }>;
}

const TreeGroup: React.FC<{ state: TreeState; rotationRef: React.MutableRefObject<{ x: number, y: number, isPresent: boolean }> }> = ({ state, rotationRef }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((stateThree, delta) => {
    if (!groupRef.current) return;

    if (rotationRef.current.isPresent) {
       // Hand Control Mode
       // Map 0..1 to -PI..PI (Azimuth) and -PI/4..PI/4 (Elevation)
       const targetY = (rotationRef.current.x - 0.5) * 3; // Left/Right rotation
       const targetX = (rotationRef.current.y - 0.5) * 1; // Up/Down tilt

       // Smooth lerp
       groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, delta * 5);
       groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, delta * 5);
    } else {
      // Auto Rotate Mode (Only when Formed or Word, Chaos tumbles differently)
      if (state === TreeState.FORMED) {
         groupRef.current.rotation.y += delta * 0.1;
         // Return X to 0
         groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, delta * 2);
      } else {
         // Subtle drift
         groupRef.current.rotation.y += delta * 0.05;
         groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, delta * 2);
      }
    }
  });

  const progress = state === TreeState.FORMED ? 1 : 0; 

  return (
    <group ref={groupRef} position={[0, -4, 0]}>
        <Foliage state={state} progress={progress} />
        <Ornaments state={state} progress={progress} />
        <PearlChains state={state} progress={progress} />
        <Star state={state} progress={progress} />
    </group>
  );
};

export const Scene: React.FC<SceneProps> = ({ state, rotationRef }) => {
  return (
    <Canvas
      camera={{ position: [0, 4, 30], fov: 45 }}
      dpr={[1, 2]} 
      shadows
      gl={{ antialias: false }} 
    >
      <color attach="background" args={[COLORS.SPACE_DARK]} />
      
      <Suspense fallback={null}>
        {/* Real Environment for reflections */}
        <Environment preset="city" /> 

        {/* Backdrop */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
           <Sparkles count={300} scale={30} size={3} speed={0.4} opacity={0.3} color={COLORS.ICE_BLUE} />
        </Float>

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={2} 
          castShadow 
          shadow-bias={-0.0001} 
          color={COLORS.PALE_GOLD}
        />
        <pointLight position={[-10, 5, -10]} intensity={20} color={COLORS.ICE_BLUE} />
        <pointLight position={[0, -5, 5]} intensity={10} color="white" />

        <TreeGroup state={state} rotationRef={rotationRef} />

        {/* Postprocessing */}
        <EffectComposer enableNormalPass={false}>
            <Bloom 
                luminanceThreshold={0.9}
                mipmapBlur 
                intensity={0.5} 
                radius={0.4}
            />
            <Vignette eskil={false} offset={0.1} darkness={0.5} />
        </EffectComposer>
      </Suspense>

      {/* Disable user orbit interaction to prefer hand control, but keep damping for smooth stop if needed */}
      <OrbitControls 
        enabled={false} 
      />
    </Canvas>
  );
};
