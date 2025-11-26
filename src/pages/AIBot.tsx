import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { chatWithGemini } from '@/lib/gemini';
import { TranslatedText } from '@/components/TranslatedText';
import { useTranslatedText } from '@/hooks/useTranslation';
import { Sparkles, Send, Mic, Volume2, Languages, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const placeholderText = useTranslatedText('Ask me anything...');

  const suggestions = [
    'Explain quantum physics',
    'Help me with calculus',
    'Create a study plan',
    'Quiz me on history',
  ];

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithGemini([...messages, userMessage]);
      const aiMessage: Message = {
        role: 'assistant',
        content: response,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to get AI response. Please try again.',
        variant: 'destructive',
      });
      // Add error message to chat
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or rephrase your question.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto h-[calc(100vh-4rem)] px-4 py-6">
      <div className="grid h-full gap-6 lg:grid-cols-[1fr_300px]">
        {/* Chat Area */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold"><TranslatedText text="AI Study Assistant" /></h1>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" title="Translate">
                <Languages className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="Read aloud">
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Sparkles className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p className="text-lg font-medium"><TranslatedText text="Start a conversation" /></p>
                    <p className="text-sm"><TranslatedText text="Ask me anything about your studies!" /></p>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                placeholder={placeholderText}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                disabled={isLoading}
              />
              <Button size="icon" variant="ghost" disabled={isLoading}>
                <Mic className="h-4 w-4" />
              </Button>
              <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Suggestions Sidebar */}
        <div className="hidden lg:block space-y-4">
          <Card className="p-4">
            <h3 className="mb-4 font-semibold"><TranslatedText text="Quick Prompts" /></h3>
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  className="w-full justify-start text-left"
                  onClick={() => setInput(suggestion)}
                >
                  <TranslatedText text={suggestion} />
                </Button>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="mb-2 font-semibold"><TranslatedText text="Pro Tips" /></h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <TranslatedText text="Be specific with your questions" /></li>
              <li>• <TranslatedText text="Ask for examples or explanations" /></li>
              <li>• <TranslatedText text="Request step-by-step solutions" /></li>
              <li>• <TranslatedText text="Use voice input for faster queries" /></li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
