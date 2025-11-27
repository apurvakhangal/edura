import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Effects, Preload } from '@react-three/drei';
import { Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useTheme } from 'next-themes';

import FloatingOrb from './FloatingOrb';
import BrainModel from './BrainModel';
import GlowParticles from './GlowParticles';
import CrystalShard from './CrystalShard';
import { cn } from '@/lib/utils';

type SpawnedStar = {
  id: number;
  ndc: [number, number];
  color: string;
  createdAt: number;
  particles: Array<{
    offset: [number, number, number];
    scale: number;
    delay: number;
    hueShift: number;
  }>;
};

function SceneRig({ isDark, spawnedStars }: { isDark: boolean; spawnedStars: SpawnedStar[] }) {
  const parallaxRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const diskRef = useRef<THREE.Mesh>(null);
  const { pointer, camera } = useThree();

  useFrame((state) => {
    if (!groupRef.current) return;
    const targetX = pointer.y * 0.15;
    const targetY = pointer.x * 0.3;
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.05);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.05);

    if (lightRef.current) {
      lightRef.current.position.x = Math.sin(state.clock.elapsedTime) * 2;
      lightRef.current.position.z = Math.cos(state.clock.elapsedTime * 0.6) * 2;
    }

    if (diskRef.current) {
      diskRef.current.rotation.z += 0.0015;
    }

    if (parallaxRef.current) {
      parallaxRef.current.position.x = THREE.MathUtils.lerp(
        parallaxRef.current.position.x,
        pointer.x * 1.6,
        0.06,
      );
      parallaxRef.current.position.y = THREE.MathUtils.lerp(
        parallaxRef.current.position.y,
        pointer.y * 0.9,
        0.06,
      );
      parallaxRef.current.position.z = THREE.MathUtils.lerp(
        parallaxRef.current.position.z,
        pointer.x * 0.6,
        0.05,
      );
    }
  });

  const orbConfigs = useMemo(
    () => [
      {
        position: [-2, 0.2, 0.5] as [number, number, number],
        color: isDark ? '#7C3AED' : '#6D28D9',
        scale: 0.95,
        delay: 0.2,
      },
      {
        position: [2, -0.4, -0.3] as [number, number, number],
        color: isDark ? '#EC4899' : '#DB2777',
        scale: 0.85,
        delay: 0.6,
      },
      {
        position: [0.4, 1.2, 0.2] as [number, number, number],
        color: isDark ? '#38BDF8' : '#0284C7',
        scale: 0.7,
        delay: 0.4,
      },
    ],
    [isDark],
  );

  const popStars = useMemo(() => {
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.4);
    const raycaster = new THREE.Raycaster();
    return spawnedStars.map((star) => {
      const vector = new THREE.Vector2(star.ndc[0], star.ndc[1]);
      raycaster.setFromCamera(vector, camera);
      const point = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, point);
      return { ...star, position: [point.x, point.y, point.z] as [number, number, number] };
    });
  }, [spawnedStars, camera]);

  return (
    <group ref={parallaxRef}>
      <group ref={groupRef}>
        <pointLight ref={lightRef} intensity={20} color="#E879F9" distance={12} decay={2} />
        <GlowParticles />
        <mesh ref={diskRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, -1]}>
          <circleGeometry args={[4.8, 64]} />
          <meshBasicMaterial
            color={isDark ? '#130725' : '#E4ECFF'}
            transparent
            opacity={isDark ? 0.32 : 0.22}
          />
        </mesh>
        <BrainModel />
        <CrystalShard position={[-3, 0.4, -0.8]} color={isDark ? '#8B5CF6' : '#7C3AED'} scale={0.7} />
        <CrystalShard position={[3.2, 0.2, 0.4]} color={isDark ? '#F472B6' : '#EC4899'} scale={0.85} spin={0.15} />
        {orbConfigs.map((config, index) => (
          <FloatingOrb key={`orb-${index}`} {...config} />
        ))}
        {popStars.map((star) => (
          <BurstStar key={star.id} star={star} />
        ))}
      </group>
    </group>
  );
}

function BurstStar({ star }: { star: SpawnedStar & { position: [number, number, number] } }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const children = groupRef.current.children;
    for (let i = 0; i < children.length; i += 1) {
      const child = children[i] as THREE.Mesh;
      const particle = star.particles[i];
      if (!particle) continue;
      const elapsed = Date.now() - star.createdAt - particle.delay;
      if (elapsed < 0) {
        child.visible = false;
        continue;
      }
      child.visible = true;
      const life = Math.min(elapsed / 1400, 1);
      const burst = THREE.MathUtils.lerp(0, 1.2, life);
      child.position.set(
        star.position[0] + particle.offset[0] * burst,
        star.position[1] + particle.offset[1] * burst,
        star.position[2] + particle.offset[2] * burst + life * 0.5,
      );
      child.scale.setScalar(particle.scale * (1 - life));
      const material = child.material as THREE.MeshBasicMaterial;
      material.opacity = 1 - life;
      material.color.setHSL(particle.hueShift, 0.85, 0.65);
    }
  });

  return (
    <group ref={groupRef}>
      {star.particles.map((particle, index) => (
        <mesh key={`${star.id}-particle-${index}`} visible={false}>
          <sphereGeometry args={[0.14, 10, 10]} />
          <meshBasicMaterial color={star.color} transparent opacity={1} />
        </mesh>
      ))}
    </group>
  );
}

