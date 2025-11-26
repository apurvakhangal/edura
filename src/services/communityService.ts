import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/auth';

export interface ForumPost {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  title: string;
  content: string;
  category: string;
  likes_count: number;
  replies_count: number;
  liked_by_user: boolean;
  created_at: string;
  updated_at: string;
}

export interface ForumReply {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  likes_count: number;
  liked_by_user: boolean;
  parent_reply_id?: string;
  created_at: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  category: string;
  members_count: number;
  is_joined: boolean;
  created_at: string;
}

export interface Mentor {
  id: string;
  user_id: string;
  name: string;
  avatar?: string;
  specialization: string[];
  bio: string;
  rating: number;
  students_count: number;
  is_connected: boolean;
}

// Forum Posts
export async function getForumPosts(category?: string): Promise<ForumPost[]> {
  try {
    const userId = await getCurrentUserId();
    let query = supabase
      .from('forum_posts')
      .select(`
        *,
        user:users!forum_posts_user_id_fkey(name, avatar),
        likes:forum_post_likes(count),
        replies:forum_replies(count)
      `)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      // If table doesn't exist (404) or other expected errors, fall back silently
      if ((error as any).code === 'PGRST205' || (error as any).code === '42P01' || 
          (error as any).status === 404 || (error as any).status === 400 ||
          error.message?.includes('Could not find') || error.message?.includes('does not exist')) {
        return getLocalForumPosts(category);
      }
      throw error;
    }

    return (data || []).map((post: any) => ({
      id: post.id,
      user_id: post.user_id,
      user_name: post.user?.name || 'Anonymous',
      user_avatar: post.user?.avatar,
      title: post.title,
      content: post.content,
      category: post.category,
      likes_count: post.likes?.[0]?.count || 0,
      replies_count: post.replies?.[0]?.count || 0,
      liked_by_user: post.likes?.some((like: any) => like.user_id === userId) || false,
      created_at: post.created_at,
      updated_at: post.updated_at,
    }));
  } catch (error: any) {
    // Silently fall back to localStorage for any errors
    // This is expected when Supabase tables don't exist
    return getLocalForumPosts(category);
  }
}

export async function createForumPost(
  title: string,
  content: string,
  category: string
): Promise<ForumPost | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('name, avatar')
      .eq('id', userId)
      .single();

    const { data, error } = await supabase
      .from('forum_posts')
      .insert({
        user_id: userId,
        title,
        content,
        category,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      user_id: data.user_id,
      user_name: userData?.name || 'Anonymous',
      user_avatar: userData?.avatar,
      title: data.title,
      content: data.content,
      category: data.category,
      likes_count: 0,
      replies_count: 0,
      liked_by_user: false,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('Error creating forum post:', error);
    return createLocalForumPost(title, content, category);
  }
}

export async function likeForumPost(postId: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('forum_post_likes')
      .insert({ post_id: postId, user_id: userId });

    if (error && error.code !== '23505') throw error; // Ignore duplicate key error
    return true;
  } catch (error) {
    console.error('Error liking post:', error);
    return likeLocalForumPost(postId);
  }
}

export async function unlikeForumPost(postId: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('forum_post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error unliking post:', error);
    return unlikeLocalForumPost(postId);
  }
}

