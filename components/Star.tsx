import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TREE_CONFIG, COLORS } from '../constants';
import { TreeState } from '../types';

interface StarProps {
  progress: number;
  state: TreeState;
}

export const Star: React.FC<StarProps> = ({ state }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Calculate positions once
  const { chaosPos, targetPos, wordPos } = useMemo(() => {
    // Chaos: Random position far out
    const r = TREE_CONFIG.CHAOS_RADIUS * 0.8;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const chaos = new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );

    // Target: Top of the tree (Height is 12, centered at 0, so top is 6)
    const target = new THREE.Vector3(0, (TREE_CONFIG.HEIGHT / 2) + 0.5, 0);

    // Word: Hovering above the text "MERRY CHRISTMAS"
    // Text area is roughly 12 units high. Center is 0, so top is ~6.
    const word = new THREE.Vector3(0, 8, 0);

    return { chaosPos: chaos, targetPos: target, wordPos: word };
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    let dest = chaosPos;
    if (state === TreeState.FORMED) dest = targetPos;
    if (state === TreeState.WORD) dest = wordPos;
    
    // Smooth movement
    groupRef.current.position.lerp(dest, delta * 2);
    
    // Rotation animation
    if (state === TreeState.FORMED || state === TreeState.WORD) {
        // Slow regal rotation when formed
        groupRef.current.rotation.y += delta * 0.2;
    } else {
        // Tumble when in chaos
        groupRef.current.rotation.x += delta;
        groupRef.current.rotation.z += delta;
    }
  });

  // Material for the Star - Bright, shiny Gold
  const starMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.DEEP_GOLD,
    emissive: COLORS.PALE_GOLD,
    emissiveIntensity: 0.5,
    roughness: 0.1,
    metalness: 1.0,
  });

  return (
    <group ref={groupRef}>
        {/* Central Core */}
        <mesh material={starMaterial}>
            <octahedronGeometry args={[0.4, 0]} />
        </mesh>
        
        {/* Vertical Spikes (Longer) */}
        <mesh material={starMaterial} scale={[0.2, 2.5, 0.2]}>
            <octahedronGeometry args={[1, 0]} />
        </mesh>

        {/* Horizontal Spikes */}
        <mesh material={starMaterial} scale={[1.5, 0.2, 0.2]}>
            <octahedronGeometry args={[1, 0]} />
        </mesh>
        <mesh material={starMaterial} scale={[0.2, 0.2, 1.5]}>
            <octahedronGeometry args={[1, 0]} />
        </mesh>

        {/* Diagonal Spikes (Smaller) */}
        <group rotation={[0, Math.PI / 4, 0]}>
             <mesh material={starMaterial} scale={[1.0, 0.15, 0.15]}>
                <octahedronGeometry args={[1, 0]} />
            </mesh>
            <mesh material={starMaterial} scale={[0.15, 0.15, 1.0]}>
                <octahedronGeometry args={[1, 0]} />
            </mesh>
        </group>
        
        {/* Point Light for Glow */}
        <pointLight color={COLORS.PALE_GOLD} intensity={5} distance={5} decay={2} />
    </group>
  );
};
