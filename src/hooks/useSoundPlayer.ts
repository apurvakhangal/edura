import { useState, useEffect, useRef, useCallback } from 'react';

export type SoundType = 'rain' | 'forest' | 'cafe' | 'white-noise' | 'ocean' | 'space' | null;

// Free no-copyright music URLs
// 
// IMPORTANT: YouTube doesn't allow direct audio streaming from their platform.
// To use YouTube Audio Library tracks:
// 1. Go to https://www.youtube.com/audiolibrary/music
// 2. Search for: rain, forest birds, cafe, white noise, ocean waves, space ambient
// 3. Download the tracks you want (they're free and no-copyright)
// 4. Place them in your public/audio folder with these names:
//    - rain.mp3
//    - forest.mp3
//    - cafe.mp3
//    - white-noise.mp3
//    - ocean.mp3
//    - space.mp3
// 5. The code will automatically use local files if they exist
//
// Currently using HTML5 Audio with fallback to generated sounds if URLs fail
const AUDIO_URLS: Record<SoundType, string[]> = {
  'rain': [
    '/audio/rain.mp3',
  ],
  'forest': [
    '/audio/forest.mp3',
  ],
  'cafe': [
    '/audio/cafe.mp3',
  ],
  'white-noise': [
    '/audio/white-noise.mp3',
  ],
  'ocean': [
    '/audio/ocean.mp3',
  ],
  'space': [
    '/audio/space.mp3',
  ],
  null: [],
};

interface UseSoundPlayerReturn {
  currentSound: SoundType;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  playSound: (sound: SoundType) => void;
  stopSound: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  frequencyData: Uint8Array | null;
}

