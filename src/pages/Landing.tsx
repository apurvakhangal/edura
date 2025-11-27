import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TranslatedText } from '@/components/TranslatedText';
import { Brain, Sparkles, Target, Users, Zap, Globe } from 'lucide-react';
import HeroScene from '@/components/3D/HeroScene';
import { cn } from '@/lib/utils';

export default function Landing() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';
  const features = [
    {
      icon: Brain,
      title: 'AI Study Assistant',
      description: 'Get instant help, summaries, and personalized learning paths from our AI bot',
    },
    {
      icon: Target,
      title: 'Smart Roadmaps',
      description: 'AI-generated learning roadmaps tailored to your goals and pace',
    },
    {
      icon: Zap,
      title: 'Gamified Learning',
      description: 'Earn XP, unlock achievements, and compete on leaderboards while you learn',
    },
    {
      icon: Users,
      title: 'Study Together',
      description: 'Join study groups, share notes, and learn with a supportive community',
    },
    {
      icon: Globe,
      title: '100+ Languages',
      description: 'Learn in your preferred language with built-in translation',
    },
    {
      icon: Sparkles,
      title: 'Fully Accessible',
      description: 'Dyslexia-friendly, colorblind mode, and screen reader optimized',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden py-16">
        <div className="absolute inset-0">
          <HeroScene variant="background" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background/90" />
          <div
            className="pointer-events-none absolute inset-x-0 top-[-20%] h-[60vh] blur-[140px]"
            style={{ background: isDark ? 'radial-gradient(circle, rgba(96,165,250,0.4), transparent 65%)' : 'radial-gradient(circle, rgba(96,165,250,0.25), transparent 65%)' }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-[-25%] h-[65vh] blur-[150px]"
            style={{ background: isDark ? 'radial-gradient(circle, rgba(192,132,252,0.35), transparent 65%)' : 'radial-gradient(circle, rgba(192,132,252,0.3), transparent 65%)' }}
          />
        </div>

        <div className="container relative z-10 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="pointer-events-none mx-auto flex max-w-4xl flex-col items-center text-center pt-32 pb-12 sm:pt-40 md:pt-48"
          >
            <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
              <h1
                className={cn(
                  'mb-5 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl',
                  isDark ? 'text-white' : 'text-slate-900',
                )}
              >
                <TranslatedText text="Welcome to" />{' '}
                <span
                  className={cn(
                    'bg-clip-text text-transparent',
                    isDark
                      ? 'bg-gradient-cosmic'
                      : 'bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#EC4899]',
                  )}
                >
                  Edura
                </span>
              </h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className={cn('mb-10 max-w-2xl text-lg sm:text-xl', isDark ? 'text-white/85' : 'text-slate-600')}
            >
              <TranslatedText text="An inclusive, AI-powered learning platform designed for everyone. Study smarter, learn faster, achieve more." />
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="flex flex-col items-center gap-4 sm:flex-row"
            >
              <Link to="/register">
                <Button size="lg" className="pointer-events-auto shadow-glow-primary">
                  <TranslatedText text="Start Learning Free" />
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className={cn(
                    isDark
                      ? 'border-white/40 text-white hover:bg-white/10'
                      : 'border-slate-300 text-slate-900 hover:bg-white/70',
                    'pointer-events-auto',
                  )}
                >
                  <TranslatedText text="Sign In" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              <TranslatedText text="Everything You Need to Excel" />
            </h2>
            <p className="text-lg text-muted-foreground">
              <TranslatedText text="Powerful features designed for learners of all abilities" />
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full p-6 transition-all hover:shadow-glow-primary">
                  <feature.icon className="mb-4 h-10 w-10 text-primary" />
                  <h3 className="mb-2 text-xl font-semibold"><TranslatedText text={feature.title} /></h3>
                  <p className="text-muted-foreground"><TranslatedText text={feature.description} /></p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mx-auto max-w-3xl rounded-2xl bg-gradient-cosmic p-8 text-center md:p-12"
          >
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              <TranslatedText text="Ready to Transform Your Learning?" />
            </h2>
            <p className="mb-8 text-lg text-white/90">
              <TranslatedText text="Join thousands of students already learning smarter with Edura" />
            </p>
            <Link to="/register">
              <Button size="lg" variant="secondary" className="shadow-glow-accent">
                <TranslatedText text="Get Started Now" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
