import * as THREE from 'three';

export enum TreeState {
  CHAOS = 'CHAOS',
  FORMED = 'FORMED',
  WORD = 'WORD'
}

export interface OrnamentType {
  color: string;
  weight: number; // 0.0 - 1.0 (Lower is heavier/slower)
  scale: number;
  geometry: 'box' | 'sphere' | 'dodecahedron';
  emissive?: boolean;
}

export interface ParticleData {
  chaosPos: THREE.Vector3;
  targetPos: THREE.Vector3;
}
