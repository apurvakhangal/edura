import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/auth';
import {
  generateCourseOutline,
  type CourseGenerationInput,
  type GeneratedCourseOutline,
  type GeneratedCourseModule,
} from '@/lib/gemini';

export interface Course {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  primary_language: string;
  translated_languages: Record<string, any>;
  level: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  duration_days: number;
  cover_image_url?: string;
  meta: Record<string, any>;
  published: boolean;
  is_ai_generated: boolean;
  category?: string;
  total_modules: number;
  estimated_hours?: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  course_id: string;
  module_number: number;
  title: string;
  summary?: string;
  content: Record<string, any>;
  time_required: number;
  flashcards: Array<{ question: string; answer: string }>;
  practice_tasks: Array<{ title: string; description: string; difficulty: string }>;
  quiz: {
    questions: Array<{
      question: string;
      options: string[];
      correct_answer: number;
      explanation: string;
    }>;
  };
  created_at: string;
  updated_at: string;
}

export interface UserCourseProgress {
  id: string;
  course_id: string;
  user_id: string;
  completed_modules: number;
  progress_percentage: number;
  quiz_scores: Record<string, number>;
  last_accessed: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all published courses (public library)
 */
export async function getPublishedCourses(filters?: {
  level?: string;
  category?: string;
  language?: string;
  search?: string;
}) {
  try {
    let query = supabase
      .from('courses')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (filters?.level) {
      query = query.eq('level', filters.level);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.language) {
      query = query.eq('primary_language', filters.language);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      // Check if it's a table doesn't exist error
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        throw new Error('Database tables not found. Please run the migration SQL in Supabase. See COURSE_MIGRATION.md for instructions.');
      }
      throw error;
    }
    return { courses: data as Course[], error: null };
  } catch (error: any) {
    console.error('Error fetching published courses:', error);
    return { courses: null, error: error.message || 'Failed to fetch courses. Make sure database tables are created.' };
  }
}

/**
 * Get user's courses
 */
export async function getUserCourses(userId?: string) {
  try {
    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) {
      throw new Error('User must be logged in');
    }

    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('owner_id', currentUserId)
      .order('created_at', { ascending: false });

    if (error) {
      // Check if it's a table doesn't exist error
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        throw new Error('Database tables not found. Please run the migration SQL in Supabase. See COURSE_MIGRATION.md for instructions.');
      }
      throw error;
    }
    return { courses: data as Course[], error: null };
  } catch (error: any) {
    console.error('Error fetching user courses:', error);
    return { courses: null, error: error.message || 'Failed to fetch courses. Make sure database tables are created.' };
  }
}

/**
 * Get course by ID with modules
 */
export async function getCourseById(courseId: string) {
  try {
    // Get course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;

    // Get modules
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('*')
      .eq('course_id', courseId)
      .order('module_number', { ascending: true });

    if (modulesError) throw modulesError;

    return {
      course: course as Course,
      modules: modules as Module[],
      error: null,
    };
  } catch (error: any) {
    console.error('Error fetching course:', error);
    return { course: null, modules: null, error: error.message };
  }
}

/**
 * Get user's progress for a course
 */
export async function getCourseProgress(courseId: string, userId?: string) {
  try {
    if (!courseId || courseId === 'undefined') {
      return { progress: null, error: 'Course ID is required' };
    }

    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) {
      return { progress: null, error: 'User must be logged in' };
    }

    const { data, error } = await supabase
      .from('user_course_progress')
      .select('*')
      .eq('course_id', courseId)
      .eq('user_id', currentUserId)
      .single();

    if (error) {
      // PGRST116 = not found (this is okay, means no progress yet)
      if (error.code === 'PGRST116') {
        return { progress: null, error: null };
      }
      throw error;
    }

    return {
      progress: data as UserCourseProgress | null,
      error: null,
    };
  } catch (error: any) {
    console.error('Error fetching course progress:', error);
    return { progress: null, error: error.message || 'Failed to fetch progress' };
  }
}

/**
 * Update course progress
 */
