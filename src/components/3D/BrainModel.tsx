import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function BrainModel() {
  const prismRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const pointer = useThree((state) => state.pointer);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const float = Math.sin(elapsed * 1.2) * 0.2;
    const tiltX = pointer.y * 0.4;
    const tiltY = pointer.x * 0.6;

    if (prismRef.current) {
      prismRef.current.rotation.y = elapsed * 0.6 + tiltY * 0.8;
      prismRef.current.rotation.x = Math.sin(elapsed * 0.5) * 0.35 + tiltX * 0.6;
      prismRef.current.position.y = 1.4 + float;
    }

    if (coreRef.current) {
      coreRef.current.rotation.y = -elapsed * 0.9 + tiltY * 1.2;
      const pulsate = 1 + Math.sin(elapsed * 2) * 0.1;
      coreRef.current.scale.setScalar(pulsate);
      coreRef.current.position.y = 1.4 + float * 0.8;
    }

    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2;
      ringRef.current.rotation.z = elapsed * 0.35 + tiltY * 0.5;
      ringRef.current.position.y = 1.4 + float * 0.6;
    }
  });

  return (
    <group>
      <mesh ref={prismRef} position={[0, 1.4, 0]}>
        <icosahedronGeometry args={[1.3, 2]} />
        <meshPhysicalMaterial
          color="#F1DCFF"
          envMapIntensity={1.5}
          transmission={0.95}
          roughness={0.05}
          thickness={1.3}
          clearcoat={1}
          clearcoatRoughness={0.15}
          side={THREE.DoubleSide}
          emissive="#C084FC"
          emissiveIntensity={0.4}
        />
      </mesh>

      <mesh ref={coreRef} position={[0, 1.4, 0]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial
          color="#7DD3FC"
          emissive="#60A5FA"
          emissiveIntensity={1.1}
          transparent
          opacity={0.9}
        />
      </mesh>

      <mesh ref={ringRef} position={[0, 1.4, 0]}>
        <torusGeometry args={[1.6, 0.05, 32, 120]} />
        <meshStandardMaterial
          color="#F472B6"
          emissive="#F472B6"
          emissiveIntensity={0.8}
          metalness={0.6}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}