interface HeroSceneProps {
  className?: string;
  variant?: 'panel' | 'background';
}

export function HeroScene({ className, variant = 'panel' }: HeroSceneProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';
  const containerRef = useRef<HTMLDivElement>(null);
  const [spawnedStars, setSpawnedStars] = useState<SpawnedStar[]>([]);
  const backdropTop = isDark ? '#C084FC40' : '#C084FC55';
  const backdropBottom = isDark ? '#60A5FA30' : '#60A5FA35';
  const bgColor = isDark ? '#02010A' : '#F4F6FF';
  const directionalColor = isDark ? '#F472B6' : '#C084FC';
  const pointColor = '#60A5FA';
  const isPanel = variant === 'panel';

  const spawnStarAtEvent = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const bounds = containerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const ndcX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      const ndcY = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
      const ndc: [number, number] = [ndcX, ndcY];
      const palette = isDark
        ? ['#F472B6', '#C084FC', '#38BDF8']
        : ['#8B5CF6', '#EC4899', '#2563EB'];
      const baseColor = palette[Math.floor(Math.random() * palette.length)] ?? palette[0];
      const particles = Array.from({ length: 14 }, () => {
        const offset = [
          (Math.random() - 0.5) * 2.8,
          (Math.random() - 0.5) * 2.6,
          (Math.random() - 0.3) * 1.5,
        ] as [number, number, number];
        return {
          offset,
          scale: 0.4 + Math.random() * 0.9,
          delay: Math.random() * 220,
          hueShift: Math.random(),
        };
      });

      setSpawnedStars((prev) => {
        const next = [
          ...prev,
          {
            id: Date.now() + Math.random(),
            ndc,
            color: baseColor,
            createdAt: Date.now(),
            particles,
          },
        ];
        return next.slice(-60);
      });
    },
    [isDark],
  );

  const handleContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      spawnStarAtEvent(event);
    },
    [spawnStarAtEvent],
  );

  const handlePointerDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.button === 0 || event.button === 2) {
        event.preventDefault();
        spawnStarAtEvent(event);
      }
    },
    [spawnStarAtEvent],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setSpawnedStars((prev) => prev.filter((star) => Date.now() - star.createdAt < 1500));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
      viewport={{ once: true }}
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      className={cn(
        'relative overflow-hidden transition-colors duration-700',
        isPanel
          ? cn(
              'mx-auto w-full rounded-[36px] border p-1 backdrop-blur-2xl',
              isDark
                ? 'border-white/10 bg-gradient-to-br from-[#0B0B1C]/95 via-[#050312]/85 to-[#120A2A]/90 shadow-[0_0_80px_rgba(96,165,250,0.45)]'
                : 'border-slate-200 bg-gradient-to-br from-white via-[#F8F5FF] to-[#ECF3FF] shadow-[0_30px_120px_rgba(96,165,250,0.25)]',
            )
          : 'absolute inset-0 h-full w-full',
        className,
      )}
    >
      <div className="absolute inset-0 -z-10 blur-3xl">
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(circle at top, ${backdropTop}, transparent 60%)` }}
        />
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(circle at bottom, ${backdropBottom}, transparent 65%)` }}
        />
      </div>

      <Canvas
        shadows
        camera={{ position: [0, 0, 8], fov: 45 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: true }}
        className={cn(
          'w-full',
          isPanel ? 'h-[520px] md:h-[620px]' : 'h-full min-h-[520px] md:min-h-[640px]',
        )}
      >
        <color attach="background" args={[ bgColor ]} />
        <fog attach="fog" args={[ bgColor, 12, 24 ]} />
        <ambientLight intensity={isDark ? 0.4 : 0.7} />
        <directionalLight position={[4, 6, 4]} intensity={1.2} color={directionalColor} />
        <pointLight position={[-4, -2, 2]} intensity={0.9} color={pointColor} />

        <Suspense fallback={null}>
          <SceneRig isDark={isDark} spawnedStars={spawnedStars} />
          <Effects disableGamma={false} multisamping={4}>
            <Bloom intensity={0.6} luminanceThreshold={0.2} luminanceSmoothing={0.8} />
          </Effects>
          <Preload all />
        </Suspense>
      </Canvas>
    </motion.div>
  );
}

export default HeroScene;
