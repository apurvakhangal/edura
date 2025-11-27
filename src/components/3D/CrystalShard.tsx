import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CrystalShardProps {
  position: [number, number, number];
  color: string;
  scale?: number;
  spin?: number;
}

const CrystalShard = memo(function CrystalShard({ position, color, scale = 1, spin = 0.2 }: CrystalShardProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;
    meshRef.current.rotation.y = t * spin;
    meshRef.current.rotation.x = Math.sin(t * 0.4) * 0.4;
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale} castShadow>
      <octahedronGeometry args={[0.8, 0]} />
      <meshPhysicalMaterial
        color={color}
        roughness={0.15}
        metalness={0.3}
        envMapIntensity={0.9}
        transmission={0.5}
        emissive={color}
        emissiveIntensity={0.3}
      />
    </mesh>
  );
});

export default CrystalShard;
