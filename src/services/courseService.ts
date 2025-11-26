import { supabase } from '@/lib/supabase';
import { generateCourse, type CourseGenerationInput, type GeneratedCourse } from '@/lib/gemini';
import { getCurrentUserId } from '@/lib/auth';

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
 * Generate an AI-powered course
 */
export async function generateAICourse(input: CourseGenerationInput) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User must be logged in');
    }

    // Create AI job record
    const { data: job, error: jobError } = await supabase
      .from('ai_course_jobs')
      .insert({
        user_id: userId,
        status: 'running',
        inputs: input,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) {
      // Check if it's a table doesn't exist error
      if (jobError.code === '42P01' || jobError.message?.includes('does not exist')) {
        throw new Error('Database tables not found. Please run the migration SQL in Supabase. See COURSE_MIGRATION.md for instructions.');
      }
      throw jobError;
    }

    try {
      // Generate course using AI
      const generatedCourse = await generateCourse(input);

      // Save course to database
      const courseData = {
        owner_id: userId,
        title: generatedCourse.course.title,
        description: generatedCourse.course.description,
        primary_language: input.language,
        level: generatedCourse.course.level as 'beginner' | 'intermediate' | 'advanced',
        duration_days: generatedCourse.course.duration_days,
        total_modules: generatedCourse.course.modules.length,
        estimated_hours: Math.ceil(
          generatedCourse.course.modules.reduce((sum, m) => sum + m.time_required, 0) / 60
        ),
        is_ai_generated: true,
        category: input.category || 'General',
        tags: generatedCourse.course.recommended_courses,
        meta: {
          outcomes: generatedCourse.course.outcomes,
          revision_plan: generatedCourse.course.revision_plan,
          final_test: generatedCourse.course.final_test,
          projects: generatedCourse.course.projects,
          progress_curve: generatedCourse.course.progress_curve,
          motivational_tips: generatedCourse.course.motivational_tips,
        },
        published: false,
      };

      const { data: course, error: courseError } = await supabase
        .from('courses')
        .insert(courseData)
        .select()
        .single();

      if (courseError) {
        // Check for specific constraint errors
        if (courseError.code === '23502') {
          if (courseError.message?.includes('user_id')) {
            throw new Error('Database migration incomplete. The courses table still has user_id constraint. Please run migrate-courses-table.sql in Supabase.');
          }
          if (courseError.message?.includes('owner_id')) {
            throw new Error('owner_id is required but was not provided. This should not happen - please report this error.');
          }
        }
        throw courseError;
      }

      // Save modules
      const modules = generatedCourse.course.modules.map((module) => ({
        course_id: course.id,
        module_number: module.module_number,
        title: module.title,
        summary: module.summary,
        content: {
          concepts: module.concepts,
          examples: module.examples,
          content_blocks: module.content_blocks,
        },
        time_required: module.time_required,
        flashcards: module.flashcards,
        practice_tasks: module.practice_tasks,
        quiz: module.checkpoint_quiz,
        ...(module.ide_tasks && { content: { ...module.content_blocks, ide_tasks: module.ide_tasks } }),
      }));

      const { error: modulesError } = await supabase
        .from('modules')
        .insert(modules);

      if (modulesError) throw modulesError;

      // Update job status
      await supabase
        .from('ai_course_jobs')
        .update({
          status: 'done',
          result: { course_id: course.id },
          finished_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      return { course, error: null };
    } catch (error: any) {
      // Update job with error
      await supabase
        .from('ai_course_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          finished_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      throw error;
    }
  } catch (error: any) {
    console.error('Error generating AI course:', error);
    return { course: null, error: error.message };
  }
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

/**
 * Get AI course generation job status
 */
export async function getAICourseJobStatus(jobId: string) {
  try {
    const { data, error } = await supabase
      .from('ai_course_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) throw error;
    return { job: data, error: null };
  } catch (error: any) {
    console.error('Error fetching AI job status:', error);
    return { job: null, error: error.message };
  }
}

/**
 * Get user's AI course generation jobs
 */
export async function getUserAICourseJobs(userId?: string) {
  try {
    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) {
      throw new Error('User must be logged in');
    }

    const { data, error } = await supabase
      .from('ai_course_jobs')
      .select('*')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { jobs: data, error: null };
  } catch (error: any) {
    console.error('Error fetching AI jobs:', error);
    return { jobs: null, error: error.message };
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

