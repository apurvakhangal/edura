import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TranslatedText } from '@/components/TranslatedText';
import { Users, Globe, Headphones, Video, Copy, Check } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { useToast } from '@/hooks/use-toast';

export default function StudyVR() {
  const user = useUserStore((state) => state.user);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const vrLink = 'https://framevr.io/csgirlieshack';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(vrLink);
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: 'The VR room link has been copied to your clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Please try again or copy manually.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Video className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">
              <TranslatedText text="Study VR" />
            </h1>
            <p className="text-muted-foreground">
              <TranslatedText text="Join your classmates in a virtual study environment" />
            </p>
          </div>
        </div>
      </motion.div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                <TranslatedText text="Collaborative Learning" />
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              <TranslatedText text="Study together with students from around the world in an immersive 3D environment" />
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                <TranslatedText text="Virtual Space" />
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              <TranslatedText text="Experience learning in a shared virtual reality space designed for collaboration" />
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                <TranslatedText text="Voice & Video" />
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              <TranslatedText text="Communicate with other students using voice and video chat features" />
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* VR Environment */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>
              <TranslatedText text="Virtual Study Room" />
            </CardTitle>
            <CardDescription>
              {user?.name ? (
                <>
                  <TranslatedText text="Welcome" />, <span className="font-semibold">{user.name}</span>! <TranslatedText text="Join the virtual study space below." />
                </>
              ) : (
                <TranslatedText text="Join the virtual study space below." />
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative w-full bg-black rounded-b-lg overflow-hidden">
              <iframe
                src="https://framevr.io/csgirlieshack"
                className="w-full border-0"
                allow="microphone; camera; fullscreen; autoplay"
                allowFullScreen
                title="Study VR Environment"
                style={{ minHeight: '600px', height: '75vh' }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Invite Link Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-6"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              <TranslatedText text="Invite Friends" />
            </CardTitle>
            <CardDescription>
              <TranslatedText text="Share this link with your friends to study together in the virtual environment" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="flex-1 p-3 bg-muted rounded-md border border-border flex items-center gap-2">
                <span className="text-sm font-mono text-foreground break-all">
                  {vrLink}
                </span>
              </div>
              <Button
                onClick={copyToClipboard}
                variant={copied ? 'default' : 'outline'}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    <TranslatedText text="Copied!" />
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <TranslatedText text="Copy Link" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-6"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              <TranslatedText text="Getting Started" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                <span>
                  <TranslatedText text="Allow microphone and camera permissions when prompted" />
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                <span>
                  <TranslatedText text="Use WASD keys or arrow keys to move around the virtual space" />
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                <span>
                  <TranslatedText text="Click on other avatars to interact with fellow students" />
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">4.</span>
                <span>
                  <TranslatedText text="Use the chat feature or voice chat to communicate with others" />
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">5.</span>
                <span>
                  <TranslatedText text="Explore the virtual environment and find study spots to collaborate" />
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