// Generate fallback sounds using Web Audio API
const generateFallbackSound = (audioContext: AudioContext, type: SoundType): AudioBufferSourceNode | null => {
  if (!type) return null;

  const sampleRate = audioContext.sampleRate;
  const duration = 4;
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);

  switch (type) {
    case 'rain':
      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        let value = (Math.random() * 2 - 1) * 0.3;
        if (Math.random() > 0.92) {
          const dropTime = t % 0.15;
          const dropFreq = 800 + Math.random() * 1200;
          const envelope = Math.exp(-dropTime * 30) * (1 - Math.exp(-dropTime * 100));
          value += Math.sin(2 * Math.PI * dropFreq * dropTime) * envelope * 0.4;
        }
        if (i > 0) {
          data[i] = value * 0.2 + data[i - 1] * 0.8;
        } else {
          data[i] = value * 0.2;
        }
      }
      break;

    case 'forest':
      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        let value = (Math.random() * 2 - 1) * 0.05;
        if (i > 0) {
          value = value * 0.05 + data[i - 1] * 0.95;
        }
        if (Math.random() > 0.96) {
          const chirpPattern = Math.floor((t * 10) % 4);
          const baseFreq = 800 + Math.random() * 600;
          if (chirpPattern < 2) {
            const noteTime = (t * 10) % 0.3;
            const freq = baseFreq + (chirpPattern * 200);
            const envelope = Math.exp(-noteTime * 15) * (1 - Math.exp(-noteTime * 50));
            const vibrato = 1 + Math.sin(2 * Math.PI * 5 * noteTime) * 0.05;
            value += Math.sin(2 * Math.PI * freq * vibrato * noteTime) * envelope * 0.3;
          }
        }
        data[i] = value;
      }
      break;

    case 'cafe':
      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        let value = 0;
        const chatter = (Math.random() * 2 - 1) * 0.06;
        if (i > 0) {
          value = chatter * 0.1 + data[i - 1] * 0.9;
        } else {
          value = chatter * 0.1;
        }
        const beatTime = t % 8;
        const noteDuration = 2;
        if (beatTime < noteDuration) {
          value += Math.sin(2 * Math.PI * 130.81 * t) * 0.08 * Math.exp(-beatTime * 0.1);
          value += Math.sin(2 * Math.PI * 164.81 * t) * 0.06 * Math.exp(-beatTime * 0.1);
          value += Math.sin(2 * Math.PI * 196.00 * t) * 0.05 * Math.exp(-beatTime * 0.1);
        } else if (beatTime < noteDuration * 2) {
          value += Math.sin(2 * Math.PI * 174.61 * t) * 0.08 * Math.exp(-(beatTime - noteDuration) * 0.1);
          value += Math.sin(2 * Math.PI * 220.00 * t) * 0.06 * Math.exp(-(beatTime - noteDuration) * 0.1);
          value += Math.sin(2 * Math.PI * 261.63 * t) * 0.05 * Math.exp(-(beatTime - noteDuration) * 0.1);
        } else if (beatTime < noteDuration * 3) {
          value += Math.sin(2 * Math.PI * 196.00 * t) * 0.08 * Math.exp(-(beatTime - noteDuration * 2) * 0.1);
          value += Math.sin(2 * Math.PI * 246.94 * t) * 0.06 * Math.exp(-(beatTime - noteDuration * 2) * 0.1);
          value += Math.sin(2 * Math.PI * 293.66 * t) * 0.05 * Math.exp(-(beatTime - noteDuration * 2) * 0.1);
        } else {
          value += Math.sin(2 * Math.PI * 130.81 * t) * 0.08 * Math.exp(-(beatTime - noteDuration * 3) * 0.1);
          value += Math.sin(2 * Math.PI * 164.81 * t) * 0.06 * Math.exp(-(beatTime - noteDuration * 3) * 0.1);
          value += Math.sin(2 * Math.PI * 196.00 * t) * 0.05 * Math.exp(-(beatTime - noteDuration * 3) * 0.1);
        }
        if (i > sampleRate * 0.1) {
          value = value * 0.7 + data[i - Math.floor(sampleRate * 0.1)] * 0.3;
        }
        data[i] = value;
      }
      break;

    case 'white-noise':
      for (let i = 0; i < buffer.length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.25;
      }
      break;

    case 'ocean':
      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        let value = 0;
        const wavePeriod = 4;
        const wavePhase = (t % wavePeriod) / wavePeriod;
        if (wavePhase < 0.3) {
          const buildPhase = wavePhase / 0.3;
          const buildFreq = 60 + buildPhase * 40;
          value += Math.sin(2 * Math.PI * buildFreq * t) * buildPhase * 0.2;
          const waterNoise = (Math.random() * 2 - 1) * 0.15 * buildPhase;
          if (i > 0) {
            value += waterNoise * 0.3 + data[i - 1] * 0.7;
          }
        } else if (wavePhase < 0.5) {
          const crashPhase = (wavePhase - 0.3) / 0.2;
          const crashIntensity = Math.sin(Math.PI * crashPhase);
          value += (Math.random() * 2 - 1) * 0.4 * crashIntensity;
          const splashFreq = 1000 + Math.random() * 2000;
          value += Math.sin(2 * Math.PI * splashFreq * t) * crashIntensity * 0.2;
        } else {
          const retreatPhase = (wavePhase - 0.5) / 0.5;
          const retreatIntensity = 1 - retreatPhase;
          const retreatNoise = (Math.random() * 2 - 1) * 0.25 * retreatIntensity;
          if (i > 0) {
            value = retreatNoise * 0.4 + data[i - 1] * 0.6;
          } else {
            value = retreatNoise * 0.4;
          }
          value += Math.sin(2 * Math.PI * 50 * t) * retreatIntensity * 0.1;
        }
        if (i > 0) {
          data[i] = value * 0.5 + data[i - 1] * 0.5;
        } else {
          data[i] = value * 0.5;
        }
      }
      break;

    case 'space':
      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        let value = 0;
        value += Math.sin(2 * Math.PI * 55 * t) * 0.15;
        value += Math.sin(2 * Math.PI * 110 * t) * 0.08;
        value += Math.sin(2 * Math.PI * 165 * t) * 0.05;
        value += Math.sin(2 * Math.PI * 220 * t) * 0.03;
        const mod = Math.sin(2 * Math.PI * 0.1 * t);
        value *= (1 + mod * 0.2);
        const noise = (Math.random() * 2 - 1) * 0.05;
        if (i > 0) {
          value = (value + noise) * 0.15 + data[i - 1] * 0.85;
        } else {
          value = (value + noise) * 0.15;
        }
        if (Math.random() > 0.995) {
          const sweepFreq = 200 + (t % 2) * 300;
          value += Math.sin(2 * Math.PI * sweepFreq * t) * 0.1 * Math.exp(-(t % 2) * 0.5);
        }
        data[i] = value;
      }
      break;

    default:
      return null;
  }

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
};

