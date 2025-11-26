import { supabase } from '@/lib/supabase';
import { generateRoadmap, generateDetailedRoadmap, type RoadmapQuestionnaire, type DetailedRoadmap } from '@/lib/gemini';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedHours: number;
  completed: boolean;
}

export interface Roadmap {
  id: string;
  user_id: string;
  goal: string;
  milestones: Milestone[];
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new roadmap using Gemini AI
 */
export async function createRoadmap(userId: string, goal: string) {
  try {
    // Verify user is authenticated and get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('User not authenticated. Please log in again.');
    }

    // Ensure userId matches authenticated user
    const authenticatedUserId = session.user.id;
    if (userId !== authenticatedUserId) {
      console.warn('UserId mismatch, using authenticated user ID');
      userId = authenticatedUserId;
    }

    // Generate roadmap using Gemini
    const milestones = await generateRoadmap(goal);

    // Save to database - use authenticated user ID
    const { data, error } = await supabase
      .from('roadmaps')
      .insert({
        user_id: authenticatedUserId,
        goal,
        milestones,
        progress_percentage: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error details:', error);
      // Check if it's an RLS policy error
      if (error.code === '42501') {
        throw new Error('Permission denied. Please make sure you are logged in and the database policies are set up correctly.');
      }
      throw error;
    }
    return { roadmap: data, error: null };
  } catch (error: any) {
    console.error('Error creating roadmap:', error);
    return { roadmap: null, error: error.message };
  }
}

/**
 * Create a detailed roadmap using questionnaire answers
 */
export async function createDetailedRoadmap(userId: string, questionnaire: RoadmapQuestionnaire) {
  try {
    // Verify user is authenticated and get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('User not authenticated. Please log in again.');
    }

    // Ensure userId matches authenticated user
    const authenticatedUserId = session.user.id;
    if (userId !== authenticatedUserId) {
      console.warn('UserId mismatch, using authenticated user ID');
      userId = authenticatedUserId;
    }

    // Generate detailed roadmap using Gemini
    const detailedRoadmap = await generateDetailedRoadmap(questionnaire);

    // Convert detailed roadmap to milestones format for database compatibility
    const milestones = detailedRoadmap.stages.map((stage) => ({
      id: stage.id,
      title: stage.title,
      description: `${stage.description}\n\nTopics: ${stage.topics.join(', ')}\nExercises: ${stage.exercises.join(', ')}${stage.projects ? `\nProjects: ${stage.projects.join(', ')}` : ''}`,
      difficulty: stage.difficulty,
      estimatedHours: stage.estimatedHours,
      completed: stage.completed,
    }));

    // Save to database - use authenticated user ID
    const { data, error } = await supabase
      .from('roadmaps')
      .insert({
        user_id: authenticatedUserId,
        goal: questionnaire.topic,
        milestones,
        progress_percentage: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error details:', error);
      // Check if it's an RLS policy error
      if (error.code === '42501') {
        throw new Error('Permission denied. Please make sure you are logged in and the database policies are set up correctly.');
      }
      throw error;
    }
    return { roadmap: data, detailedRoadmap, error: null };
  } catch (error: any) {
    console.error('Error creating detailed roadmap:', error);
    return { roadmap: null, detailedRoadmap: null, error: error.message };
  }
}

/**
 * Get user's roadmaps
 */
export async function getUserRoadmaps(userId: string) {
  try {
    const { data, error } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { roadmaps: data, error: null };
  } catch (error: any) {
    console.error('Error fetching roadmaps:', error);
    return { roadmaps: null, error: error.message };
  }
}

/**
 * Update roadmap milestone completion
 */
export async function updateMilestone(
  roadmapId: string,
  milestoneId: string,
  completed: boolean
) {
  try {
    // Get current roadmap
    const { data: roadmap, error: fetchError } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('id', roadmapId)
      .single();

    if (fetchError) throw fetchError;

    // Update milestone
    const milestones = roadmap.milestones.map((m: Milestone) =>
      m.id === milestoneId ? { ...m, completed } : m
    );

    // Calculate progress
    const completedCount = milestones.filter((m: Milestone) => m.completed).length;
    const progressPercentage = (completedCount / milestones.length) * 100;

    // Update roadmap
    const { data, error } = await supabase
      .from('roadmaps')
      .update({
        milestones,
        progress_percentage: progressPercentage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roadmapId)
      .select()
      .single();

    if (error) throw error;
    return { roadmap: data, error: null };
  } catch (error: any) {
    console.error('Error updating milestone:', error);
    return { roadmap: null, error: error.message };
  }
}

/**
 * Delete a roadmap
 */
export async function deleteRoadmap(roadmapId: string) {
  try {
    const { error } = await supabase
      .from('roadmaps')
      .delete()
      .eq('id', roadmapId);

    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error('Error deleting roadmap:', error);
    return { error: error.message };
  }
}

