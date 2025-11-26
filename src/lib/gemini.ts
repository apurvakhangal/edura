import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const modelName = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

if (!apiKey) {
  console.warn('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your .env file');
}

const ai = new GoogleGenAI({
  apiKey: apiKey,
});

export type GeminiMessage = { role: 'user' | 'assistant'; content: string };
export type RoadmapDifficulty = 'easy' | 'medium' | 'hard';

export interface RoadmapQuestionnaire {
  topic: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  durationUnit: 'days' | 'weeks' | 'months';
  hoursPerDay?: number;
  hoursPerWeek?: number;
}

export interface RoadmapMilestone {
  id: string;
  title: string;
  description: string;
  difficulty: RoadmapDifficulty;
  estimatedHours: number;
  completed: boolean;
}

export interface RoadmapResourceItem {
  type: string;
  title: string;
  url: string;
  description: string;
}

export interface DetailedRoadmapStage {
  id: string;
  stage: string;
  title: string;
  description: string;
  topics: string[];
  exercises: string[];
  projects?: string[];
  resources: RoadmapResourceItem[];
  difficulty: RoadmapDifficulty;
  estimatedHours: number;
  completed: boolean;
}

export interface DetailedRoadmap {
  title: string;
  userSummary: {
    skill: string;
    level: string;
    timeline: string;
    commitment: string;
  };
  stages: DetailedRoadmapStage[];
  finalProject: {
    title: string;
    description: string;
    requirements: string[];
    complexity: RoadmapDifficulty;
  };
  resourceList: Array<{
    category: string;
    items: Array<{ title: string; url: string; description: string }>;
  }>;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface CourseGenerationInput {
  topic: string;
  goal: string;
  audience: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  durationWeeks: number;
  preferredLanguage: string;
  focusArea: string;
  includeProjects: boolean;
  includeIDE?: boolean;
  category?: string;
}

export interface GeneratedCourseModule {
  id?: string;
  title: string;
  summary: string;
  lessonHighlights: string[];
  lessonNarrative?: string;
  keyConcepts: string[];
  topics: string[];
  activities: string[];
  project?: string;
  resources: Array<{ title: string; type: string; url?: string; description?: string }>;
  ideSetup?: {
    tool: string;
    instructions: string;
  } | null;
  flashcards: Flashcard[];
  practiceTasks: Array<{ title: string; description: string; difficulty: RoadmapDifficulty }>;
  quizQuestions: QuizQuestion[];
  estimatedHours: number;
}

export interface GeneratedCourseOutline {
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  category?: string;
  tags: string[];
  estimatedHours: number;
  learningObjectives: string[];
  resources?: Array<{ category: string; items: string[] }>;
  modules: GeneratedCourseModule[];
}

function ensureApiReady() {
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
  }
}

async function generateText(prompt: string): Promise<string> {
  ensureApiReady();

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
  });

  const raw = (() => {
    const candidate: any = response;
    if (typeof candidate.text === 'function') return candidate.text();
    if (typeof candidate.text === 'string') return candidate.text;
    if (typeof candidate.response?.text === 'function') return candidate.response.text();
    if (typeof candidate.response?.text === 'string') return candidate.response.text;
    return '';
  })();

  return (raw || '').trim();
}

function parseJsonResponse<T>(text: string): T {
  if (!text) {
    throw new Error('Empty response from Gemini.');
  }

  const cleaned = text.replace(/```json/gi, '```').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!match) {
      throw new Error('Failed to parse JSON from Gemini response.');
    }
    return JSON.parse(match[0]);
  }
}

