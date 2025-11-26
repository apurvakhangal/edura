import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TranslatedText } from '@/components/TranslatedText';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  MessageSquare,
  Trophy,
  ThumbsUp,
  Clock,
  Reply,
  Send,
  Plus,
  Star,
  MessageCircle,
  GraduationCap,
  Search,
} from 'lucide-react';
import {
  getForumPosts,
  createForumPost,
  likeForumPost,
  unlikeForumPost,
  getForumReplies,
  createForumReply,
  type ForumPost,
  type ForumReply,
} from '@/services/communityService';
import {
  getStudyGroups,
  joinStudyGroup,
  leaveStudyGroup,
  type StudyGroup,
} from '@/services/communityService';
import {
  getMentors,
  connectWithMentor,
  type Mentor,
} from '@/services/communityService';
import {
  getLeaderboard,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from '@/services/leaderboardService';
import { StudyGroupChat } from '@/components/StudyGroupChat';
import { MentorChat } from '@/components/MentorChat';

export default function Community() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('forum');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>('all');

  // Forum state
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [postReplies, setPostReplies] = useState<Record<string, ForumReply[]>>({});
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('General');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Study groups state
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');

  // Mentors state
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [mentorSearch, setMentorSearch] = useState('');

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Load data
  useEffect(() => {
    loadForumPosts();
    loadStudyGroups();
    loadMentors();
    loadLeaderboard();
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [leaderboardPeriod]);

  const loadForumPosts = async () => {
    const posts = await getForumPosts();
    setForumPosts(posts);
  };

  const loadPostReplies = async (postId: string) => {
    if (!postReplies[postId]) {
      const replies = await getForumReplies(postId);
      setPostReplies((prev) => ({ ...prev, [postId]: replies }));
    }
  };

  const loadStudyGroups = async () => {
    const groups = await getStudyGroups();
    setStudyGroups(groups);
  };

  const loadMentors = async () => {
    const mentorsList = await getMentors();
    setMentors(mentorsList);
  };

  const loadLeaderboard = async () => {
    const entries = await getLeaderboard(leaderboardPeriod);
    setLeaderboard(entries);
  };

  // Forum handlers
  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in both title and content',
        variant: 'destructive',
      });
      return;
    }

    const post = await createForumPost(newPostTitle, newPostContent, newPostCategory);
    if (post) {
      setForumPosts([post, ...forumPosts]);
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostCategory('General');
      setShowNewPost(false);
      toast({
        title: 'Success',
        description: 'Post created successfully!',
      });
    }
  };

  const handleLikePost = async (postId: string, isLiked: boolean) => {
    if (isLiked) {
      await unlikeForumPost(postId);
    } else {
      await likeForumPost(postId);
    }
    loadForumPosts();
  };

  const handleReply = async (postId: string) => {
    if (!replyContent.trim()) {
      toast({
        title: 'Error',
        description: 'Please write a reply',
        variant: 'destructive',
      });
      return;
    }

    const reply = await createForumReply(postId, replyContent);
    if (reply) {
      setPostReplies((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), reply],
      }));
      setReplyContent('');
      setReplyingTo(null);
      loadForumPosts(); // Update reply count
      toast({
        title: 'Success',
        description: 'Reply posted successfully!',
      });
    }
  };

  // Study group handlers
  const handleJoinGroup = async (groupId: string) => {
    const success = await joinStudyGroup(groupId);
    if (success) {
      loadStudyGroups();
      toast({
        title: 'Success',
        description: 'Joined study group successfully!',
      });
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    const success = await leaveStudyGroup(groupId);
    if (success) {
      loadStudyGroups();
      toast({
        title: 'Success',
        description: 'Left study group successfully!',
      });
    }
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || !newGroupDescription.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in both name and description',
        variant: 'destructive',
      });
      return;
    }

    const newGroup: StudyGroup = {
      id: Date.now().toString(),
      name: newGroupName,
      description: newGroupDescription,
      category: 'General',
      members_count: 1,
      is_joined: true,
      created_at: new Date().toISOString(),
    };

    setStudyGroups([newGroup, ...studyGroups]);
    setNewGroupName('');
    setNewGroupDescription('');
    setShowCreateGroup(false);
    toast({
      title: 'Success',
      description: 'Study group created successfully!',
    });
  };

  // Mentor handlers
  const handleConnectMentor = async (mentorId: string) => {
    const success = await connectWithMentor(mentorId);
    if (success) {
      loadMentors();
      toast({
        title: 'Success',
        description: 'Connected with mentor successfully!',
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredMentors = mentors.filter((mentor) =>
    mentor.name.toLowerCase().includes(mentorSearch.toLowerCase()) ||
    mentor.specialization.some((spec) => spec.toLowerCase().includes(mentorSearch.toLowerCase()))
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold"><TranslatedText text="Community" /></h1>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="forum"><TranslatedText text="Forum" /></TabsTrigger>
          <TabsTrigger value="groups"><TranslatedText text="Study Groups" /></TabsTrigger>
          <TabsTrigger value="mentors"><TranslatedText text="Mentors" /></TabsTrigger>
          <TabsTrigger value="leaderboard"><TranslatedText text="Leaderboard" /></TabsTrigger>
        </TabsList>

        {/* Forum */}
        <TabsContent value="forum" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <TranslatedText text="Join discussions and get help from the community" />
            </p>
            <Button onClick={() => setShowNewPost(true)}>
              <Plus className="mr-2 h-4 w-4" />
              <TranslatedText text="New Thread" />
            </Button>
          </div>

          {showNewPost && (
            <Card>
              <CardHeader>
                <CardTitle><TranslatedText text="Create New Post" /></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Post title..."
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                />
                <Select value={newPostCategory} onValueChange={setNewPostCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="React">React</SelectItem>
                    <SelectItem value="TypeScript">TypeScript</SelectItem>
                    <SelectItem value="Python">Python</SelectItem>
                    <SelectItem value="Study Groups">Study Groups</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Write your post content..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={6}
                />
                <div className="flex gap-2">
                  <Button onClick={handleCreatePost}>
                    <Send className="mr-2 h-4 w-4" />
                    <TranslatedText text="Post" />
                  </Button>
                  <Button variant="outline" onClick={() => setShowNewPost(false)}>
                    <TranslatedText text="Cancel" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {forumPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="transition-all hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="outline">{post.category}</Badge>
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(post.created_at)}</span>
                      </div>
                      <h3 className="mb-1 text-lg font-semibold">{post.title}</h3>
                      <div className="mb-2 flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>{post.user_name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <p className="text-sm text-muted-foreground">{post.user_name}</p>
                      </div>
                      <p className="text-muted-foreground whitespace-pre-wrap">{post.content}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4 border-t pt-4">
                    <Button
                      variant={post.liked_by_user ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleLikePost(post.id, post.liked_by_user)}
                    >
                      <ThumbsUp className={`mr-2 h-4 w-4 ${post.liked_by_user ? 'fill-current' : ''}`} />
                      {post.likes_count}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReplyingTo(replyingTo === post.id ? null : post.id);
                        if (replyingTo !== post.id) {
                          loadPostReplies(post.id);
                        }
                      }}
                    >
                      <Reply className="mr-2 h-4 w-4" />
                      {post.replies_count} <TranslatedText text="replies" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPost(post);
                        loadPostReplies(post.id);
                      }}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <TranslatedText text="View All" />
                    </Button>
                  </div>

                  {replyingTo === post.id && (
                    <div className="mt-4 space-y-2 border-t pt-4">
                      <Textarea
                        placeholder="Write your reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleReply(post.id)}>
                          <Send className="mr-2 h-4 w-4" />
                          <TranslatedText text="Post Reply" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent('');
                          }}
                        >
                          <TranslatedText text="Cancel" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {postReplies[post.id] && postReplies[post.id].length > 0 && replyingTo === post.id && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      <h4 className="font-semibold text-sm">
                        <TranslatedText text="Replies" /> ({postReplies[post.id].length})
                      </h4>
                      {postReplies[post.id].map((reply) => (
                        <div key={reply.id} className="space-y-2 border-l-2 pl-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {reply.user_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold">{reply.user_name}</p>
                              <p className="text-xs text-muted-foreground">{formatTimeAgo(reply.created_at)}</p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        {/* Study Groups */}
        <TabsContent value="groups" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <TranslatedText text="Connect with learners and study together" />
            </p>
            <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  <TranslatedText text="Create Group" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle><TranslatedText text="Create Study Group" /></DialogTitle>
                  <DialogDescription>
                    <TranslatedText text="Create a new study group for learners to join" />
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Group name..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                  <Textarea
                    placeholder="Group description..."
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleCreateGroup}>
                      <TranslatedText text="Create" />
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateGroup(false)}>
                      <TranslatedText text="Cancel" />
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {studyGroups.map((group, index) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>{group.name}</CardTitle>
                    <CardDescription>{group.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{group.members_count} <TranslatedText text="members" /></span>
                      </div>
                      <div className="flex gap-2">
                        {group.is_joined && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedGroup(group)}
                          >
                            <MessageCircle className="mr-2 h-4 w-4" />
                            <TranslatedText text="Chat" />
                          </Button>
                        )}
                        <Button
                          variant={group.is_joined ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => {
                            if (group.is_joined) {
                              handleLeaveGroup(group.id);
                            } else {
                              handleJoinGroup(group.id);
                            }
                          }}
                        >
                          {group.is_joined ? <TranslatedText text="Leave" /> : <TranslatedText text="Join" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Mentors */}
        <TabsContent value="mentors" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <TranslatedText text="Connect with experienced mentors for one-on-one guidance" />
            </p>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search mentors..."
                value={mentorSearch}
                onChange={(e) => setMentorSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMentors.map((mentor, index) => (
              <motion.div
                key={mentor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>{mentor.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{mentor.name}</CardTitle>
                        <div className="mt-1 flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-semibold">{mentor.rating}</span>
                          <span className="text-xs text-muted-foreground">
                            ({mentor.students_count} <TranslatedText text="students" />)
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{mentor.bio}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {mentor.specialization.map((spec) => (
                        <Badge key={spec} variant="secondary">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {mentor.is_connected ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setSelectedMentor(mentor)}
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          <TranslatedText text="Chat" />
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => handleConnectMentor(mentor.id)}
                        >
                          <GraduationCap className="mr-2 h-4 w-4" />
                          <TranslatedText text="Connect" />
                      </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Leaderboard */}
        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle><TranslatedText text="Top Learners" /></CardTitle>
                  <CardDescription>
                    {leaderboardPeriod === 'week' && <TranslatedText text="This week's XP rankings" />}
                    {leaderboardPeriod === 'month' && <TranslatedText text="This month's XP rankings" />}
                    {leaderboardPeriod === 'all' && <TranslatedText text="All-time XP rankings" />}
                  </CardDescription>
                </div>
                <Tabs value={leaderboardPeriod} onValueChange={(v) => setLeaderboardPeriod(v as LeaderboardPeriod)}>
                  <TabsList>
                    <TabsTrigger value="week"><TranslatedText text="Week" /></TabsTrigger>
                    <TabsTrigger value="month"><TranslatedText text="Month" /></TabsTrigger>
                    <TabsTrigger value="all"><TranslatedText text="All Time" /></TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboard.map((user, index) => (
                  <motion.div
                    key={user.user_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center gap-4 rounded-lg p-4 ${
                      user.is_current_user ? 'bg-primary/10' : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center font-bold">
                        {user.rank <= 3 ? (
                          <Trophy
                            className={`h-6 w-6 ${
                              user.rank === 1
                                ? 'text-yellow-500'
                                : user.rank === 2
                                ? 'text-gray-400'
                                : 'text-amber-600'
                            }`}
                          />
                        ) : (
                          <span className="text-muted-foreground">{user.rank}</span>
                        )}
                      </div>
                      <Avatar>
                        <AvatarFallback>
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">
                          {user.name} {user.is_current_user && '(You)'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user.xp.toLocaleString()} XP • Level {user.level}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Chat Dialogs */}
      {selectedGroup && (
        <Dialog open={!!selectedGroup} onOpenChange={() => setSelectedGroup(null)}>
          <DialogContent className="max-w-3xl h-[600px] flex flex-col">
            <DialogHeader>
              <DialogTitle>{selectedGroup.name} <TranslatedText text="Chat" /></DialogTitle>
              <DialogDescription>
                <TranslatedText text="Chat with members of this study group" />
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0">
              <StudyGroupChat group={selectedGroup} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {selectedMentor && (
        <Dialog open={!!selectedMentor} onOpenChange={() => setSelectedMentor(null)}>
          <DialogContent className="max-w-3xl h-[600px] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                <TranslatedText text="Chat with" /> {selectedMentor.name}
              </DialogTitle>
              <DialogDescription>
                <TranslatedText text="One-on-one chat with your mentor" />
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0">
              <MentorChat mentor={selectedMentor} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
