import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GlowParticlesProps {
  count?: number;
  radius?: number;
}

export default function GlowParticles({ count = 180, radius = 6 }: GlowParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      const height = (Math.random() - 0.5) * radius * 0.4;
      data[i * 3] = Math.cos(angle) * distance;
      data[i * 3 + 1] = height;
      data[i * 3 + 2] = Math.sin(angle) * distance;
    }
    return data;
  }, [count, radius]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = clock.elapsedTime * 0.03;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#ffffff"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
