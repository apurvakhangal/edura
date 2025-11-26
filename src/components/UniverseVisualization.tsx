import { useEffect, useRef } from 'react';
import type { SoundType } from '@/hooks/useSoundPlayer';

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  speed: number;
  twinkle: number;
  twinkleSpeed: number;
}

interface Planet {
  x: number;
  y: number;
  radius: number;
  color: string;
  orbitRadius: number;
  orbitSpeed: number;
  angle: number;
}

interface UniverseVisualizationProps {
  soundType: SoundType;
  frequencyData: Uint8Array | null;
  isPlaying: boolean;
  className?: string;
}

export function UniverseVisualization({
  soundType,
  frequencyData,
  isPlaying,
  className = '',
}: UniverseVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const starsRef = useRef<Star[]>([]);
  const planetsRef = useRef<Planet[]>([]);
  const timeRef = useRef(0);

  // Initialize stars
  useEffect(() => {
    // Create stars (independent of canvas size)
    starsRef.current = Array.from({ length: 200 }, () => ({
      x: (Math.random() - 0.5) * 2000,
      y: (Math.random() - 0.5) * 2000,
      z: Math.random() * 1000,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.5 + 0.1,
      twinkle: Math.random(),
      twinkleSpeed: Math.random() * 0.02 + 0.01,
    }));
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const centerX = width / 2;
    const centerY = height / 2;

    const animate = () => {
      timeRef.current += 1;

      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      
      // Background color based on sound type - more vibrant and distinct
      if (soundType === 'space') {
        gradient.addColorStop(0, '#0a0a1a');
        gradient.addColorStop(0.5, '#1a1a3e');
        gradient.addColorStop(1, '#2a1a4e');
      } else if (soundType === 'ocean') {
        gradient.addColorStop(0, '#0a1a2a');
        gradient.addColorStop(0.3, '#1e3a6a');
        gradient.addColorStop(0.7, '#1e3a8a');
        gradient.addColorStop(1, '#0a1a3a');
      } else if (soundType === 'rain') {
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#1a2a3e');
        gradient.addColorStop(1, '#16213e');
      } else if (soundType === 'forest') {
        gradient.addColorStop(0, '#0a1a0a');
        gradient.addColorStop(0.5, '#1a2e1a');
        gradient.addColorStop(1, '#0f1a0f');
      } else if (soundType === 'cafe') {
        gradient.addColorStop(0, '#2a1a0a');
        gradient.addColorStop(0.5, '#3a2a1a');
        gradient.addColorStop(1, '#1a0a0a');
      } else if (soundType === 'white-noise') {
        gradient.addColorStop(0, '#0f0f1a');
        gradient.addColorStop(1, '#1a1a2a');
      } else {
        // Default night sky
        gradient.addColorStop(0, '#0a0a1a');
        gradient.addColorStop(1, '#1a1a2e');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Get average frequency for visual effects
      let avgFrequency = 0;
      if (frequencyData && isPlaying) {
        const sum = frequencyData.reduce((a, b) => a + b, 0);
        avgFrequency = sum / frequencyData.length / 255;
      }

      // Draw stars
      starsRef.current.forEach((star) => {
        // Update star position
        star.z -= star.speed;
        if (star.z <= 0) {
          star.z = 1000;
          star.x = (Math.random() - 0.5) * 2000;
          star.y = (Math.random() - 0.5) * 2000;
        }

        // Update twinkle
        star.twinkle += star.twinkleSpeed;
        if (star.twinkle > 1) star.twinkle = 0;

        // Project 3D to 2D
        const k = 128 / star.z;
        const x = centerX + star.x * k;
        const y = centerY + star.y * k;
        const size = star.size * k;

        // Twinkle effect based on sound
        const twinkleIntensity = isPlaying
          ? 0.5 + Math.sin(star.twinkle * Math.PI * 2) * 0.5 * (0.5 + avgFrequency)
          : 0.5 + Math.sin(star.twinkle * Math.PI * 2) * 0.3;

        ctx.fillStyle = `rgba(255, 255, 255, ${twinkleIntensity})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();

        // Add glow effect for brighter stars
        if (twinkleIntensity > 0.7) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Draw planets
      planetsRef.current.forEach((planet) => {
        // Update orbit
        if (planet.orbitRadius > 0) {
          planet.angle += planet.orbitSpeed * (1 + avgFrequency * 0.5);
          planet.x = centerX + Math.cos(planet.angle) * planet.orbitRadius;
          planet.y = centerY + Math.sin(planet.angle) * planet.orbitRadius;
        }

        // Draw planet with glow
        const glowSize = planet.radius + (avgFrequency * 10);
        const gradient = ctx.createRadialGradient(
          planet.x,
          planet.y,
          planet.radius * 0.3,
          planet.x,
          planet.y,
          glowSize
        );
        gradient.addColorStop(0, planet.color);
        gradient.addColorStop(0.5, planet.color + '80');
        gradient.addColorStop(1, planet.color + '00');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Draw planet core
        ctx.fillStyle = planet.color;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw frequency-based particles for active sounds
      if (frequencyData && isPlaying && avgFrequency > 0.1) {
        const particleCount = Math.floor(avgFrequency * 50);
        for (let i = 0; i < particleCount; i++) {
          const angle = (Math.PI * 2 * i) / particleCount + timeRef.current * 0.01;
          const distance = 100 + avgFrequency * 200;
          const x = centerX + Math.cos(angle) * distance;
          const y = centerY + Math.sin(angle) * distance;
          const size = 2 + avgFrequency * 3;

          ctx.fillStyle = `rgba(100, 150, 255, ${0.3 + avgFrequency * 0.5})`;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw nebula clouds for space sound
      if (soundType === 'space' && isPlaying) {
        ctx.globalAlpha = 0.1 + avgFrequency * 0.2;
        for (let i = 0; i < 3; i++) {
          const cloudX = centerX + Math.sin(timeRef.current * 0.001 + i) * 200;
          const cloudY = centerY + Math.cos(timeRef.current * 0.0015 + i) * 150;
          const cloudSize = 100 + avgFrequency * 50;

          const gradient = ctx.createRadialGradient(
            cloudX,
            cloudY,
            0,
            cloudX,
            cloudY,
            cloudSize
          );
          gradient.addColorStop(0, `rgba(100, 50, 200, ${0.5})`);
          gradient.addColorStop(1, 'rgba(100, 50, 200, 0)');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(cloudX, cloudY, cloudSize, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [soundType, frequencyData, isPlaying]);

  // Handle canvas resize and initialization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Reinitialize planets when sound type changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;

    // Recreate planets based on sound type
    planetsRef.current = [];
    if (soundType === 'space') {
      planetsRef.current = [
        {
          x: width / 2,
          y: height / 2,
          radius: 30,
          color: '#4A90E2',
          orbitRadius: 150,
          orbitSpeed: 0.001,
          angle: 0,
        },
        {
          x: width / 2,
          y: height / 2,
          radius: 20,
          color: '#E2A84A',
          orbitRadius: 220,
          orbitSpeed: 0.0008,
          angle: Math.PI / 3,
        },
        {
          x: width / 2,
          y: height / 2,
          radius: 15,
          color: '#E24A4A',
          orbitRadius: 280,
          orbitSpeed: 0.0006,
          angle: Math.PI,
        },
      ];
    } else if (soundType === 'ocean') {
      planetsRef.current = [
        {
          x: width / 2,
          y: height / 2,
          radius: 40,
          color: '#1E3A8A',
          orbitRadius: 0,
          orbitSpeed: 0,
          angle: 0,
        },
      ];
    }
  }, [soundType]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ background: 'transparent' }}
    />
  );
}