function normalizeDifficulty(value?: string): RoadmapDifficulty {
  const normalized = value?.toLowerCase() as RoadmapDifficulty | undefined;
  return normalized === 'easy' || normalized === 'medium' || normalized === 'hard' ? normalized : 'medium';
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function chatWithGemini(messages: GeminiMessage[]): Promise<string> {
  try {
    const conversationContext = messages
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    const prompt = `You are Edura's friendly AI study mentor. Provide concise, encouraging, and structured answers.

Conversation so far:
${conversationContext}

Assistant:`;

    const reply = await generateText(prompt);
    return reply || 'I could not generate a response right now. Please try again.';
  } catch (error) {
    console.error('Error chatting with Gemini:', error);
    throw new Error('Failed to get AI response. Please try again.');
  }
}

export async function generateRoadmap(goal: string): Promise<RoadmapMilestone[]> {
  try {
    const prompt = `Create a concise learning roadmap for the goal "${goal}".
Return a JSON array with 4-6 milestones, each having:
{
  "id": "1",
  "title": "Milestone title",
  "description": "What this milestone covers",
  "difficulty": "easy|medium|hard",
  "estimatedHours": 6,
  "completed": false
}
Only return the JSON array.`;

    const text = await generateText(prompt);
    const milestones = parseJsonResponse<any[]>(text);

    if (!Array.isArray(milestones) || milestones.length === 0) {
      throw new Error('Gemini returned an empty roadmap.');
    }

    return milestones.map((milestone, index) => ({
      id: String(milestone.id ?? index + 1),
      title: milestone.title?.trim() || `Milestone ${index + 1}`,
      description: milestone.description?.trim() || 'Focus on tangible progress for this step.',
      difficulty: normalizeDifficulty(milestone.difficulty),
      estimatedHours: toNumber(milestone.estimatedHours ?? milestone.estimated_hours, 6),
      completed: false,
    }));
  } catch (error) {
    console.error('Error generating roadmap:', error);
    throw new Error('Failed to generate roadmap. Please try again.');
  }
}

export async function generateDetailedRoadmap(answers: RoadmapQuestionnaire): Promise<DetailedRoadmap> {
  try {
    const commitmentText = answers.hoursPerDay
      ? `${answers.hoursPerDay} hours per day`
      : answers.hoursPerWeek
      ? `${answers.hoursPerWeek} hours per week`
      : 'flexible schedule';

    const totalHours = answers.durationUnit === 'days'
      ? answers.duration * (answers.hoursPerDay || 2)
      : answers.durationUnit === 'weeks'
      ? answers.duration * (answers.hoursPerWeek || 10)
      : answers.duration * 4 * (answers.hoursPerWeek || 10);

    const stageType = answers.durationUnit === 'days' ? 'Day' : 'Week';
    const numStages = answers.durationUnit === 'days'
      ? answers.duration
      : answers.durationUnit === 'weeks'
      ? answers.duration
      : answers.duration * 4;

    const prompt = `You are an expert learning path designer. Create a detailed, personalized roadmap based on:
- Topic: ${answers.topic}
- Skill level: ${answers.skillLevel}
- Timeline: ${answers.duration} ${answers.durationUnit}
- Time commitment: ${commitmentText}
- Total hours: ${totalHours}

Requirements:
1. Break the plan into exactly ${numStages} ${stageType.toLowerCase()}s.
2. Each stage must include title, description, topics, exercises, projects, resources (type, title, url, description), difficulty, estimatedHours, completed flag.
3. Progress difficulty gradually and keep workload within the time commitment.
4. Include a final project and categorized resource list.
5. Return ONLY valid JSON matching this structure:
{
  "title": "Learning Roadmap: ...",
  "userSummary": { "skill": "", "level": "", "timeline": "", "commitment": "" },
  "stages": [ { ... } ],
  "finalProject": { "title": "", "description": "", "requirements": [], "complexity": "easy|medium|hard" },
  "resourceList": [ { "category": "", "items": [ { "title": "", "url": "", "description": "" } ] } ]
}`;

    const text = await generateText(prompt);
    const roadmap = parseJsonResponse<DetailedRoadmap>(text);

    roadmap.stages = (roadmap.stages || []).map((stage, index) => ({
      ...stage,
      id: stage.id ?? String(index + 1),
      completed: false,
      topics: stage.topics ?? [],
      exercises: stage.exercises ?? [],
      projects: stage.projects ?? [],
      resources: stage.resources ?? [],
      estimatedHours: toNumber(stage.estimatedHours ?? (stage as any).estimated_hours, 5),
      difficulty: normalizeDifficulty(stage.difficulty),
    }));

    return roadmap;
  } catch (error) {
    console.error('Error generating detailed roadmap:', error);
    throw new Error('Failed to generate detailed roadmap. Please try again.');
  }
}

export async function generateSummary(content: string): Promise<string> {
  try {
    const prompt = `Summarize the following study material into clear sections: Overview, Key Concepts, Action Items, and Practice Ideas. Be concise and keep the user's tone encouraging. Content:\n\n${content}`;
    const summary = await generateText(prompt);
    return summary || 'No summary available.';
  } catch (error) {
    console.error('Error generating summary:', error);
    throw new Error('Failed to generate summary. Please try again.');
  }
}

export async function generateFlashcards(content: string): Promise<Flashcard[]> {
  try {
    const prompt = `Create 8 flashcards from the following content. Return ONLY valid JSON array like [ { "question": "...", "answer": "..." } ]. Questions should be short and answers precise. Content:\n\n${content}`;
    const text = await generateText(prompt);
    const cards = parseJsonResponse<any[]>(text);

    const flashcards = cards
      .map((card) => ({
        question: card.question?.trim() || '',
        answer: card.answer?.trim() || '',
      }))
      .filter((card) => card.question && card.answer);

    if (!flashcards.length) {
      throw new Error('Gemini did not return flashcards.');
    }

    return flashcards;
  } catch (error) {
    console.error('Error generating flashcards:', error);
    throw new Error('Failed to generate flashcards. Please try again.');
  }
}

export async function generateQuiz(content: string): Promise<QuizQuestion[]> {
  try {
    const prompt = `Create a quiz based on the following content. Return ONLY JSON array with 5-8 items.
Each item must match:
{
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": 0,
  "explanation": "..."
}
The correctAnswer is the zero-based index. Content:\n\n${content}`;

    const text = await generateText(prompt);
    const items = parseJsonResponse<any[]>(text);

    const quiz = items
      .map((item) => ({
        question: item.question?.trim() || '',
        options: Array.isArray(item.options) ? item.options.map((option: string) => option?.trim() || '').filter(Boolean) : [],
        correctAnswer: typeof item.correctAnswer === 'number' ? item.correctAnswer : Number(item.correct_answer ?? 0),
        explanation: item.explanation?.trim() || '',
      }))
      .filter((item) => item.question && item.options.length >= 2 && Number.isInteger(item.correctAnswer));

    if (!quiz.length) {
      throw new Error('Gemini did not return quiz questions.');
    }

    return quiz;
  } catch (error) {
    console.error('Error generating quiz:', error);
    throw new Error('Failed to generate quiz. Please try again.');
  }
}

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  try {
    const prompt = `Translate the following text to ${targetLanguage}. Return only the translated sentence without extra commentary.\n\n${text}`;
    const translation = await generateText(prompt);
    return translation;
  } catch (error) {
    console.error('Error translating text:', error);
    throw new Error('Failed to translate text. Please try again.');
  }
}

