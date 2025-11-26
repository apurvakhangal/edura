import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, ThumbsUp, Reply, User } from 'lucide-react';
import { getCurrentUserId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface DiscussionPost {
  id: string;
  course_id: string;
  user_id: string;
  user_name: string;
  title: string;
  content: string;
  likes: number;
  replies: DiscussionReply[];
  created_at: string;
}

interface DiscussionReply {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  content: string;
  likes: number;
  created_at: string;
}

interface DiscussionForumProps {
  courseId: string;
  courseTitle: string;
}

export default function DiscussionForum({ courseId, courseTitle }: DiscussionForumProps) {
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('User');
  const { toast } = useToast();

  useEffect(() => {
    loadUser();
    loadPosts();
  }, [courseId]);

  const loadUser = async () => {
    const userId = await getCurrentUserId();
    if (userId) {
      setCurrentUserId(userId);
      // Get user name
      const { data } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single();
      if (data) {
        setCurrentUserName(data.name || 'User');
      }
    }
  };

  const loadPosts = async () => {
    try {
      // For now, use local storage as a simple solution
      // In production, this would be stored in Supabase
      const storedPosts = localStorage.getItem(`discussion_${courseId}`);
      if (storedPosts) {
        setPosts(JSON.parse(storedPosts));
      } else {
        // Sample posts
        const samplePosts: DiscussionPost[] = [
          {
            id: '1',
            course_id: courseId,
            user_id: 'sample-user-1',
            user_name: 'Alex Johnson',
            title: 'Welcome to the Discussion Forum!',
            content: 'Feel free to ask questions, share insights, and help each other learn. Let\'s make this a great learning community!',
            likes: 5,
            replies: [],
            created_at: new Date().toISOString(),
          },
          {
            id: '2',
            course_id: courseId,
            user_id: 'sample-user-2',
            user_name: 'Sarah Chen',
            title: 'Question about Module 3',
            content: 'I\'m having trouble understanding the concepts in Module 3. Can anyone explain it in simpler terms?',
            likes: 3,
            replies: [
              {
                id: 'reply-1',
                post_id: '2',
                user_id: 'sample-user-3',
                user_name: 'Mike Davis',
                content: 'I found Module 3 challenging too. Here\'s what helped me...',
                likes: 2,
                created_at: new Date().toISOString(),
              },
            ],
            created_at: new Date().toISOString(),
          },
        ];
        setPosts(samplePosts);
        localStorage.setItem(`discussion_${courseId}`, JSON.stringify(samplePosts));
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const handleCreatePost = () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in both title and content',
        variant: 'destructive',
      });
      return;
    }

    if (!currentUserId) {
      toast({
        title: 'Error',
        description: 'You must be logged in to post',
        variant: 'destructive',
      });
      return;
    }

    const newPost: DiscussionPost = {
      id: Date.now().toString(),
      course_id: courseId,
      user_id: currentUserId,
      user_name: currentUserName,
      title: newPostTitle,
      content: newPostContent,
      likes: 0,
      replies: [],
      created_at: new Date().toISOString(),
    };

    const updatedPosts = [newPost, ...posts];
    setPosts(updatedPosts);
    localStorage.setItem(`discussion_${courseId}`, JSON.stringify(updatedPosts));
    
    setNewPostTitle('');
    setNewPostContent('');
    setShowNewPost(false);
    
    toast({
      title: 'Success',
      description: 'Post created successfully!',
    });
  };

  const handleReply = (postId: string) => {
    if (!replyContent.trim()) {
      toast({
        title: 'Error',
        description: 'Please write a reply',
        variant: 'destructive',
      });
      return;
    }

    if (!currentUserId) {
      toast({
        title: 'Error',
        description: 'You must be logged in to reply',
        variant: 'destructive',
      });
      return;
    }

    const newReply: DiscussionReply = {
      id: Date.now().toString(),
      post_id: postId,
      user_id: currentUserId,
      user_name: currentUserName,
      content: replyContent,
      likes: 0,
      created_at: new Date().toISOString(),
    };

    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          replies: [...post.replies, newReply],
        };
      }
      return post;
    });

    setPosts(updatedPosts);
    localStorage.setItem(`discussion_${courseId}`, JSON.stringify(updatedPosts));
    
    setReplyContent('');
    setReplyingTo(null);
    
    toast({
      title: 'Success',
      description: 'Reply posted successfully!',
    });
  };

  const handleLike = (postId: string, replyId?: string) => {
    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        if (replyId) {
          return {
            ...post,
            replies: post.replies.map(reply => {
              if (reply.id === replyId) {
                return { ...reply, likes: reply.likes + 1 };
              }
              return reply;
            }),
          };
        } else {
          return { ...post, likes: post.likes + 1 };
        }
      }
      return post;
    });

    setPosts(updatedPosts);
    localStorage.setItem(`discussion_${courseId}`, JSON.stringify(updatedPosts));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Discussion Forum</h2>
          <p className="text-muted-foreground">Ask questions and discuss with other students</p>
        </div>
        <Button onClick={() => setShowNewPost(!showNewPost)}>
          <MessageSquare className="mr-2 h-4 w-4" />
          New Post
        </Button>
      </div>

      {showNewPost && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Post</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Post title..."
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
            />
            <Textarea
              placeholder="Write your post content..."
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              rows={6}
            />
            <div className="flex gap-2">
              <Button onClick={handleCreatePost}>
                <Send className="mr-2 h-4 w-4" />
                Post
              </Button>
              <Button variant="outline" onClick={() => setShowNewPost(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No posts yet. Be the first to start a discussion!</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar>
                        <AvatarFallback>
                          {post.user_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{post.user_name}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(post.created_at)}</p>
                      </div>
                    </div>
                    <CardTitle className="text-lg">{post.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground whitespace-pre-wrap">{post.content}</p>
                
                <div className="flex items-center gap-4 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id)}
                  >
                    <ThumbsUp className="mr-2 h-4 w-4" />
                    {post.likes}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                  >
                    <Reply className="mr-2 h-4 w-4" />
                    Reply
                  </Button>
                </div>

                {replyingTo === post.id && (
                  <div className="space-y-2 pt-2 border-t">
                    <Textarea
                      placeholder="Write your reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleReply(post.id)}>
                        <Send className="mr-2 h-4 w-4" />
                        Post Reply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {post.replies.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-semibold text-sm">Replies ({post.replies.length})</h4>
                    {post.replies.map((reply) => (
                      <div key={reply.id} className="pl-4 border-l-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {reply.user_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold">{reply.user_name}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(reply.created_at)}</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{reply.content}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLike(post.id, reply.id)}
                        >
                          <ThumbsUp className="mr-2 h-3 w-3" />
                          {reply.likes}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

