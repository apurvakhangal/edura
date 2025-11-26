import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { getCurrentUserId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { StudyGroup } from '@/services/communityService';

interface ChatMessage {
  id: string;
  group_id: string;
  user_id: string;
  user_name: string;
  message: string;
  created_at: string;
}

interface StudyGroupChatProps {
  group: StudyGroup;
}

export function StudyGroupChat({ group }: StudyGroupChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('You');
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUser();
    loadMessages();
  }, [group.id]);

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
        .from('study_group_messages')
        .select(`
          *,
          user:users!study_group_messages_user_id_fkey(name)
        `)
        .eq('group_id', group.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        setMessages(
          data.map((msg: any) => ({
            id: msg.id,
            group_id: msg.group_id,
            user_id: msg.user_id,
            user_name: msg.user?.name || 'Anonymous',
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
    const stored = localStorage.getItem(`study_group_messages_${group.id}`);
    if (stored) {
      setMessages(JSON.parse(stored));
    } else {
      // Default static messages for existing groups
      const defaultMessages: Record<string, ChatMessage[]> = {
        '1': [
          {
            id: 'msg-1-1',
            group_id: '1',
            user_id: 'user-msg-1',
            user_name: 'Alex',
            message: 'Welcome to React Developers group! Let\'s start our first session.',
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'msg-1-2',
            group_id: '1',
            user_id: 'user-msg-2',
            user_name: 'Sarah',
            message: 'Great! When should we schedule our weekly meetup?',
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
          },
          {
            id: 'msg-1-3',
            group_id: '1',
            user_id: 'user-msg-3',
            user_name: 'John',
            message: 'How about every Saturday at 10 AM?',
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 7200000).toISOString(),
          },
        ],
        '2': [
          {
            id: 'msg-2-1',
            group_id: '2',
            user_id: 'user-msg-4',
            user_name: 'Mike',
            message: 'Hello everyone! Excited to learn data science together.',
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'msg-2-2',
            group_id: '2',
            user_id: 'user-msg-5',
            user_name: 'Lisa',
            message: 'Same here! What topics should we cover first?',
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 1800000).toISOString(),
          },
        ],
        '3': [
          {
            id: 'msg-3-1',
            group_id: '3',
            user_id: 'user-msg-6',
            user_name: 'Emma',
            message: 'Good morning early birds! Ready for today\'s study session?',
            created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'msg-3-2',
            group_id: '3',
            user_id: 'user-msg-7',
            user_name: 'David',
            message: 'Morning! Let\'s tackle today\'s coding challenge together.',
            created_at: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
          },
        ],
        '4': [
          {
            id: 'msg-4-1',
            group_id: '4',
            user_id: 'user-msg-8',
            user_name: 'Sophia',
            message: 'Python study group is starting! Who\'s working on the weekly challenge?',
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        '5': [
          {
            id: 'msg-5-1',
            group_id: '5',
            user_id: 'user-msg-9',
            user_name: 'Ryan',
            message: 'JavaScript Masters unite! Let\'s discuss ES6+ features today.',
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        '6': [
          {
            id: 'msg-6-1',
            group_id: '6',
            user_id: 'user-msg-10',
            user_name: 'Nina',
            message: 'ML enthusiasts, let\'s share our project progress!',
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        '7': [
          {
            id: 'msg-7-1',
            group_id: '7',
            user_id: 'user-msg-11',
            user_name: 'Chris',
            message: 'Web dev bootcamp starting! Let\'s build projects together.',
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        '8': [
          {
            id: 'msg-8-1',
            group_id: '8',
            user_id: 'user-msg-12',
            user_name: 'Alex',
            message: 'Daily LeetCode challenge is up! Who solved it?',
            created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          },
        ],
        '10': [
          {
            id: 'msg-10-1',
            group_id: '10',
            user_id: 'user-msg-13',
            user_name: 'Sam',
            message: 'Backend developers, let\'s discuss RESTful API design!',
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        '17': [
          {
            id: 'msg-17-1',
            group_id: '17',
            user_id: 'user-msg-14',
            user_name: 'Jordan',
            message: 'Cloud computing group! AWS certification prep anyone?',
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      };
      
      if (defaultMessages[group.id]) {
        setMessages(defaultMessages[group.id]);
        localStorage.setItem(`study_group_messages_${group.id}`, JSON.stringify(defaultMessages[group.id]));
      }
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      group_id: group.id,
      user_id: currentUserId,
      user_name: currentUserName,
      message: newMessage.trim(),
      created_at: new Date().toISOString(),
    };

    try {
      // Try to save to Supabase
      const { error } = await supabase
        .from('study_group_messages')
        .insert({
          group_id: group.id,
          user_id: currentUserId,
          message: message.message,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving message:', error);
      // Fallback to localStorage
      const stored = localStorage.getItem(`study_group_messages_${group.id}`);
      const messages = stored ? JSON.parse(stored) : [];
      messages.push(message);
      localStorage.setItem(`study_group_messages_${group.id}`, JSON.stringify(messages));
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

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="space-y-4 p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-muted-foreground">
              <div>
                <p className="text-lg font-semibold">No messages yet</p>
                <p className="text-sm">Be the first to start the conversation!</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.user_id === currentUserId ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {msg.user_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`flex max-w-[70%] flex-col ${
                    msg.user_id === currentUserId ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      msg.user_id === currentUserId
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {msg.user_name} • {formatTime(msg.created_at)}
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

