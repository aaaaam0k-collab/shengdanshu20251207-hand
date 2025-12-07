import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TREE_CONFIG, COLORS } from '../constants';
import { TreeState } from '../types';
import { generateTextPositions } from '../utils';

// Custom Shader with 3-way mixing
const FoliageShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uTreeMix: { value: 0 },
    uWordMix: { value: 0 },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uTreeMix;
    uniform float uWordMix;
    
    attribute vec3 aChaosPos;
    attribute vec3 aTargetPos;
    attribute vec3 aWordPos;
    attribute float aRandom;
    attribute vec3 aColor; 
    
    varying vec3 vColor;
    varying float vAlpha;

    // Simplex noise (simplified)
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 = v - i + dot(i, C.xxx) ;
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute( permute( permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
      float n_ = 0.142857142857;
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
      // 3-Way Mix Logic:
      // Base is Chaos. 
      // uTreeMix blends Chaos -> Tree
      // uWordMix blends Current -> Word
      
      vec3 pos = mix(aChaosPos, aTargetPos, uTreeMix);
      pos = mix(pos, aWordPos, uWordMix);
      
      // Floating noise
      float noiseVal = snoise(pos * 0.5 + uTime * 0.2);
      pos += noiseVal * 0.2;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      float subtlePulse = 0.8 + 0.2 * sin(uTime * 2.0 + aRandom * 10.0);
      float baseSize = 4.0 * aRandom + 2.0;
      gl_PointSize = baseSize * (30.0 / -mvPosition.z);
      
      vAlpha = 0.7 * subtlePulse;
      vColor = aColor; 
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if(dist > 0.5) discard;
      
      float strength = smoothstep(0.5, 0.4, dist);
      gl_FragColor = vec4(vColor, strength * vAlpha);
    }
  `
};

interface FoliageProps {
  progress: number; // Legacy prop, used for reference if needed, but we rely on state
  state?: TreeState; // New prop
}

export const Foliage: React.FC<FoliageProps> = ({ state = TreeState.CHAOS }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const { positions, chaosPositions, targetPositions, wordPositions, randoms, colors } = useMemo(() => {
    const count = TREE_CONFIG.PARTICLE_COUNT;
    const chaos = new Float32Array(count * 3);
    const target = new Float32Array(count * 3);
    const rnd = new Float32Array(count);
    const col = new Float32Array(count * 3);

    const palette = [
      new THREE.Color(COLORS.ICE_BLUE).multiplyScalar(0.8),
      new THREE.Color(COLORS.NEON_BLUE).multiplyScalar(0.6),
      new THREE.Color(COLORS.PURE_WHITE).multiplyScalar(0.9),
      new THREE.Color(COLORS.DEEP_GOLD).multiplyScalar(0.8),
    ];

    // Generate Word Positions
    const wordPosRaw = generateTextPositions("MERRY\nCHRISTMAS", count, 25, 12);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Chaos
      const r = Math.cbrt(Math.random()) * TREE_CONFIG.CHAOS_RADIUS;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      chaos[i3] = r * Math.sin(phi) * Math.cos(theta);
      chaos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      chaos[i3 + 2] = r * Math.cos(phi);

      // Target (Tree)
      const hNorm = Math.random(); 
      const h = hNorm * TREE_CONFIG.HEIGHT - (TREE_CONFIG.HEIGHT / 2);
      const coneRadius = (1 - hNorm) * TREE_CONFIG.RADIUS_BASE;
      const rDist = Math.random();
      const rTree = coneRadius * (rDist > 0.3 ? Math.sqrt(Math.random()) : Math.random()); 
      const thetaTree = Math.random() * Math.PI * 2;

      target[i3] = rTree * Math.cos(thetaTree);
      target[i3 + 1] = h;
      target[i3 + 2] = rTree * Math.sin(thetaTree);

      rnd[i] = Math.random();

      const colorChoice = palette[Math.floor(Math.random() * palette.length)];
      col[i3] = colorChoice.r;
      col[i3+1] = colorChoice.g;
      col[i3+2] = colorChoice.b;
    }

    return {
      positions: chaos, // Initial buffer
      chaosPositions: chaos,
      targetPositions: target,
      wordPositions: wordPosRaw,
      randoms: rnd,
      colors: col
    };
  }, []);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
      
      // Smoothly interpolate mix factors based on state
      const targetTreeMix = state === TreeState.FORMED ? 1.0 : 0.0;
      const targetWordMix = state === TreeState.WORD ? 1.0 : 0.0;

      materialRef.current.uniforms.uTreeMix.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uTreeMix.value,
        targetTreeMix,
        0.05
      );

      materialRef.current.uniforms.uWordMix.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uWordMix.value,
        targetWordMix,
        0.05
      );
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aChaosPos"
          count={chaosPositions.length / 3}
          array={chaosPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTargetPos"
          count={targetPositions.length / 3}
          array={targetPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aWordPos"
          count={wordPositions.length / 3}
          array={wordPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={randoms.length}
          array={randoms}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aColor"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        attach="material"
        args={[FoliageShaderMaterial]}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending} 
      />
    </points>
  );
};
