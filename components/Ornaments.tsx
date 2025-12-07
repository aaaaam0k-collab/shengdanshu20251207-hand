import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TREE_CONFIG, ORNAMENT_COUNT, ORNAMENT_TYPES } from '../constants';
import { OrnamentType, TreeState } from '../types';
import { generateTextPositions } from '../utils';

interface OrnamentGroupProps {
  type: OrnamentType;
  state: TreeState;
}

const OrnamentGroup: React.FC<OrnamentGroupProps> = ({ type, state }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = Math.floor(ORNAMENT_COUNT / ORNAMENT_TYPES.length);

  const data = useMemo(() => {
    const items = [];
    const wordPositions = generateTextPositions("MERRY\nCHRISTMAS", count, 25, 12);

    for (let i = 0; i < count; i++) {
       // Chaos
       const r = Math.cbrt(Math.random()) * TREE_CONFIG.CHAOS_RADIUS;
       const theta = Math.random() * Math.PI * 2;
       const phi = Math.acos(2 * Math.random() - 1);
       const chaosPos = new THREE.Vector3(
         r * Math.sin(phi) * Math.cos(theta),
         r * Math.sin(phi) * Math.sin(theta),
         r * Math.cos(phi)
       );
 
       // Target (Tree)
       const hNorm = Math.random();
       const coneRadius = (1 - hNorm) * TREE_CONFIG.RADIUS_BASE;
       const rTree = coneRadius * (0.9 + 0.2 * Math.random()); 
       const thetaTree = Math.random() * Math.PI * 2;
       const y = hNorm * TREE_CONFIG.HEIGHT - (TREE_CONFIG.HEIGHT / 2);
       
       const targetPos = new THREE.Vector3(
         rTree * Math.cos(thetaTree),
         y,
         rTree * Math.sin(thetaTree)
       );

       // Word Position
       const wordPos = new THREE.Vector3(
         wordPositions[i * 3],
         wordPositions[i * 3 + 1],
         wordPositions[i * 3 + 2]
       );

       const currentPos = chaosPos.clone();
       
       items.push({ chaosPos, targetPos, wordPos, currentPos, speed: type.weight });
    }
    return items;
  }, [count, type.weight]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    const tempObj = new THREE.Object3D();
    data.forEach((item, i) => {
        tempObj.position.copy(item.chaosPos);
        tempObj.scale.setScalar(type.scale);
        tempObj.updateMatrix();
        meshRef.current?.setMatrixAt(i, tempObj.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [data, type.scale]);

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
            const moveSpeed = item.speed * 60 * delta;
            item.currentPos.lerp(dest, moveSpeed);
            needsUpdate = true;
        }

        tempObj.position.copy(item.currentPos);
        tempObj.scale.setScalar(type.scale);
        tempObj.updateMatrix();
        meshRef.current!.setMatrixAt(i, tempObj.matrix);
    });

    if (needsUpdate) { 
        meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial 
        color={type.color}
        roughness={0.1}
        metalness={0.8}
        envMapIntensity={1.5}
      />
    </instancedMesh>
  );
};

export const Ornaments: React.FC<{ progress: number, state: TreeState }> = ({ progress, state }) => {
  return (
    <group>
      {ORNAMENT_TYPES.map((type, index) => (
        <OrnamentGroup key={index} type={type} state={state} />
      ))}
    </group>
  );
};
