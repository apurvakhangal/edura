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

export interface CourseGeneratorInput {
  topic: string;
  outcome: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredFormat: 'project' | 'balanced' | 'theory';
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'read-write';
  timePerWeek: number;
  durationWeeks: number;
  supportNeeds: string;
  codingFocus: boolean;
}

export interface CoursePlanResource {
  type: string;
  title: string;
  url?: string;
  description: string;
}

export interface CoursePlanModule {
  id: string;
  title: string;
  description: string;
  focus: string;
  durationWeeks: number;
  learningObjectives: string[];
  practiceIdeas: string[];
  resources: CoursePlanResource[];
  includeMiniProject: boolean;
  hasCodingLab: boolean;
  sampleCode?: string;
}

export interface CoursePlanVideoRecommendation {
  title: string;
  url: string;
  channel: string;
  duration: string;
  reason: string;
  videoId?: string;
}

export interface GeneratedCoursePlan {
  title: string;
  summary: string;
  audience: string;
  deliveryStyle: string;
  weeklyCommitment: string;
  totalDuration: string;
  codingFocus: boolean;
  modules: CoursePlanModule[];
  capstone: {
    title: string;
    brief: string;
    deliverables: string[];
    evaluation: string;
  };
  tools: string[];
  studyTips: string[];
  videoRecommendations: CoursePlanVideoRecommendation[];
  sampleIdeSnippet: {
    language: string;
    starter: string;
    instructions: string;
  };
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

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === 'yes' || normalized === '1';
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  return fallback;
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

export async function generateCoursePlan(input: CourseGeneratorInput): Promise<GeneratedCoursePlan> {
  try {
    const prompt = `You are Edura's curriculum designer. Build a complete, week-by-week course outline.
Learner profile:
- Topic: ${input.topic}
- Desired outcome: ${input.outcome}
- Experience level: ${input.experienceLevel}
- Preferred format: ${input.preferredFormat}
- Learning style: ${input.learningStyle}
- Weekly commitment: ${input.timePerWeek} hours
- Total duration: ${input.durationWeeks} weeks
- Extra support: ${input.supportNeeds}
- Coding focus required: ${input.codingFocus ? 'yes' : 'no'}

Return ONLY JSON shaped as:
{
  "title": "",
  "summary": "",
  "audience": "",
  "deliveryStyle": "",
  "weeklyCommitment": "",
  "totalDuration": "",
  "codingFocus": true,
  "modules": [
    {
      "id": "1",
      "title": "",
      "description": "",
      "focus": "",
      "durationWeeks": 1,
      "learningObjectives": [""],
      "practiceIdeas": [""],
      "resources": [
        { "type": "article|video|tool", "title": "", "url": "https://...", "description": "" }
      ],
      "includeMiniProject": true,
      "hasCodingLab": true,
      "sampleCode": "// optional"
    }
  ],
  "capstone": {
    "title": "",
    "brief": "",
    "deliverables": [""],
    "evaluation": ""
  },
  "tools": [""],
  "studyTips": [""],
  "videoRecommendations": [
    { "title": "", "url": "https://www.youtube.com/watch?v=...", "channel": "", "duration": "", "reason": "", "videoId": "" }
  ],
  "sampleIdeSnippet": {
    "language": "javascript|python|...",
    "starter": "// short starter code",
    "instructions": ""
  }
}`;

    const text = await generateText(prompt);
    const plan = parseJsonResponse<GeneratedCoursePlan>(text);

    plan.modules = (plan.modules || []).map((module, index) => ({
      ...module,
      id: module.id ?? String(index + 1),
      durationWeeks: toNumber(module.durationWeeks ?? (module as any).duration_weeks ?? 1, 1),
      learningObjectives: Array.isArray(module.learningObjectives) ? module.learningObjectives : [],
      practiceIdeas: Array.isArray(module.practiceIdeas) ? module.practiceIdeas : [],
      resources: Array.isArray(module.resources)
        ? module.resources.map((resource) => ({
            type: resource.type || 'resource',
            title: resource.title || 'Suggested resource',
            url: resource.url,
            description: resource.description || '',
          }))
        : [],
      includeMiniProject: toBoolean((module as any).includeMiniProject ?? (module as any).include_mini_project, false),
      hasCodingLab: toBoolean((module as any).hasCodingLab ?? (module as any).has_coding_lab, false),
      sampleCode: module.sampleCode,
    }));

    if (!plan.videoRecommendations || !Array.isArray(plan.videoRecommendations) || plan.videoRecommendations.length === 0) {
      plan.videoRecommendations = [
        {
          title: `${input.topic} crash course`,
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${input.topic} tutorial`)}`,
          channel: 'YouTube Search',
          duration: '~15 min',
          reason: 'Fallback suggestion when AI video could not be generated',
        },
      ];
    }

    plan.codingFocus = toBoolean(plan.codingFocus, input.codingFocus);

    if (!plan.sampleIdeSnippet) {
      plan.sampleIdeSnippet = {
        language: input.codingFocus ? 'javascript' : 'markdown',
        starter: input.codingFocus
          ? `function practice${input.topic.replace(/\s+/g, '')}() {\n  console.log('Start experimenting with ${input.topic}');\n}`
          : `### ${input.topic}\nWrite your reflections here...`,
        instructions: input.codingFocus
          ? 'Use this function as a sandbox to test the concept you just learned.'
          : 'Capture key takeaways or action items for this lesson.',
      };
    }

    plan.studyTips = Array.isArray(plan.studyTips) ? plan.studyTips : [];
    plan.tools = Array.isArray(plan.tools) ? plan.tools : [];

    return plan;
  } catch (error) {
    console.error('Error generating course plan:', error);
    throw new Error('Failed to generate course plan. Please try again.');
  }
}

