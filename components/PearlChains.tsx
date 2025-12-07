import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TREE_CONFIG, PEARL_CONFIG } from '../constants';
import { TreeState } from '../types';
import { generateTextPositions } from '../utils';

interface PearlChainsProps {
  progress: number;
  state: TreeState;
}

export const PearlChains: React.FC<PearlChainsProps> = ({ state }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const { STRANDS: strands, PEARLS_PER_STRAND: pearlsPerStrand, SIZE: size } = PEARL_CONFIG;
  const count = strands * pearlsPerStrand;

  const data = useMemo(() => {
    const items = [];
    const wordPositions = generateTextPositions("MERRY\nCHRISTMAS", count, 25, 12);
    
    let globalIndex = 0;
    for (let s = 0; s < strands; s++) {
      const strandOffset = (s / strands) * Math.PI * 2;
      
      for (let p = 0; p < pearlsPerStrand; p++) {
        // --- Chaos ---
        const rChaos = Math.cbrt(Math.random()) * TREE_CONFIG.CHAOS_RADIUS;
        const thetaChaos = Math.random() * Math.PI * 2;
        const phiChaos = Math.acos(2 * Math.random() - 1);
        const chaosPos = new THREE.Vector3(
          rChaos * Math.sin(phiChaos) * Math.cos(thetaChaos),
          rChaos * Math.sin(phiChaos) * Math.sin(thetaChaos),
          rChaos * Math.cos(phiChaos)
        );

        // --- Target (Spiral) ---
        const t = p / (pearlsPerStrand - 1);
        const h = t * TREE_CONFIG.HEIGHT - (TREE_CONFIG.HEIGHT / 2);
        const rSpiral = (TREE_CONFIG.RADIUS_BASE * (1 - t)) + 0.2; 
        const rotations = 4;
        const theta = (t * Math.PI * 2 * rotations) + strandOffset;

        const targetPos = new THREE.Vector3(
          rSpiral * Math.cos(theta),
          h,
          rSpiral * Math.sin(theta)
        );

        // --- Word ---
        const wordPos = new THREE.Vector3(
            wordPositions[globalIndex * 3],
            wordPositions[globalIndex * 3 + 1],
            wordPositions[globalIndex * 3 + 2]
        );
        globalIndex++;

        items.push({
          chaosPos,
          targetPos,
          wordPos,
          currentPos: chaosPos.clone(),
          speed: 0.03 + Math.random() * 0.02
        });
      }
    }
    return items;
  }, [strands, pearlsPerStrand]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    const tempObj = new THREE.Object3D();
    
    data.forEach((item, i) => {
      tempObj.position.copy(item.chaosPos);
      tempObj.scale.setScalar(size);
      tempObj.updateMatrix();
      meshRef.current?.setMatrixAt(i, tempObj.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [data, size]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const tempObj = new THREE.Object3D();
    let needsUpdate = false;

    data.forEach((item, i) => {
      let dest = item.chaosPos;
      if (state === TreeState.FORMED) dest = item.targetPos;
      if (state === TreeState.WORD) dest = item.wordPos;

      const dist = item.currentPos.distanceTo(dest);
      
      if (dist > 0.01) {
        item.currentPos.lerp(dest, item.speed * 60 * delta);
        needsUpdate = true;
      }

      tempObj.position.copy(item.currentPos);
      tempObj.scale.setScalar(size);
      tempObj.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObj.matrix);
    });

    if (needsUpdate) {
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
      <sphereGeometry args={[1, 16, 16]} />
      <meshPhysicalMaterial 
        color={PEARL_CONFIG.COLOR}
        roughness={0.2}
        metalness={0.1}
        clearcoat={1}
        clearcoatRoughness={0.1}
        reflectivity={1}
        envMapIntensity={1}
      />
    </instancedMesh>
  );
};