export async function generateCourseOutline(input: CourseGenerationInput): Promise<GeneratedCourseOutline> {
  try {
    const prompt = `Design a complete course for the topic "${input.topic}".
Return ONLY valid JSON with this shape:
{
  "title": "",
  "description": "",
  "level": "beginner|intermediate|advanced",
  "language": "",
  "category": "",
  "tags": ["tag1", "tag2"],
  "estimatedHours": 40,
  "learningObjectives": ["objective1"],
  "modules": [
    {
      "title": "",
      "summary": "",
      "lessonHighlights": ["explain concept flow"],
      "lessonNarrative": "2-3 paragraphs teaching the concept",
      "keyConcepts": ["concept"],
      "topics": ["topic"],
      "activities": ["activity"],
      "project": "optional project",
      "resources": [{ "title": "", "type": "video|article|doc|tool", "url": "", "description": "" }],
      "ideSetup": { "tool": "", "instructions": "" },
      "flashcards": [{ "question": "", "answer": "" }],
      "practiceTasks": [{ "title": "", "description": "", "difficulty": "easy|medium|hard" }],
      "quizQuestions": [{ "question": "", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "" }],
      "estimatedHours": 4
    }
  ]
}

Constraints:
- Audience: ${input.audience}
- Goal: ${input.goal}
- Skill level: ${input.level}
- Duration: ${input.durationWeeks} weeks
- Preferred language: ${input.preferredLanguage}
- Focus area: ${input.focusArea}
- Include hands-on projects: ${input.includeProjects ? 'yes' : 'no'}
- Teaching requirement: lessonHighlights + lessonNarrative must explain how concepts are taught (mini lesson outline + 2-3 paragraph walkthrough) so learners receive instruction, not just tasks.
- IDE preference: ${input.includeIDE ? 'Learner requested IDE walkthroughs. Provide ideSetup (tool + instructions) for each relevant module.' : 'Learner opted out of IDE walkthroughs. Set ideSetup to null.'}
- Resource requirement: Each module must provide at least one YouTube video (type "video" with youtube URL) and one article/doc reference (type "article" or "doc") with descriptions.
- Assessment requirement: Every module must include at least one quizQuestions entry for a short formative check.
Ensure the course fits the duration and skill level, with progressive modules and practical activities.`;

    const text = await generateText(prompt);
    const outline = parseJsonResponse<GeneratedCourseOutline>(text);

    const modules = (outline.modules || []).map((module, index) => {
      const quiz = (module.quizQuestions || []).filter((q) => q.question && q.options?.length >= 2);
      if (!quiz.length) {
        quiz.push({
          question: `What is the key idea from ${module.title || `Module ${index + 1}`}?`,
          options: ['Concept A', 'Concept B', 'Concept C', 'Concept D'],
          correctAnswer: 0,
          explanation: 'Revisit the main concept taught in this module to reinforce understanding.',
        });
      }

      const lessonHighlights = module.lessonHighlights?.length
        ? module.lessonHighlights
        : [
            'Introduce the concept with a relatable scenario.',
            'Explain the theory step-by-step using plain language.',
            'Demonstrate with a worked example before assigning practice.',
          ];

      const lessonNarrative = module.lessonNarrative?.trim()
        ? module.lessonNarrative.trim()
        : `${module.summary}

Guide the learner through the concept with an approachable explanation, relate it to a real scenario, and walk through a short example before you ask them to build something on their own.`;

      const isCodingTopic = /code|program|dev|script|software|app|python|javascript|java|c\+\+|typescript|data|ml|ai|cloud|backend|frontend|fullstack/i.test(
        `${input.topic} ${input.focusArea} ${input.category}`
      );
      const wantsIde = input.includeIDE ?? isCodingTopic;
      let ideSetup: GeneratedCourseModule['ideSetup'] = null;

      if (wantsIde) {
        const suppliedSetup = module.ideSetup && module.ideSetup.tool && module.ideSetup.instructions ? module.ideSetup : null;
        if (suppliedSetup) {
          ideSetup = suppliedSetup;
        } else if (isCodingTopic) {
          ideSetup = {
            tool: 'VS Code + Online Sandbox',
            instructions:
              'Install recommended language extensions, enable auto-formatting, and open an online IDE (StackBlitz/Codesandbox/Replit) for quick tests.',
          };
        } else {
          ideSetup = {
            tool: 'Preferred study workspace',
            instructions: 'Use a note-taking or simulation tool that matches this module to apply the ideas immediately.',
          };
        }
      }

      return {
        ...module,
        id: module.id ?? String(index + 1),
        summary: module.summary?.trim() || module.description || 'Learning module overview',
        lessonHighlights,
        keyConcepts: module.keyConcepts ?? module.topics ?? [],
        topics: module.topics ?? module.keyConcepts ?? [],
        activities: module.activities ?? [],
        resources: (module.resources || []).map((resource) => ({
          title: resource.title || 'Recommended resource',
          type: resource.type || 'article',
          url: resource.url,
          description: resource.description || '',
        })),
        flashcards: (module.flashcards || []).filter((card) => card.question && card.answer),
        practiceTasks: (module.practiceTasks || []).map((task) => ({
          title: task.title || 'Practice task',
          description: task.description || 'Apply what you learned in this module.',
          difficulty: normalizeDifficulty(task.difficulty),
        })),
        quizQuestions: quiz,
        estimatedHours: toNumber(module.estimatedHours, 4),
        ideSetup,
        lessonNarrative,
      };
    });

    modules.forEach((module) => {
      const hasVideo = module.resources.some((resource) => resource.type?.toLowerCase() === 'video');
      const hasArticle = module.resources.some((resource) => ['article', 'doc', 'documentation'].includes(resource.type?.toLowerCase() || ''));
      if (!hasVideo) {
        module.resources.push({
          title: `${module.title} walkthrough (YouTube)`,
          type: 'video',
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(module.title)}`,
          description: 'Search results for a video lesson aligned with this module.',
        });
      }
      if (!hasArticle) {
        module.resources.push({
          title: `${module.title} reference guide`,
          type: 'article',
          url: `https://www.google.com/search?q=${encodeURIComponent(module.title + ' tutorial')}`,
          description: 'Additional reading material to reinforce the lesson.',
        });
      }
    });

    if (!modules.length) {
      throw new Error('Gemini did not return modules.');
    }

    return {
      title: outline.title?.trim() || `AI Course: ${input.topic}`,
      description: outline.description?.trim() || input.goal,
      level: outline.level ?? input.level,
      language: outline.language ?? input.preferredLanguage,
      category: outline.category ?? input.category ?? 'tech',
      tags: outline.tags?.length ? outline.tags : [input.topic, input.focusArea],
      estimatedHours: toNumber(outline.estimatedHours, modules.reduce((sum, module) => sum + (module.estimatedHours || 4), 0)),
      learningObjectives: outline.learningObjectives ?? [input.goal],
      resources: outline.resources ?? [],
      modules,
    };
  } catch (error) {
    console.error('Error generating course outline:', error);
    throw new Error('Failed to generate course outline. Please try again.');
  }
}

