import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TranslatedText } from '@/components/TranslatedText';
import { Brain, Sparkles, Target, Users, Zap, Globe } from 'lucide-react';

export default function Landing() {
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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="container px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            {/* Orbiting Animation */}
            <div className="relative mx-auto mb-8 h-40 w-40">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0"
              >
                {[0, 60, 120, 180, 240, 300].map((angle) => (
                  <motion.div
                    key={angle}
                    className="absolute h-6 w-6 rounded-full bg-gradient-accent"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: `rotate(${angle}deg) translateX(60px) translateY(-50%)`,
                    }}
                  />
                ))}
              </motion.div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-16 w-16 text-primary" />
              </div>
            </div>

            <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl">
              <TranslatedText text="Welcome to" />{' '}
              <span className="bg-gradient-cosmic bg-clip-text text-transparent">
                Edura
              </span>
            </h1>
            
            <p className="mb-8 text-xl text-muted-foreground md:text-2xl">
              <TranslatedText text="An inclusive, AI-powered learning platform designed for everyone. Study smarter, learn faster, achieve more." />
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/register">
                <Button size="lg" className="shadow-glow-primary">
                  <TranslatedText text="Start Learning Free" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline">
                  <TranslatedText text="Sign In" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Cosmic Background Effect */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-1/2 left-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
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
