import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { getCurrentUserId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Mentor } from '@/services/communityService';

interface ChatMessage {
  id: string;
  mentor_id: string;
  student_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  created_at: string;
}

interface MentorChatProps {
  mentor: Mentor;
}

export function MentorChat({ mentor }: MentorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('You');
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUser();
    loadMessages();
  }, [mentor.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadUser = async () => {
    const userId = await getCurrentUserId();
    if (userId) {
      setCurrentUserId(userId);
      const { data } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single();
      if (data) {
        setCurrentUserName(data.name || 'You');
      }
    }
  };

  const loadMessages = async () => {
    try {
      // Try to load from Supabase
      const { data, error } = await supabase
        .from('mentor_messages')
        .select(`
          *,
          sender:users!mentor_messages_sender_id_fkey(name)
        `)
        .eq('mentor_id', mentor.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        setMessages(
          data.map((msg: any) => ({
            id: msg.id,
            mentor_id: msg.mentor_id,
            student_id: msg.student_id,
            sender_id: msg.sender_id,
            sender_name: msg.sender?.name || 'Anonymous',
            message: msg.message,
            created_at: msg.created_at,
          }))
        );
        return;
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }

    // Fallback to localStorage
    const stored = localStorage.getItem(`mentor_messages_${mentor.id}`);
    if (stored) {
      setMessages(JSON.parse(stored));
    } else {
      // Welcome message
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        mentor_id: mentor.id,
        student_id: currentUserId || '',
        sender_id: mentor.user_id,
        sender_name: mentor.name,
        message: `Hello! I'm ${mentor.name}, your mentor. I specialize in ${mentor.specialization.join(', ')}. How can I help you today?`,
        created_at: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      mentor_id: mentor.id,
      student_id: currentUserId,
      sender_id: currentUserId,
      sender_name: currentUserName,
      message: newMessage.trim(),
      created_at: new Date().toISOString(),
    };

    try {
      // Try to save to Supabase
      const { error } = await supabase
        .from('mentor_messages')
        .insert({
          mentor_id: mentor.id,
          student_id: currentUserId,
          sender_id: currentUserId,
          message: message.message,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving message:', error);
      // Fallback to localStorage
      const stored = localStorage.getItem(`mentor_messages_${mentor.id}`);
      const messages = stored ? JSON.parse(stored) : [];
      messages.push(message);
      localStorage.setItem(`mentor_messages_${mentor.id}`, JSON.stringify(messages));
    }

    setMessages((prev) => [...prev, message]);
    setNewMessage('');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isMyMessage = (message: ChatMessage) => message.sender_id === currentUserId;

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="space-y-4 p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-muted-foreground">
              <div>
                <p className="text-lg font-semibold">Start your conversation</p>
                <p className="text-sm">Send a message to {mentor.name}</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${isMyMessage(msg) ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {msg.sender_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`flex max-w-[70%] flex-col ${
                    isMyMessage(msg) ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      isMyMessage(msg)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {msg.sender_name} • {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button onClick={sendMessage} disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

