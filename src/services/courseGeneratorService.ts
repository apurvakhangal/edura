import { getCurrentUserId } from '@/lib/auth';
import {
  generateCoursePlan,
  type CourseGeneratorInput,
  type GeneratedCoursePlan,
} from '@/lib/gemini';

export type CourseGeneratorQuestionnaire = CourseGeneratorInput & {
  motivation?: string;
};

export interface GeneratedCourseResponse {
  plan: GeneratedCoursePlan | null;
  error: string | null;
}

export async function generatePersonalizedCourse(
  questionnaire: CourseGeneratorQuestionnaire
): Promise<GeneratedCourseResponse> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('You must be logged in to generate a course plan.');
    }

    const plan = await generateCoursePlan(questionnaire);
    return { plan, error: null };
  } catch (error: any) {
    console.error('Error generating personalized course:', error);
    return {
      plan: null,
      error: error.message || 'Failed to generate course. Please try again.',
    };
  }
}

export type { GeneratedCoursePlan } from '@/lib/gemini';