export const useSoundPlayer = (): UseSoundPlayerReturn => {
  const [currentSound, setCurrentSound] = useState<SoundType>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previousVolumeRef = useRef(0.5);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Initialize audio context
  useEffect(() => {
    const initAudio = async () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyserNode = ctx.createAnalyser();
        analyserNode.fftSize = 256;
        analyserNode.smoothingTimeConstant = 0.8;

        const gainNode = ctx.createGain();
        gainNode.gain.value = volume;
        gainNode.connect(analyserNode);
        analyserNode.connect(ctx.destination);

        setAudioContext(ctx);
        setAnalyser(analyserNode);
        setFrequencyData(new Uint8Array(analyserNode.frequencyBinCount));
        gainNodeRef.current = gainNode;
      } catch (error) {
        console.error('Error initializing audio context:', error);
      }
    };

    initAudio();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  // Update volume (respect mute state)
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : volume;
    }
    if (audioElementRef.current) {
      audioElementRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Update frequency data
  useEffect(() => {
    if (!analyser || !frequencyData) return;

    const updateFrequencyData = () => {
      analyser.getByteFrequencyData(frequencyData);
      animationFrameRef.current = requestAnimationFrame(updateFrequencyData);
    };

    if (isPlaying) {
      updateFrequencyData();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser, frequencyData, isPlaying]);

  const playSound = useCallback(
    async (sound: SoundType) => {
      if (!audioContext || !analyser || !gainNodeRef.current) return;

      // Stop current sound
      if (sourceRef.current) {
        try {
          sourceRef.current.stop();
          sourceRef.current.disconnect();
        } catch (e) {
          // Source might already be stopped
        }
        sourceRef.current = null;
      }

      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }

      if (mediaSourceRef.current) {
        mediaSourceRef.current.disconnect();
        mediaSourceRef.current = null;
      }

      if (!sound) {
        setIsPlaying(false);
        setCurrentSound(null);
        setUseFallback(false);
        return;
      }

      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const urls = AUDIO_URLS[sound];
      let loaded = false;

      // Try to load from URLs first
      if (urls && urls.length > 0) {
        for (const url of urls) {
          try {
            const audio = new Audio(url);
            audio.loop = true;
            audio.volume = isMuted ? 0 : volume;
            
            await new Promise<void>((resolve, reject) => {
              audio.addEventListener('canplaythrough', () => {
                resolve();
              });
              audio.addEventListener('error', () => {
                reject(new Error('Failed to load audio'));
              });
              audio.load();
              
              // Timeout after 3 seconds
              setTimeout(() => reject(new Error('Timeout')), 3000);
            });

            // Successfully loaded
            audio.play();
            audioElementRef.current = audio;

            // Connect to analyser for visualization
            const mediaSource = audioContext.createMediaElementSource(audio);
            mediaSource.connect(gainNodeRef.current);
            mediaSourceRef.current = mediaSource;

            loaded = true;
            setUseFallback(false);
            break;
          } catch (error) {
            // Try next URL
            continue;
          }
        }
      }

      // If URL loading failed, use generated fallback
      if (!loaded) {
        const source = generateFallbackSound(audioContext, sound);
        if (source) {
          source.connect(gainNodeRef.current);
          source.start(0);
          sourceRef.current = source;
          setUseFallback(true);
        } else {
          console.error(`Failed to load or generate audio for: ${sound}`);
          return;
        }
      }

      setCurrentSound(sound);
      setIsPlaying(true);
    },
    [audioContext, analyser, volume, isMuted]
  );

  const stopSound = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
      } catch (e) {
        // Source might already be stopped
      }
      sourceRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    if (mediaSourceRef.current) {
      mediaSourceRef.current.disconnect();
      mediaSourceRef.current = null;
    }
    setIsPlaying(false);
    setCurrentSound(null);
    setUseFallback(false);
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    previousVolumeRef.current = clampedVolume;
    // Unmute if volume is increased while muted
    if (isMuted && clampedVolume > 0) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      // Unmute - restore previous volume
      setIsMuted(false);
    } else {
      // Mute - save current volume
      previousVolumeRef.current = volume;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  return {
    currentSound,
    isPlaying,
    volume,
    isMuted,
    playSound,
    stopSound,
    setVolume,
    toggleMute,
    audioContext,
    analyser,
    frequencyData,
  };
};
