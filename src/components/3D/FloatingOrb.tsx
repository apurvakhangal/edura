import { memo, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface FloatingOrbProps {
  position: [number, number, number];
  color: string;
  scale?: number;
  movementRadius?: number;
  speed?: number;
  delay?: number;
}

const FloatingOrb = memo(function FloatingOrb({
  position,
  color,
  scale = 1,
  movementRadius = 0.3,
  speed = 0.6,
  delay = 0,
}: FloatingOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const basePosition = useMemo(() => [...position] as [number, number, number], [position]);
  const pointer = useThree((state) => state.pointer);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime * speed + delay;

    meshRef.current.position.y = basePosition[1] + Math.sin(t) * movementRadius;
    meshRef.current.position.x = basePosition[0] + pointer.x * 1.1;
    meshRef.current.position.z = basePosition[2] + pointer.y * 0.9;
    meshRef.current.rotation.y += 0.01 + pointer.x * 0.02;
    meshRef.current.rotation.x += 0.006 + pointer.y * 0.015;
  });

  return (
    <mesh ref={meshRef} position={basePosition} scale={scale} castShadow>
      <sphereGeometry args={[0.45, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.8}
        transparent
        opacity={0.9}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  );
});

export default FloatingOrb;
