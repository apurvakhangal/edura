import { GoogleGenAI } from '@google/genai';

// Gemini API configuration
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const modelName = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

if (!apiKey) {
  console.warn('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your .env file');
}

// Initialize GoogleGenAI with API key
const ai = new GoogleGenAI({
  apiKey: apiKey,
});

/**
 * Chat with Gemini AI
 */
export async function chatWithGemini(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string> {
  try {
    // Build conversation context from message history
    const conversationContext = messages
      .map((msg) => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');
    
    const prompt = conversationContext + '\n\nAssistant:';

    // Ensure API key is set
    if (!apiKey) {
      throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

    return response.text || '';
  } catch (error) {
    console.error('Error chatting with Gemini:', error);
    throw new Error('Failed to get response from AI. Please try again.');
  }
}

/**
 * Generate a summary from text content
 */
export async function generateSummary(content: string): Promise<string> {
  try {
    const prompt = `Please provide a concise summary of the following content. Focus on key points, main concepts, and important information. Format the response with clear sections using markdown:

${content}`;

    // Ensure API key is set
    if (!apiKey) {
      throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

    return response.text || '';
  } catch (error) {
    console.error('Error generating summary:', error);
    throw new Error('Failed to generate summary. Please try again.');
  }
}

/**
 * Generate flashcards from content
 */
export async function generateFlashcards(content: string): Promise<Array<{ question: string; answer: string }>> {
  try {
    const prompt = `Based on the following content, generate 10 flashcards in JSON format. Each flashcard should have a "question" and "answer" field. Return only valid JSON array:

Content:
${content}

Format:
[
  {"question": "...", "answer": "..."},
  {"question": "...", "answer": "..."}
]`;

    // Ensure API key is set
    if (!apiKey) {
      throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

    const text = response.text || '';
    
    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Failed to parse flashcards');
  } catch (error) {
    console.error('Error generating flashcards:', error);
    throw new Error('Failed to generate flashcards. Please try again.');
  }
}

/**
 * Generate quiz questions from content
 */
export async function generateQuiz(content: string): Promise<Array<{
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}>> {
  try {
    const prompt = `Based on the following content, generate 10 multiple-choice quiz questions in JSON format. Each question should have:
- "question": the question text
- "options": array of 4 answer options
- "correctAnswer": index of correct answer (0-3)
- "explanation": brief explanation

Return only valid JSON array:

Content:
${content}

Format:
[
  {
    "question": "...",
    "options": ["...", "...", "...", "..."],
    "correctAnswer": 0,
    "explanation": "..."
  }
]`;

    // Ensure API key is set
    if (!apiKey) {
      throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

    const text = response.text || '';
    
    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Failed to parse quiz');
  } catch (error) {
    console.error('Error generating quiz:', error);
    throw new Error('Failed to generate quiz. Please try again.');
  }
}

/**
 * Generate a learning roadmap based on a goal
 */
export async function generateRoadmap(goal: string): Promise<Array<{
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedHours: number;
  completed: boolean;
}>> {
  try {
    const prompt = `Create a structured learning roadmap for the following goal. Break it down into 5-8 milestones with:
- Clear, actionable titles
- Detailed descriptions
- Difficulty level (easy, medium, or hard)
- Estimated hours to complete

Goal: ${goal}

Return a JSON array with this structure:
[
  {
    "id": "1",
    "title": "...",
    "description": "...",
    "difficulty": "easy|medium|hard",
    "estimatedHours": 10,
    "completed": false
  }
]`;

    // Ensure API key is set
    if (!apiKey) {
      throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

    const text = response.text || '';
    
    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Failed to parse roadmap');
  } catch (error) {
    console.error('Error generating roadmap:', error);
    throw new Error('Failed to generate roadmap. Please try again.');
  }
}

/**
 * Generate a detailed learning roadmap based on questionnaire answers
 */
export interface RoadmapQuestionnaire {
  topic: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  durationUnit: 'days' | 'weeks' | 'months';
  hoursPerDay?: number;
  hoursPerWeek?: number;
}

export interface DetailedRoadmap {
  title: string;
  userSummary: {
    skill: string;
    level: string;
    timeline: string;
    commitment: string;
  };
  stages: Array<{
    id: string;
    stage: string; // Week 1, Day 1, etc.
    title: string;
    description: string;
    topics: string[];
    exercises: string[];
    projects?: string[];
    resources: Array<{
      type: 'video' | 'documentation' | 'practice' | 'article';
      title: string;
      url?: string;
      description?: string;
    }>;
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedHours: number;
    completed: boolean;
  }>;
  finalProject: {
    title: string;
    description: string;
    requirements: string[];
    complexity: 'easy' | 'medium' | 'hard';
  };
  resourceList: Array<{
    category: string;
    items: Array<{
      title: string;
      url?: string;
      description: string;
    }>;
  }>;
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
      : answers.duration * 4 * (answers.hoursPerWeek || 10); // months to weeks

    const stageType = answers.durationUnit === 'days' ? 'Day' : 'Week';
    const numStages = answers.durationUnit === 'days' 
      ? answers.duration 
      : answers.durationUnit === 'weeks'
      ? answers.duration
      : answers.duration * 4; // months to weeks

    const prompt = `You are an expert learning path designer. Create a detailed, personalized learning roadmap based on the following information:

**Topic/Skill:** ${answers.topic}
**Current Skill Level:** ${answers.skillLevel}
**Timeline:** ${answers.duration} ${answers.durationUnit}
**Time Commitment:** ${commitmentText}
**Total Estimated Hours:** ${totalHours} hours

**Requirements:**
1. Break the roadmap into ${numStages} ${stageType.toLowerCase()}s (${stageType} 1, ${stageType} 2, etc.)
2. Each stage should include:
   - Clear title and description
   - Specific topics to learn
   - Practical exercises
   - ${answers.skillLevel === 'beginner' ? 'Simple projects' : answers.skillLevel === 'intermediate' ? 'Real-world projects' : 'Advanced projects and optimization'}
   - Recommended resources (videos, documentation, practice sites)
   - Difficulty progression (easy → medium → hard)
   - Estimated hours that fit within the time commitment

3. Adapt content based on skill level:
   - ${answers.skillLevel === 'beginner' ? 'Include fundamentals, basics, and simple projects. Start from the very beginning.' : answers.skillLevel === 'intermediate' ? 'Skip basics, focus on real-world skills, practical applications, and intermediate concepts.' : 'Focus on advanced frameworks, optimization techniques, best practices, and include a capstone project.'}

4. Adapt timeline:
   - ${answers.durationUnit === 'days' || totalHours < 50 ? 'Compress content but keep it achievable. Focus on essentials.' : 'Expand with deeper learning, more practice, and comprehensive coverage.'}

5. Include a final project/portfolio suggestion that demonstrates mastery

6. Provide a comprehensive resource list organized by category

Return a JSON object with this exact structure:
{
  "title": "Learning Roadmap: [Topic]",
  "userSummary": {
    "skill": "${answers.topic}",
    "level": "${answers.skillLevel}",
    "timeline": "${answers.duration} ${answers.durationUnit}",
    "commitment": "${commitmentText}"
  },
  "stages": [
    {
      "id": "1",
      "stage": "${stageType} 1",
      "title": "...",
      "description": "...",
      "topics": ["topic1", "topic2"],
      "exercises": ["exercise1", "exercise2"],
      "projects": ["project1"],
      "resources": [
        {
          "type": "video|documentation|practice|article",
          "title": "...",
          "url": "...",
          "description": "..."
        }
      ],
      "difficulty": "easy|medium|hard",
      "estimatedHours": 5,
      "completed": false
    }
  ],
  "finalProject": {
    "title": "...",
    "description": "...",
    "requirements": ["req1", "req2"],
    "complexity": "easy|medium|hard"
  },
  "resourceList": [
    {
      "category": "Videos",
      "items": [
        {
          "title": "...",
          "url": "...",
          "description": "..."
        }
      ]
    }
  ]
}

Make sure:
- The roadmap fits exactly within ${answers.duration} ${answers.durationUnit}
- Each stage's estimated hours align with the time commitment
- Difficulty progresses naturally from easy to hard
- Resources are relevant and helpful
- The final project is appropriate for the skill level
- Return ONLY valid JSON, no markdown, no code blocks`;

    // Ensure API key is set
    if (!apiKey) {
      throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

    const text = response.text || '';
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to find JSON object
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const roadmap = JSON.parse(jsonMatch[0]);
      
      // Ensure all stages have completed: false
      if (roadmap.stages) {
        roadmap.stages = roadmap.stages.map((stage: any) => ({
          ...stage,
          completed: false,
        }));
      }
      
      return roadmap;
    }
    
    throw new Error('Failed to parse detailed roadmap');
  } catch (error) {
    console.error('Error generating detailed roadmap:', error);
    throw new Error('Failed to generate detailed roadmap. Please try again.');
  }
}

/**
 * Translate text using Gemini (fallback if Google Translate API not available)
 */
export async function translateText(text: string, targetLanguage: string): Promise<string> {
  try {
    const prompt = `Translate the following text to ${targetLanguage}. Return only the translated text without any additional explanation:

${text}`;

    // Ensure API key is set
    if (!apiKey) {
      throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

    return response.text || '';
  } catch (error) {
    console.error('Error translating text:', error);
    throw new Error('Failed to translate text. Please try again.');
  }
}

/**
 * Course generation interfaces
 */
export interface CourseGenerationInput {
  subject: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // days
  language: string;
  prior_knowledge: 'none' | 'some' | 'extensive';
  user_goal: 'exam preparation' | 'revision' | 'mastery' | 'hobby' | 'career';
  category?: string;
  is_programming?: boolean;
}

export interface CourseModule {
  module_number: number;
  title: string;
  summary: string;
  concepts: string[];
  examples: string[];
  flashcards: Array<{ question: string; answer: string }>;
  practice_tasks: Array<{ title: string; description: string; difficulty: 'easy' | 'medium' | 'hard' }>;
  checkpoint_quiz: {
    questions: Array<{
      question: string;
      options: string[];
      correct_answer: number;
      explanation: string;
    }>;
  };
  time_required: number; // minutes
  content_blocks: Array<{
    type: 'text' | 'video' | 'code' | 'image' | 'link';
    content: string;
    metadata?: Record<string, any>;
  }>;
  ide_tasks?: Array<{
    problem_statement: string;
    starter_code: string;
    expected_output: string;
    test_cases: Array<{ input: string; expected_output: string }>;
    difficulty: 'easy' | 'medium' | 'hard';
    hints: string[];
    time_estimate: number;
  }>;
}

export interface GeneratedCourse {
  course: {
    title: string;
    description: string;
    outcomes: string[];
    level: string;
    duration_days: number;
    modules: CourseModule[];
    revision_plan: {
      weekly_reviews: Array<{ week: number; topics: string[] }>;
    };
    final_test: {
      questions: Array<{
        question: string;
        options: string[];
        correct_answer: number;
        explanation: string;
      }>;
    };
    projects: Array<{
      title: string;
      description: string;
      requirements: string[];
      complexity: 'easy' | 'medium' | 'hard';
    }>;
    recommended_courses: string[];
    progress_curve: string;
    motivational_tips: string[];
  };
}

/**
 * Generate a complete AI-powered course
 */
export async function generateCourse(input: CourseGenerationInput): Promise<GeneratedCourse> {
  try {
    const programmingNote = input.is_programming 
      ? `\n\nIMPORTANT: This is a programming/technology course. Include IDE-ready exercises with:
- Problem statements
- Starter code templates
- Expected outputs
- Hidden test cases
- Difficulty levels
- Hints
- Time estimates
Use the ide_tasks field in each module for coding exercises.`
      : '';

    const prompt = `You are the Edura Course Architect. Generate a COMPLETE, comprehensive course based on the following user inputs:

**Subject:** ${input.subject}
**Level:** ${input.level}
**Duration:** ${input.duration} days
**User Goal:** ${input.user_goal}
**Prior Knowledge:** ${input.prior_knowledge}
**Category:** ${input.category || 'General'}
**Language:** ${input.language}${programmingNote}

THE COURSE MUST INCLUDE:

1. **Course Title** - Engaging and descriptive
2. **Clear Description** - What students will learn
3. **Learning Outcomes** - List of 5-8 specific outcomes
4. **Total Modules** - Break into daily or weekly plan based on duration
5. **For Each Module:**
   - Module number and title
   - Summary (2-3 sentences)
   - Key concepts explained simply
   - Practical examples
   - Flashcards (5-10 per module)
   - Practice tasks (3-5 per module)
   - Checkpoint quiz (5-10 MCQs with correct answers and explanations)
   - Estimated time required (in minutes)
   - Content blocks (text paragraphs, video suggestions, code snippets, links)
   ${input.is_programming ? '- IDE tasks (coding exercises with starter code, test cases, hints)' : ''}

6. **Weekly Revision Plan** - Topics to review each week
7. **End-of-Course Test** - 20-30 comprehensive MCQs
8. **Mini Projects** - 3-5 projects (if technical/coding course)
9. **Progress Curve** - Description of difficulty progression
10. **Motivational Tips** - 5-7 encouraging notes
11. **Recommended Courses** - 3-5 related course suggestions

Format STRICTLY as valid JSON (no markdown, no code blocks):

{
  "course": {
    "title": "...",
    "description": "...",
    "outcomes": ["outcome1", "outcome2", ...],
    "level": "${input.level}",
    "duration_days": ${input.duration},
    "modules": [
      {
        "module_number": 1,
        "title": "...",
        "summary": "...",
        "concepts": ["concept1", "concept2"],
        "examples": ["example1", "example2"],
        "flashcards": [
          {"question": "...", "answer": "..."}
        ],
        "practice_tasks": [
          {"title": "...", "description": "...", "difficulty": "easy|medium|hard"}
        ],
        "checkpoint_quiz": {
          "questions": [
            {
              "question": "...",
              "options": ["...", "...", "...", "..."],
              "correct_answer": 0,
              "explanation": "..."
            }
          ]
        },
        "time_required": 60,
        "content_blocks": [
          {"type": "text", "content": "..."},
          {"type": "video", "content": "Video title", "metadata": {"url": "..."}},
          {"type": "code", "content": "code snippet", "metadata": {"language": "..."}}
        ]${input.is_programming ? `,
        "ide_tasks": [
          {
            "problem_statement": "...",
            "starter_code": "...",
            "expected_output": "...",
            "test_cases": [
              {"input": "...", "expected_output": "..."}
            ],
            "difficulty": "easy|medium|hard",
            "hints": ["hint1", "hint2"],
            "time_estimate": 30
          }
        ]` : ''}
      }
    ],
    "revision_plan": {
      "weekly_reviews": [
        {"week": 1, "topics": ["topic1", "topic2"]}
      ]
    },
    "final_test": {
      "questions": [
        {
          "question": "...",
          "options": ["...", "...", "...", "..."],
          "correct_answer": 0,
          "explanation": "..."
        }
      ]
    },
    "projects": [
      {
        "title": "...",
        "description": "...",
        "requirements": ["req1", "req2"],
        "complexity": "easy|medium|hard"
      }
    ],
    "recommended_courses": ["course1", "course2"],
    "progress_curve": "Description of difficulty progression...",
    "motivational_tips": ["tip1", "tip2"]
  }
}

Make sure:
- The course fits exactly within ${input.duration} days
- Each module's time aligns with daily/weekly schedule
- Difficulty progresses naturally
- Content is appropriate for ${input.level} level
- All JSON is valid and properly formatted
- Return ONLY JSON, no markdown, no code blocks`;

    // Ensure API key is set
    if (!apiKey) {
      throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
    }

    // Generate content with error handling for API key issues
    let response;
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
    } catch (apiError: any) {
      // If API key error, provide helpful message
      if (apiError.message?.includes('API key') || apiError.message?.includes('apikey') || apiError.message?.includes('No API key')) {
        console.error('Gemini API key error:', apiError);
        throw new Error(`Gemini API key error: ${apiError.message}. Current API key: ${apiKey.substring(0, 10)}... Please verify the key is valid.`);
      }
      throw apiError;
    }

    const text = response.text || '';
    
    // Extract JSON from response
    let jsonText = text.trim();
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const course = JSON.parse(jsonMatch[0]);
      return course;
    }
    
    throw new Error('Failed to parse generated course');
  } catch (error) {
    console.error('Error generating course:', error);
    throw new Error('Failed to generate course. Please try again.');
  }
}

