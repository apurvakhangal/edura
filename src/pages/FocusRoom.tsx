import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { TranslatedText } from '@/components/TranslatedText';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Clock, CloudRain, Trees, Coffee, Radio, Waves, Sparkles } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { useSoundPlayer, type SoundType } from '@/hooks/useSoundPlayer';
import { UniverseVisualization } from '@/components/UniverseVisualization';

export default function FocusRoom() {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [duration, setDuration] = useState('25');
  const addXP = useUserStore((state) => state.addXP);
  
  const {
    currentSound,
    isPlaying: isSoundPlaying,
    volume,
    isMuted,
    playSound,
    stopSound,
    setVolume,
    toggleMute,
    frequencyData,
  } = useSoundPlayer();

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((parseInt(duration) * 60 - timeLeft) / (parseInt(duration) * 60)) * 100;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      // Award XP for completed session
      if (mode === 'focus') {
        addXP(parseInt(duration) * 2); // 2 XP per minute
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode, duration, addXP]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(parseInt(duration) * 60);
  };

  const handleDurationChange = (value: string) => {
    setDuration(value);
    setTimeLeft(parseInt(value) * 60);
    setIsRunning(false);
  };

  const handleSoundToggle = (sound: SoundType) => {
    if (currentSound === sound && isSoundPlaying) {
      stopSound();
    } else {
      playSound(sound);
    }
  };

  const soundOptions = [
    { type: 'rain' as SoundType, icon: CloudRain, label: 'Rain Sounds' },
    { type: 'forest' as SoundType, icon: Trees, label: 'Forest Birds' },
    { type: 'cafe' as SoundType, icon: Coffee, label: 'Cafe Ambience' },
    { type: 'white-noise' as SoundType, icon: Radio, label: 'White Noise' },
    { type: 'ocean' as SoundType, icon: Waves, label: 'Ocean Waves' },
    { type: 'space' as SoundType, icon: Sparkles, label: 'Space Ambience' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Visualization */}
      <div className="fixed inset-0 z-0">
        <UniverseVisualization
          soundType={currentSound}
          frequencyData={frequencyData}
          isPlaying={isSoundPlaying}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8 flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground"><TranslatedText text="Focus Room" /></h1>
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Timer */}
        <Card className="bg-background/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle><TranslatedText text="Pomodoro Timer" /></CardTitle>
            <CardDescription>
              <TranslatedText text="Stay focused and productive with timed work sessions" />
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {/* Circular Progress */}
            <div className="relative mb-8 h-64 w-64">
              <svg className="h-full w-full -rotate-90 transform">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 120}`}
                  strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
                  className="text-primary transition-all duration-1000"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div
                  key={`${minutes}-${seconds}`}
                  initial={{ scale: 1.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-6xl font-bold"
                >
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </motion.div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {mode === 'focus' ? <TranslatedText text="Focus Time" /> : <TranslatedText text="Break Time" />}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-4">
              <Button size="lg" onClick={toggleTimer} className="min-w-32">
                {isRunning ? (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    <TranslatedText text="Pause" />
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    <TranslatedText text="Start" />
                  </>
                )}
              </Button>
              <Button size="lg" variant="outline" onClick={resetTimer}>
                <RotateCcw className="mr-2 h-4 w-4" />
                <TranslatedText text="Reset" />
              </Button>
            </div>

            {/* Duration Selector */}
            <div className="mt-6 w-full max-w-xs">
              <label className="mb-2 block text-sm font-medium"><TranslatedText text="Duration (minutes)" /></label>
              <Select value={duration} onValueChange={handleDurationChange} disabled={isRunning}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="25">25 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Settings & Stats */}
        <div className="space-y-6">
          <Card className="bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                <TranslatedText text="Ambient Sounds" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {soundOptions.map((option) => {
                const Icon = option.icon;
                const isActive = currentSound === option.type && isSoundPlaying;
                return (
                  <Button
                    key={option.type}
                    variant={isActive ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => handleSoundToggle(option.type)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <TranslatedText text={option.label} />
                    {isActive && (
                      <motion.div
                        className="ml-auto h-2 w-2 rounded-full bg-primary-foreground"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      />
                    )}
                  </Button>
                );
              })}
              
              {/* Volume Control */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                    <TranslatedText text="Volume" />
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleMute}
                      className="h-8 w-8 p-0"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Slider
                  value={[volume]}
                  onValueChange={(value) => setVolume(value[0])}
                  min={0}
                  max={1}
                  step={0.01}
                  className="w-full"
                  disabled={isMuted}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle><TranslatedText text="Today's Stats" /></CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span><TranslatedText text="Focus Sessions" /></span>
                  <span className="font-semibold">3</span>
                </div>
                <div className="mb-1 flex justify-between text-sm">
                  <span><TranslatedText text="Total Time" /></span>
                  <span className="font-semibold">1h 15m</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span><TranslatedText text="XP Earned" /></span>
                  <span className="font-semibold text-success">+150 XP</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle><TranslatedText text="Pro Tips" /></CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• <TranslatedText text="Take a 5-minute break every 25 minutes" /></li>
                <li>• <TranslatedText text="Stay hydrated during focus sessions" /></li>
                <li>• <TranslatedText text="Remove distractions before starting" /></li>
                <li>• <TranslatedText text="Earn 2 XP per focused minute" /></li>
              </ul>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
}
