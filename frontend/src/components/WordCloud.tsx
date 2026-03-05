import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Type describing a single word and its normalised weight.
export interface WordDatum {
  word: string;
  weight: number;
}

// Props for the top‑level word cloud component.  `words` should be an
// array of objects containing a string `word` and a `weight` between 0 and 1.
interface WordCloudProps {
  words: WordDatum[];
}

/**
 * Arrange words evenly on the surface of a sphere using the Fibonacci sphere
 * algorithm.  Each point returned is scaled by the provided radius.
 */
function fibonacciSpherePoints(n: number, radius: number): [number, number, number][] {
  if (n <= 1) return [[0, 0, radius]];
  const points: [number, number, number][] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2; // y goes from 1 to -1
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    points.push([x * radius, y * radius, z * radius]);
  }
  return points;
}

/**
 * Internal component that renders all words in a rotating group.  The group
 * rotation is updated on every frame via the useFrame hook.  Colours are
 * mapped to the weight via HSL so that higher weights appear warmer.
 */
function Cloud({ words }: WordCloudProps) {
  const groupRef = useRef<THREE.Group>(null!);
  // Update rotation on every animation frame
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0027;
      groupRef.current.rotation.x += 0.0007;
    }
  });
  const radius = 5;
  const positions = fibonacciSpherePoints(words.length, radius);
  return (
    <group ref={groupRef}>
      {words.map((item, idx) => {
        const cool = new THREE.Color('#6ee7d6');
        const warm = new THREE.Color('#f59f45');
        const color = cool.clone().lerp(warm, item.weight);
        const fontSize = 0.3 + item.weight * 1.5;
        return (
          <Text
            key={idx}
            position={positions[idx]}
            color={color.getStyle()}
            fontSize={fontSize}
            anchorX="center"
            anchorY="middle"
          >
            {item.word}
          </Text>
        );
      })}
    </group>
  );
}

/**
 * Main word cloud component.  It sets up the Three.js scene via the Canvas
 * component and adds ambient and directional lights.  An OrbitControls
 * component allows the user to rotate and zoom the scene with the mouse.
 */
export default function WordCloudScene({ words }: { words: WordDatum[] }) {
  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
      camera={{ position: [0, 0, 15], fov: 60 }}
    >
      <color attach="background" args={['#10191d']} />
      <fog attach="fog" args={['#10191d', 12, 22]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[8, 6, 6]} intensity={1.1} />
      <pointLight position={[-6, -5, -4]} intensity={0.6} color="#f59f45" />
      <Cloud words={words} />
      <OrbitControls enableZoom={true} enablePan={false} />
    </Canvas>
  );
}