// Forum Replies
export async function getForumReplies(postId: string): Promise<ForumReply[]> {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('forum_replies')
      .select(`
        *,
        user:users!forum_replies_user_id_fkey(name),
        likes:forum_reply_likes(count)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      // If table doesn't exist (404) or other expected errors, fall back silently
      if ((error as any).code === 'PGRST205' || (error as any).code === '42P01' || 
          (error as any).status === 404 || (error as any).status === 400 ||
          error.message?.includes('Could not find') || error.message?.includes('does not exist')) {
        return getLocalForumReplies(postId);
      }
      throw error;
    }

    const dbReplies = (data || []).map((reply: any) => ({
      id: reply.id,
      post_id: reply.post_id,
      user_id: reply.user_id,
      user_name: reply.user?.name || 'Anonymous',
      user_avatar: reply.user?.avatar,
      content: reply.content,
      likes_count: reply.likes?.[0]?.count || 0,
      liked_by_user: reply.likes?.some((like: any) => like.user_id === userId) || false,
      parent_reply_id: reply.parent_reply_id,
      created_at: reply.created_at,
    }));

    // Merge with local replies (static + dynamic)
    const localReplies = getLocalForumReplies(postId);
    const allReplies = [...dbReplies, ...localReplies];
    
    // Remove duplicates and sort by date
    const uniqueReplies = Array.from(
      new Map(allReplies.map((reply) => [reply.id, reply])).values()
    ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return uniqueReplies;
  } catch (error: any) {
    // Silently fall back to localStorage for any errors
    // This is expected when Supabase tables don't exist
    return getLocalForumReplies(postId);
  }
}

export async function createForumReply(
  postId: string,
  content: string,
  parentReplyId?: string
): Promise<ForumReply | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('name, avatar')
      .eq('id', userId)
      .single();

    const { data, error } = await supabase
      .from('forum_replies')
      .insert({
        post_id: postId,
        user_id: userId,
        content,
        parent_reply_id: parentReplyId,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      post_id: data.post_id,
      user_id: data.user_id,
      user_name: userData?.name || 'Anonymous',
      user_avatar: userData?.avatar,
      content: data.content,
      likes_count: 0,
      liked_by_user: false,
      parent_reply_id: data.parent_reply_id,
      created_at: data.created_at,
    };
  } catch (error) {
    console.error('Error creating reply:', error);
    return createLocalForumReply(postId, content, parentReplyId);
  }
}

// Study Groups
export async function getStudyGroups(): Promise<StudyGroup[]> {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('study_groups')
      .select(`
        *,
        members:study_group_members(count),
        user_membership:study_group_members!inner(user_id)
      `)
      .eq('user_membership.user_id', userId || '');

    if (error) {
      // If table doesn't exist (404) or other expected errors, fall back silently
      if ((error as any).code === 'PGRST205' || (error as any).code === '42P01' || 
          (error as any).status === 404 || (error as any).status === 400 ||
          error.message?.includes('Could not find') || error.message?.includes('does not exist')) {
        return getLocalStudyGroups();
      }
      throw error;
    }

    const dbGroups = (data || []).map((group: any) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      category: group.category,
      members_count: group.members?.[0]?.count || 0,
      is_joined: group.user_membership?.length > 0 || false,
      created_at: group.created_at,
    }));

    // Merge with local groups (static + dynamic)
    const localGroups = getLocalStudyGroups();
    const allGroups = [...dbGroups, ...localGroups];
    
    // Remove duplicates
    const uniqueGroups = Array.from(
      new Map(allGroups.map((group) => [group.id, group])).values()
    );

    return uniqueGroups;
  } catch (error: any) {
    // Silently fall back to localStorage for any errors
    // This is expected when Supabase tables don't exist
    return getLocalStudyGroups();
  }
}

export async function joinStudyGroup(groupId: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('study_group_members')
      .insert({ group_id: groupId, user_id: userId });

    if (error && error.code !== '23505') throw error;
    return true;
  } catch (error) {
    console.error('Error joining study group:', error);
    return joinLocalStudyGroup(groupId);
  }
}

export async function leaveStudyGroup(groupId: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('study_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error leaving study group:', error);
    return leaveLocalStudyGroup(groupId);
  }
}

// Mentors
export async function getMentors(specialization?: string): Promise<Mentor[]> {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('mentors')
      .select(`
        *,
        user:users!mentors_user_id_fkey(name, avatar),
        connections:mentor_connections(count),
        user_connection:mentor_connections!inner(student_id)
      `)
      .eq('user_connection.student_id', userId || '');

    if (error) {
      // If table doesn't exist (404) or other expected errors, fall back silently
      if ((error as any).code === 'PGRST205' || (error as any).code === '42P01' || 
          (error as any).status === 404 || (error as any).status === 400 ||
          error.message?.includes('Could not find') || error.message?.includes('does not exist')) {
        const mentors = getLocalMentors();
        if (specialization) {
          return mentors.filter((mentor) =>
            mentor.specialization.some((spec) =>
              spec.toLowerCase().includes(specialization.toLowerCase())
            )
          );
        }
        return mentors;
      }
      throw error;
    }

    const dbMentors = (data || []).map((mentor: any) => ({
      id: mentor.id,
      user_id: mentor.user_id,
      name: mentor.user?.name || 'Anonymous',
      avatar: mentor.user?.avatar,
      specialization: mentor.specialization || [],
      bio: mentor.bio,
      rating: mentor.rating || 0,
      students_count: mentor.connections?.[0]?.count || 0,
      is_connected: mentor.user_connection?.length > 0 || false,
    }));

    // Merge with local mentors (static + dynamic)
    const localMentors = getLocalMentors();
    let allMentors = [...dbMentors, ...localMentors];
    
    // Filter by specialization if provided
    if (specialization) {
      allMentors = allMentors.filter((mentor) =>
        mentor.specialization.some((spec) =>
          spec.toLowerCase().includes(specialization.toLowerCase())
        )
      );
    }
    
    // Remove duplicates
    const uniqueMentors = Array.from(
      new Map(allMentors.map((mentor) => [mentor.id, mentor])).values()
    );

    return uniqueMentors;
  } catch (error: any) {
    // Silently fall back to localStorage for any errors
    // This is expected when Supabase tables don't exist
    const mentors = getLocalMentors();
    if (specialization) {
      return mentors.filter((mentor) =>
        mentor.specialization.some((spec) =>
          spec.toLowerCase().includes(specialization.toLowerCase())
        )
      );
    }
    return mentors;
  }
}

export async function connectWithMentor(mentorId: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('mentor_connections')
      .insert({ mentor_id: mentorId, student_id: userId });

    if (error && error.code !== '23505') throw error;
    return true;
  } catch (error) {
    console.error('Error connecting with mentor:', error);
    return connectLocalMentor(mentorId);
  }
}

// Local storage fallbacks
function getLocalForumPosts(category?: string): ForumPost[] {
  const stored = localStorage.getItem('forum_posts');
  let posts: ForumPost[] = [];
  
  if (stored) {
    posts = JSON.parse(stored);
  } else {
    // Default static discussions
    posts = [
      {
        id: '1',
        user_id: 'user-1',
        user_name: 'Sarah K.',
        title: 'How do I master React Hooks?',
        content: 'I\'ve been learning React for a while now, but I\'m struggling with hooks. Can anyone share their learning journey or recommend good resources?',
        category: 'React',
        likes_count: 24,
        replies_count: 12,
        liked_by_user: false,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        user_id: 'user-2',
        user_name: 'John D.',
        title: 'Best resources for learning TypeScript?',
        content: 'Looking for recommendations on the best courses, tutorials, or books to learn TypeScript. What worked best for you?',
        category: 'TypeScript',
        likes_count: 15,
        replies_count: 8,
        liked_by_user: false,
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '3',
        user_id: 'user-3',
        user_name: 'Alex M.',
        title: 'Study group for algorithms - anyone interested?',
        content: 'I\'m preparing for technical interviews and would love to form a study group. We can solve problems together, share resources, and keep each other motivated!',
        category: 'Study Groups',
        likes_count: 45,
        replies_count: 23,
        liked_by_user: false,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '4',
        user_id: 'user-4',
        user_name: 'Maria L.',
        title: 'Python vs JavaScript for beginners?',
        content: 'I\'m completely new to programming. Should I start with Python or JavaScript? What are the pros and cons of each?',
        category: 'General',
        likes_count: 18,
        replies_count: 15,
        liked_by_user: false,
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '5',
        user_id: 'user-5',
        user_name: 'David R.',
        title: 'How to stay motivated while learning?',
        content: 'I often lose motivation after a few weeks of learning. How do you all stay consistent and motivated in your learning journey?',
        category: 'General',
        likes_count: 32,
        replies_count: 20,
        liked_by_user: false,
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '6',
        user_id: 'user-6',
        user_name: 'Emma T.',
        title: 'Building my first full-stack app - need advice!',
        content: 'I want to build a todo app with React frontend and Node.js backend. Any tips on project structure, best practices, or common pitfalls to avoid?',
        category: 'React',
        likes_count: 28,
        replies_count: 16,
        liked_by_user: false,
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      },
    ];
    localStorage.setItem('forum_posts', JSON.stringify(posts));
  }
  
  return category ? posts.filter((p: ForumPost) => p.category === category) : posts;
}

function createLocalForumPost(title: string, content: string, category: string): ForumPost | null {
  const userId = 'local-user';
  const post: ForumPost = {
    id: Date.now().toString(),
    user_id: userId,
    user_name: 'You',
    title,
    content,
    category,
    likes_count: 0,
    replies_count: 0,
    liked_by_user: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const posts = getLocalForumPosts();
  posts.unshift(post);
  localStorage.setItem('forum_posts', JSON.stringify(posts));
  return post;
}

function likeLocalForumPost(postId: string): boolean {
  const posts = getLocalForumPosts();
  const post = posts.find((p: ForumPost) => p.id === postId);
  if (post) {
    post.likes_count++;
    post.liked_by_user = true;
    localStorage.setItem('forum_posts', JSON.stringify(posts));
    return true;
  }
  return false;
}

function unlikeLocalForumPost(postId: string): boolean {
  const posts = getLocalForumPosts();
  const post = posts.find((p: ForumPost) => p.id === postId);
  if (post) {
    post.likes_count--;
    post.liked_by_user = false;
    localStorage.setItem('forum_posts', JSON.stringify(posts));
    return true;
  }
  return false;
}

function getLocalForumReplies(postId: string): ForumReply[] {
  const stored = localStorage.getItem(`forum_replies_${postId}`);
  if (stored) {
    return JSON.parse(stored);
  }
  
  // Default static replies for existing posts
  const defaultReplies: Record<string, ForumReply[]> = {
    '1': [
      {
        id: 'reply-1-1',
        post_id: '1',
        user_id: 'user-reply-1',
        user_name: 'Mike D.',
        content: 'I found the React documentation really helpful. Start with useState and useEffect, then move to custom hooks.',
        likes_count: 5,
        liked_by_user: false,
        created_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'reply-1-2',
        post_id: '1',
        user_id: 'user-reply-2',
        user_name: 'Anna K.',
        content: 'Check out the "React Hooks in Depth" course on this platform. It\'s excellent!',
        likes_count: 3,
        liked_by_user: false,
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
    ],
    '2': [
      {
        id: 'reply-2-1',
        post_id: '2',
        user_id: 'user-reply-3',
        user_name: 'Tom R.',
        content: 'The TypeScript Handbook is the best free resource. Also check out TypeScript Deep Dive.',
        likes_count: 4,
        liked_by_user: false,
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      },
    ],
    '3': [
      {
        id: 'reply-3-1',
        post_id: '3',
        user_id: 'user-reply-4',
        user_name: 'Chris L.',
        content: 'I\'m interested! I\'m also preparing for interviews. Let\'s form a group!',
        likes_count: 8,
        liked_by_user: false,
        created_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'reply-3-2',
        post_id: '3',
        user_id: 'user-reply-5',
        user_name: 'Jessica M.',
        content: 'Count me in! I\'ve been looking for a study group for algorithms.',
        likes_count: 6,
        liked_by_user: false,
        created_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
      },
    ],
  };
  
  if (defaultReplies[postId]) {
    localStorage.setItem(`forum_replies_${postId}`, JSON.stringify(defaultReplies[postId]));
    return defaultReplies[postId];
  }
  
  return [];
}

function createLocalForumReply(postId: string, content: string, parentReplyId?: string): ForumReply | null {
  const userId = 'local-user';
  const reply: ForumReply = {
    id: Date.now().toString(),
    post_id: postId,
    user_id: userId,
    user_name: 'You',
    content,
    likes_count: 0,
    liked_by_user: false,
    parent_reply_id: parentReplyId,
    created_at: new Date().toISOString(),
  };
  const replies = getLocalForumReplies(postId);
  replies.push(reply);
  localStorage.setItem(`forum_replies_${postId}`, JSON.stringify(replies));
  
  // Update reply count in post
  const posts = getLocalForumPosts();
  const post = posts.find((p: ForumPost) => p.id === postId);
  if (post) {
    post.replies_count = replies.length;
    localStorage.setItem('forum_posts', JSON.stringify(posts));
  }
  
  return reply;
}

function getLocalStudyGroups(): StudyGroup[] {
  const stored = localStorage.getItem('study_groups');
  if (!stored) {
    // Default groups - more study groups
    const defaultGroups: StudyGroup[] = [
      {
        id: '1',
        name: 'React Developers',
        description: 'Learn React together with weekly sessions and code reviews',
        category: 'Web Development',
        members_count: 245,
        is_joined: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'Data Science Beginners',
        description: 'Starting your data science journey? Join us for collaborative learning!',
        category: 'Data Science',
        members_count: 189,
        is_joined: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '3',
        name: 'Morning Study Squad',
        description: 'Early birds studying together 6-8 AM daily',
        category: 'General',
        members_count: 156,
        is_joined: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '4',
        name: 'Python Programming',
        description: 'Master Python from basics to advanced. Weekly challenges and discussions.',
        category: 'Python',
        members_count: 312,
        is_joined: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '5',
        name: 'JavaScript Masters',
        description: 'Deep dive into JavaScript, ES6+, and modern frameworks',
        category: 'JavaScript',
        members_count: 278,
        is_joined: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '6',
        name: 'Machine Learning Enthusiasts',
        description: 'Learn ML algorithms, work on projects, and share knowledge',
        category: 'Machine Learning',
        members_count: 201,
        is_joined: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '7',
        name: 'Web Development Bootcamp',
        description: 'Full-stack web development study group. HTML, CSS, JS, and more!',
        category: 'Web Development',
        members_count: 167,
        is_joined: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '8',
        name: 'Algorithm Practice',
        description: 'Daily LeetCode problems, coding challenges, and interview prep',
        category: 'Algorithms',
        members_count: 234,
        is_joined: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '9',
        name: 'UI/UX Designers',
        description: 'Learn design principles, tools, and create beautiful interfaces',
        category: 'Design',
        members_count: 145,
        is_joined: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '10',
        name: 'Backend Developers',
        description: 'Master server-side development, APIs, databases, and system architecture',
        category: 'Backend',
        members_count: 198,
        is_joined: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '11',
        name: 'Cybersecurity Learners',
        description: 'Learn about security, ethical hacking, and protecting systems',
        category: 'Security',
        members_count: 134,
        is_joined: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '12',
        name: 'Game Development',
        description: 'Create games using Unity, Unreal Engine, or web technologies',
        category: 'Game Dev',
        members_count: 167,
        is_joined: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '13',
        name: 'Blockchain & Web3',
        description: 'Explore blockchain technology, smart contracts, and decentralized apps',
        category: 'Blockchain',
        members_count: 112,
        is_joined: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '14',
        name: 'iOS Development',
        description: 'Learn Swift and build iOS apps for iPhone and iPad',
        category: 'Mobile',
        members_count: 156,
        is_joined: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '15',
        name: 'Android Development',
        description: 'Master Kotlin/Java and create Android applications',
        category: 'Mobile',
        members_count: 189,
        is_joined: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '16',
        name: 'Database Masters',
        description: 'Deep dive into SQL, NoSQL, database design, and optimization',
        category: 'Database',
        members_count: 178,
        is_joined: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '17',
        name: 'Cloud Computing',
        description: 'Learn AWS, Azure, GCP, and cloud architecture patterns',
        category: 'Cloud',
        members_count: 203,
        is_joined: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '18',
        name: 'Open Source Contributors',
        description: 'Contribute to open source projects and build your portfolio',
        category: 'General',
        members_count: 221,
        is_joined: false,
        created_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem('study_groups', JSON.stringify(defaultGroups));
    return defaultGroups;
  }
  return JSON.parse(stored);
}

function joinLocalStudyGroup(groupId: string): boolean {
  const groups = getLocalStudyGroups();
  const group = groups.find((g: StudyGroup) => g.id === groupId);
  if (group) {
    group.is_joined = true;
    group.members_count++;
    localStorage.setItem('study_groups', JSON.stringify(groups));
    return true;
  }
  return false;
}

function leaveLocalStudyGroup(groupId: string): boolean {
  const groups = getLocalStudyGroups();
  const group = groups.find((g: StudyGroup) => g.id === groupId);
  if (group) {
    group.is_joined = false;
    group.members_count--;
    localStorage.setItem('study_groups', JSON.stringify(groups));
    return true;
  }
  return false;
}

function getLocalMentors(): Mentor[] {
  const stored = localStorage.getItem('mentors');
  if (!stored) {
    const defaultMentors: Mentor[] = [
      {
        id: '1',
        user_id: 'mentor-1',
        name: 'Dr. Sarah Chen',
        specialization: ['Machine Learning', 'Python', 'Data Science'],
        bio: '10+ years of experience in ML and data science. Former Google engineer. Passionate about teaching and helping students succeed.',
        rating: 4.9,
        students_count: 150,
        is_connected: false,
      },
      {
        id: '2',
        user_id: 'mentor-2',
        name: 'John Martinez',
        specialization: ['React', 'TypeScript', 'Full Stack'],
        bio: 'Senior software engineer at Microsoft. Expert in modern web development. Love sharing knowledge and best practices.',
        rating: 4.8,
        students_count: 200,
        is_connected: false,
      },
      {
        id: '3',
        user_id: 'mentor-3',
        name: 'Emily Watson',
        specialization: ['Algorithms', 'Competitive Programming', 'C++'],
        bio: 'ACM ICPC world finalist. Helps students excel in competitive programming and technical interviews.',
        rating: 5.0,
        students_count: 120,
        is_connected: false,
      },
      {
        id: '4',
        user_id: 'mentor-4',
        name: 'Prof. Michael Kim',
        specialization: ['Java', 'Spring Boot', 'Backend Development'],
        bio: 'Software architect with 15+ years experience. Specializes in enterprise applications and system design.',
        rating: 4.7,
        students_count: 180,
        is_connected: false,
      },
      {
        id: '5',
        user_id: 'mentor-5',
        name: 'Lisa Anderson',
        specialization: ['UI/UX Design', 'Figma', 'Design Systems'],
        bio: 'Lead designer at a top tech company. Expert in user experience design and creating beautiful, functional interfaces.',
        rating: 4.9,
        students_count: 95,
        is_connected: false,
      },
      {
        id: '6',
        user_id: 'mentor-6',
        name: 'Robert Taylor',
        specialization: ['DevOps', 'AWS', 'Docker', 'Kubernetes'],
        bio: 'DevOps engineer helping students learn cloud infrastructure, CI/CD, and modern deployment practices.',
        rating: 4.8,
        students_count: 140,
        is_connected: false,
      },
      {
        id: '7',
        user_id: 'mentor-7',
        name: 'Jennifer Park',
        specialization: ['Node.js', 'Express', 'MongoDB'],
        bio: 'Full-stack developer specializing in Node.js ecosystem. Love building scalable backend systems.',
        rating: 4.6,
        students_count: 165,
        is_connected: false,
      },
      {
        id: '8',
        user_id: 'mentor-8',
        name: 'Dr. James Wilson',
        specialization: ['Computer Science', 'Data Structures', 'System Design'],
        bio: 'Computer science professor with expertise in algorithms, data structures, and distributed systems.',
        rating: 4.9,
        students_count: 220,
        is_connected: false,
      },
      {
        id: '9',
        user_id: 'mentor-9',
        name: 'Sophia Brown',
        specialization: ['Vue.js', 'Nuxt.js', 'Frontend Architecture'],
        bio: 'Frontend architect specializing in Vue.js. Helps students build modern, performant web applications.',
        rating: 4.7,
        students_count: 110,
        is_connected: false,
      },
      {
        id: '10',
        user_id: 'mentor-10',
        name: 'Daniel Lee',
        specialization: ['Mobile Development', 'React Native', 'Flutter'],
        bio: 'Mobile app developer with experience in both React Native and Flutter. Build cross-platform apps efficiently.',
        rating: 4.8,
        students_count: 130,
        is_connected: false,
      },
      {
        id: '11',
        user_id: 'mentor-11',
        name: 'Amanda Foster',
        specialization: ['Cybersecurity', 'Ethical Hacking', 'Network Security'],
        bio: 'Cybersecurity expert with 12+ years in the field. Helps students understand security fundamentals and ethical hacking.',
        rating: 4.9,
        students_count: 95,
        is_connected: false,
      },
      {
        id: '12',
        user_id: 'mentor-12',
        name: 'Kevin Zhang',
        specialization: ['Game Development', 'Unity', 'C#'],
        bio: 'Indie game developer with multiple published titles. Passionate about teaching game development and design.',
        rating: 4.7,
        students_count: 88,
        is_connected: false,
      },
      {
        id: '13',
        user_id: 'mentor-13',
        name: 'Rachel Green',
        specialization: ['Blockchain', 'Solidity', 'Web3'],
        bio: 'Blockchain developer and smart contract auditor. Expert in DeFi, NFTs, and decentralized applications.',
        rating: 4.8,
        students_count: 105,
        is_connected: false,
      },
      {
        id: '14',
        user_id: 'mentor-14',
        name: 'Marcus Johnson',
        specialization: ['iOS Development', 'Swift', 'SwiftUI'],
        bio: 'Senior iOS developer at Apple. Specializes in native iOS development and modern Swift practices.',
        rating: 4.9,
        students_count: 142,
        is_connected: false,
      },
      {
        id: '15',
        user_id: 'mentor-15',
        name: 'Priya Patel',
        specialization: ['Android Development', 'Kotlin', 'Jetpack Compose'],
        bio: 'Android engineer with expertise in Kotlin and modern Android development. Build beautiful, performant apps.',
        rating: 4.8,
        students_count: 158,
        is_connected: false,
      },
      {
        id: '16',
        user_id: 'mentor-16',
        name: 'Thomas Anderson',
        specialization: ['Database Design', 'PostgreSQL', 'MongoDB'],
        bio: 'Database architect with deep knowledge of both SQL and NoSQL databases. Expert in optimization and scaling.',
        rating: 4.7,
        students_count: 125,
        is_connected: false,
      },
      {
        id: '17',
        user_id: 'mentor-17',
        name: 'Olivia White',
        specialization: ['AWS', 'Cloud Architecture', 'Serverless'],
        bio: 'Cloud solutions architect. Helps students master AWS services and build scalable cloud applications.',
        rating: 4.9,
        students_count: 175,
        is_connected: false,
      },
      {
        id: '18',
        user_id: 'mentor-18',
        name: 'Carlos Rodriguez',
        specialization: ['Docker', 'Kubernetes', 'CI/CD'],
        bio: 'DevOps engineer specializing in containerization and automation. Streamline your deployment pipeline.',
        rating: 4.8,
        students_count: 148,
        is_connected: false,
      },
      {
        id: '19',
        user_id: 'mentor-19',
        name: 'Yuki Tanaka',
        specialization: ['Next.js', 'Server Components', 'Full Stack'],
        bio: 'Full-stack developer expert in Next.js and modern React patterns. Build production-ready applications.',
        rating: 4.7,
        students_count: 132,
        is_connected: false,
      },
      {
        id: '20',
        user_id: 'mentor-20',
        name: 'Dr. Priya Sharma',
        specialization: ['Deep Learning', 'Neural Networks', 'TensorFlow'],
        bio: 'AI researcher with PhD in Machine Learning. Expert in deep learning and neural network architectures.',
        rating: 5.0,
        students_count: 98,
        is_connected: false,
      },
    ];
    localStorage.setItem('mentors', JSON.stringify(defaultMentors));
    return defaultMentors;
  }
  return JSON.parse(stored);
}

function connectLocalMentor(mentorId: string): boolean {
  const mentors = getLocalMentors();
  const mentor = mentors.find((m: Mentor) => m.id === mentorId);
  if (mentor) {
    mentor.is_connected = true;
    mentor.students_count++;
    localStorage.setItem('mentors', JSON.stringify(mentors));
    return true;
  }
  return false;
}