export async function updateCourseProgress(
  courseId: string,
  updates: {
    completed_modules?: number;
    progress_percentage?: number;
    quiz_scores?: Record<string, number>;
  }
) {
  try {
    if (!courseId || courseId === 'undefined' || courseId.startsWith('ext-')) {
      return { progress: null, error: 'Cannot update progress for external courses' };
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User must be logged in');
    }

    // Check if progress exists
    const { data: existing } = await supabase
      .from('user_course_progress')
      .select('id')
      .eq('course_id', courseId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('user_course_progress')
        .update({
          ...updates,
          last_accessed: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return { progress: data as UserCourseProgress, error: null };
    } else {
      // Create new
      const { data, error } = await supabase
        .from('user_course_progress')
        .insert({
          course_id: courseId,
          user_id: userId,
          completed_modules: updates.completed_modules || 0,
          progress_percentage: updates.progress_percentage || 0,
          quiz_scores: updates.quiz_scores || {},
          last_accessed: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { progress: data as UserCourseProgress, error: null };
    }
  } catch (error: any) {
    console.error('Error updating course progress:', error);
    return { progress: null, error: error.message };
  }
}

/**
 * Complete a module and update progress
 */
export async function completeModule(courseId: string, moduleNumber: number) {
  try {
    if (!courseId || courseId === 'undefined' || courseId.startsWith('ext-')) {
      // External courses don't save progress to database
      return { progress: null, error: null };
    }

    const { progress } = await getCourseProgress(courseId);
    const { course } = await getCourseById(courseId);

    if (!course) {
      throw new Error('Course not found');
    }

    const currentCompleted = progress?.completed_modules || 0;
    const newCompleted = Math.max(currentCompleted, moduleNumber);
    const progressPercentage = (newCompleted / course.total_modules) * 100;

    // Award XP (50 XP per module)
    const xpEarned = (newCompleted - currentCompleted) * 50;

    // Update user XP
    const userId = await getCurrentUserId();
    if (userId && xpEarned > 0) {
      const { data: user } = await supabase
        .from('users')
        .select('xp')
        .eq('id', userId)
        .single();

      if (user) {
        await supabase
          .from('users')
          .update({ xp: (user.xp || 0) + xpEarned })
          .eq('id', userId);
      }
    }

    return await updateCourseProgress(courseId, {
      completed_modules: newCompleted,
      progress_percentage: progressPercentage,
    });
  } catch (error: any) {
    console.error('Error completing module:', error);
    return { progress: null, error: error.message };
  }
}

/**
 * Submit quiz answer and update scores
 */
export async function submitQuizAnswer(
  courseId: string,
  moduleNumber: number,
  score: number,
  totalQuestions: number
) {
  try {
    const { progress } = await getCourseProgress(courseId);
    const quizScores = progress?.quiz_scores || {};
    quizScores[`module_${moduleNumber}`] = score;

    // Award XP based on score (10 XP per correct answer)
    const xpEarned = Math.round((score / totalQuestions) * totalQuestions * 10);

    const userId = await getCurrentUserId();
    if (userId && xpEarned > 0) {
      const { data: user } = await supabase
        .from('users')
        .select('xp')
        .eq('id', userId)
        .single();

      if (user) {
        await supabase
          .from('users')
          .update({ xp: (user.xp || 0) + xpEarned })
          .eq('id', userId);
      }
    }

    return await updateCourseProgress(courseId, {
      quiz_scores: quizScores,
    });
  } catch (error: any) {
    console.error('Error submitting quiz:', error);
    return { progress: null, error: error.message };
  }
}

export interface ExternalCourse {
  id: string;
  title: string;
  description: string;
  provider: 'Udemy' | 'Coursera';
  url: string;
  rating: number;
  students: string | number;
  image?: string;
  instructor: string;
  category?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  is_tech?: boolean;
}

/**
 * Get external courses from Udemy and Coursera
 */
export async function getExternalCourses(source?: 'udemy' | 'coursera') {
  try {
    // Use relative URL in development (proxied by Vite) or absolute URL in production
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    const url = source 
      ? `${apiUrl}/courses/external?source=${source}`
      : `${apiUrl}/courses/external`;
    
    console.log('Fetching external courses from:', url);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Received courses:', data);
    return { courses: data.courses as ExternalCourse[], error: null };
  } catch (error: any) {
    console.error('Error fetching external courses:', error);
    // Return empty array instead of null to prevent UI errors
    return { 
      courses: [], 
      error: error.message || 'Failed to fetch external courses. Make sure the backend server is running on port 3001.' 
    };
  }
}

function normalizeModuleContent(module: GeneratedCourseModule, moduleNumber: number) {
  const lessonNarrative = module.lessonNarrative?.trim();
  const textBlock = lessonNarrative
    ? [
        {
          type: 'text',
          content: lessonNarrative,
        },
      ]
    : undefined;

  return {
    module_number: moduleNumber,
    title: module.title || `Module ${moduleNumber}`,
    summary: module.summary || 'Module overview',
    content: {
      lessonNarrative,
      lessonHighlights: module.lessonHighlights,
      keyConcepts: module.keyConcepts,
      topics: module.topics,
      activities: module.activities,
      project: module.project,
      resources: module.resources,
      ideSetup: module.ideSetup,
      concepts: module.keyConcepts,
      content_blocks: textBlock,
    },
    time_required: Math.max(1, Math.round(module.estimatedHours || 4)),
    flashcards: module.flashcards || [],
    practice_tasks: module.practiceTasks || [],
    quiz: { questions: module.quizQuestions || [] },
  };
}

export interface GenerateCourseResponse {
  course: Course | null;
  modules: Module[] | null;
  outline?: GeneratedCourseOutline;
  error: string | null;
}

export async function generateAICourse(input: CourseGenerationInput): Promise<GenerateCourseResponse> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('You must be logged in to generate a course.');
    }

    const outline = await generateCourseOutline(input);
    const totalModules = outline.modules.length;
    const estimatedHours = outline.estimatedHours || outline.modules.reduce((sum, module) => sum + (module.estimatedHours || 4), 0);

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        owner_id: userId,
        title: outline.title,
        description: outline.description,
        primary_language: outline.language || 'en',
        level: outline.level,
        tags: outline.tags || [],
        duration_days: input.durationWeeks * 7,
        category: outline.category || input.category,
        estimated_hours: estimatedHours,
        total_modules: totalModules,
        is_ai_generated: true,
        published: false,
        meta: {
          goal: input.goal,
          audience: input.audience,
          focusArea: input.focusArea,
          preferredLanguage: input.preferredLanguage,
          learningObjectives: outline.learningObjectives,
          generator: 'gemini-course-v1',
          includeIDE: Boolean(input.includeIDE),
        },
      })
      .select()
      .single();

    if (courseError) {
      throw courseError;
    }

    const modulesPayload = outline.modules.map((module, index) => ({
      ...normalizeModuleContent(module, index + 1),
      course_id: course.id,
    }));

    const { data: insertedModules, error: modulesError } = await supabase
      .from('modules')
      .insert(modulesPayload)
      .select();

    if (modulesError) {
      throw modulesError;
    }

    return {
      course: course as Course,
      modules: insertedModules as Module[],
      outline,
      error: null,
    };
  } catch (error: any) {
    console.error('Error generating AI course:', error);
    return { course: null, modules: null, outline: undefined, error: error.message || 'Failed to generate AI course.' };
  }
}

