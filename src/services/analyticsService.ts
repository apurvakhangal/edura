import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/auth';

const SUBJECT_COLORS = ['bg-primary', 'bg-accent', 'bg-success', 'bg-destructive'];

export interface AnalyticsSummary {
  studyHours: number;
  studyHoursChange: number;
  focusScore: number;
  focusChange: number;
  streak: number;
  completedModules: number;
}

export interface WeeklyTrendPoint {
  label: string;
  hours: number;
}

export interface DailyFocusScore {
  label: string;
  score: number;
}

export interface SubjectPerformance {
  name: string;
  score: number;
  colorClass: string;
}

export interface TimeBlockInsight {
  label: string;
  description: string;
  score: number;
  bgClass: string;
  textClass: string;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  weeklyTrend: WeeklyTrendPoint[];
  focusByDay: DailyFocusScore[];
  subjects: SubjectPerformance[];
  timeBlocks: TimeBlockInsight[];
  isFallback: boolean;
}

interface StudySessionRow {
  duration_minutes: number;
  mode: 'focus' | 'break';
  created_at: string;
}

interface ProgressRow {
  course_id: string;
  progress_percentage: number;
  completed_modules?: number;
}

const formatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });

export async function getAnalyticsData(): Promise<AnalyticsData> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('You need to be logged in to view analytics.');
    }

    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setDate(today.getDate() - 28);

    const { data: sessions, error: sessionsError } = await supabase
      .from('study_sessions')
      .select('duration_minutes, mode, created_at')
      .eq('user_id', userId)
      .gte('created_at', monthAgo.toISOString());

    if (sessionsError) {
      throw sessionsError;
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('streak')
      .eq('id', userId)
      .single();

    const { data: progressRows, error: progressError } = await supabase
      .from('user_course_progress')
      .select('course_id, progress_percentage, completed_modules')
      .eq('user_id', userId);

    if (progressError && progressError.code !== 'PGRST116') {
      throw progressError;
    }

    const courseIds = (progressRows || []).map((row) => row.course_id);
    let courseMap: Record<string, { title?: string; category?: string }> = {};

    if (courseIds.length) {
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title, category')
        .in('id', courseIds);
      if (courses) {
        courseMap = courses.reduce<Record<string, { title?: string; category?: string }>>((acc, course) => {
          acc[course.id] = { title: course.title, category: course.category };
          return acc;
        }, {});
      }
    }

    const fallback = getFallbackAnalytics();
    const summary = buildSummaryMetrics(sessions || [], progressRows || [], userRow?.streak || 0, today);
    const weeklyTrend = buildWeeklyTrend(sessions || [], today);
    const focusByDay = buildFocusByDay(sessions || [], today);
    const timeBlocks = buildTimeBlocks(sessions || []);
    const subjects = buildSubjectPerformance(progressRows || [], courseMap);

    const hasStudySessions = Boolean(sessions && sessions.length);
    const hasMeaningfulTrend = weeklyTrend.some((point) => point.hours > 0);
    const hasFocusData = focusByDay.some((entry) => entry.score > 0);
    const hasTimeInsights = timeBlocks.some((block) => block.score > 0);
    const hasProgressData = Boolean(
      progressRows &&
        progressRows.some((row) => (row.completed_modules || 0) > 0 || (row.progress_percentage || 0) > 0),
    );
    const hasSubjectInsights = subjects.length > 0 && subjects.some((subject) => subject.score > 0);

    const mergedSummary = { ...summary };

    if (!hasStudySessions) {
      mergedSummary.studyHours = fallback.summary.studyHours;
      mergedSummary.studyHoursChange = fallback.summary.studyHoursChange;
      mergedSummary.focusScore = fallback.summary.focusScore;
      mergedSummary.focusChange = fallback.summary.focusChange;
    }

    if (!mergedSummary.streak) {
      mergedSummary.streak = fallback.summary.streak;
    }

    if (!hasProgressData && mergedSummary.completedModules === 0) {
      mergedSummary.completedModules = fallback.summary.completedModules;
    }

    const mergedTrend = hasStudySessions && hasMeaningfulTrend ? weeklyTrend : fallback.weeklyTrend;
    const mergedFocus = hasStudySessions && hasFocusData ? focusByDay : fallback.focusByDay;
    const mergedTimeBlocks = hasStudySessions && hasTimeInsights ? timeBlocks : fallback.timeBlocks;
    const mergedSubjects = hasSubjectInsights ? subjects : fallback.subjects;

    const isStillFallback = !hasStudySessions && !hasProgressData;

    return {
      summary: mergedSummary,
      weeklyTrend: mergedTrend,
      focusByDay: mergedFocus,
      timeBlocks: mergedTimeBlocks,
      subjects: mergedSubjects,
      isFallback: isStillFallback,
    };
  } catch (error) {
    console.warn('Falling back to sample analytics data:', error);
    return getFallbackAnalytics();
  }
}

function buildSummaryMetrics(
  sessions: StudySessionRow[],
  progressRows: ProgressRow[],
  streak: number,
  today: Date,
): AnalyticsSummary {
  const lastWeekStart = new Date(today);
  lastWeekStart.setDate(today.getDate() - 7);
  const prevWeekStart = new Date(today);
  prevWeekStart.setDate(today.getDate() - 14);

  const { totalMinutes: lastWeekMinutes, focusMinutes: lastWeekFocus } = aggregateRange(
    sessions,
    lastWeekStart,
    today,
  );
  const {
    totalMinutes: prevWeekMinutes,
    focusMinutes: prevWeekFocus,
  } = aggregateRange(sessions, prevWeekStart, lastWeekStart);

  const studyHours = Number((lastWeekMinutes / 60).toFixed(1));
  const studyHoursChange = calculateChange(lastWeekMinutes, prevWeekMinutes);

  const lastFocusScore = computePercent(lastWeekFocus, lastWeekMinutes);
  const prevFocusScore = computePercent(prevWeekFocus, prevWeekMinutes);
  const focusChange = Number((lastFocusScore - prevFocusScore).toFixed(1));

  const completedModules = progressRows.reduce(
    (sum, row) => sum + (row.completed_modules || 0),
    0,
  );

  return {
    studyHours,
    studyHoursChange,
    focusScore: Math.round(lastFocusScore),
    focusChange,
    streak,
    completedModules,
  };
}

function buildWeeklyTrend(sessions: StudySessionRow[], today: Date): WeeklyTrendPoint[] {
  const points: WeeklyTrendPoint[] = [];
  for (let i = 4; i > 0; i -= 1) {
    const rangeEnd = new Date(today);
    rangeEnd.setDate(today.getDate() - (7 * (i - 1)));
    const rangeStart = new Date(rangeEnd);
    rangeStart.setDate(rangeEnd.getDate() - 7);

    const { totalMinutes } = aggregateRange(sessions, rangeStart, rangeEnd);
    points.push({
      label: `${formatter.format(rangeStart)}`,
      hours: Number((totalMinutes / 60).toFixed(1)),
    });
  }
  return points;
}

function buildFocusByDay(sessions: StudySessionRow[], today: Date): DailyFocusScore[] {
  const days: DailyFocusScore[] = [];
  for (let i = 4; i >= 0; i -= 1) {
    const dayStart = new Date(today);
    dayStart.setDate(today.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    const { totalMinutes, focusMinutes } = aggregateRange(sessions, dayStart, dayEnd);
    days.push({
      label: dayStart.toLocaleDateString(undefined, { weekday: 'short' }),
      score: Math.round(computePercent(focusMinutes, totalMinutes)),
    });
  }
  return days;
}

function buildTimeBlocks(sessions: StudySessionRow[]): TimeBlockInsight[] {
  const blocks = [
    { label: 'Morning (5 AM - 12 PM)', start: 5, end: 12, bgClass: 'bg-success/10', textClass: 'text-success' },
    { label: 'Afternoon (12 PM - 5 PM)', start: 12, end: 17, bgClass: 'bg-primary/10', textClass: 'text-primary' },
    { label: 'Evening (5 PM - 11 PM)', start: 17, end: 23, bgClass: 'bg-muted', textClass: 'text-muted-foreground' },
  ];

  const blockScores = blocks.map((block) => {
    const focusMinutes = sessions.reduce((sum, session) => {
      const hour = new Date(session.created_at).getHours();
      if (hour >= block.start && hour < block.end && session.mode === 'focus') {
        return sum + session.duration_minutes;
      }
      return sum;
    }, 0);
    return focusMinutes;
  });

  const maxMinutes = Math.max(...blockScores, 1);

  return blocks.map((block, index) => ({
    label: block.label,
    description:
      index === 0
        ? 'Peak deep work performance'
        : index === 1
          ? 'Reliable focus window'
          : 'Wind-down or review time',
    score: Math.round((blockScores[index] / maxMinutes) * 100),
    bgClass: block.bgClass,
    textClass: block.textClass,
  }));
}

function buildSubjectPerformance(
  progressRows: ProgressRow[],
  courseMap: Record<string, { title?: string; category?: string }>,
): SubjectPerformance[] {
  if (!progressRows.length) {
    return getFallbackSubjects();
  }

  return progressRows
    .map((row, index) => ({
      name: courseMap[row.course_id]?.title || courseMap[row.course_id]?.category || `Course ${index + 1}`,
      score: Math.round(row.progress_percentage || 0),
      colorClass: SUBJECT_COLORS[index % SUBJECT_COLORS.length],
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

function aggregateRange(sessions: StudySessionRow[], from: Date, to: Date) {
  return sessions.reduce(
    (acc, session) => {
      const createdAt = new Date(session.created_at);
      if (createdAt >= from && createdAt < to) {
        acc.totalMinutes += session.duration_minutes;
        if (session.mode === 'focus') {
          acc.focusMinutes += session.duration_minutes;
        }
      }
      return acc;
    },
    { totalMinutes: 0, focusMinutes: 0 },
  );
}

function computePercent(part: number, total: number) {
  if (!total) return 0;
  return (part / total) * 100;
}

function calculateChange(current: number, previous: number) {
  if (!previous) {
    return Number((current ? 100 : 0).toFixed(1));
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export function getFallbackAnalytics(): AnalyticsData {
  return {
    summary: {
      studyHours: 24.5,
      studyHoursChange: 12,
      focusScore: 87,
      focusChange: 5,
      streak: 12,
      completedModules: 18,
    },
    weeklyTrend: [20, 25, 18, 30].map((hours, index) => ({
      label: `Week ${index + 1}`,
      hours,
    })),
    focusByDay: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, index) => ({
      label: day,
      score: [85, 92, 78, 88, 95][index],
    })),
    subjects: getFallbackSubjects(),
    timeBlocks: [
      {
        label: 'Morning (8 AM - 12 PM)',
        description: 'Your peak performance time',
        score: 92,
        bgClass: 'bg-success/10',
        textClass: 'text-success',
      },
      {
        label: 'Afternoon (12 PM - 5 PM)',
        description: 'Good focus levels',
        score: 78,
        bgClass: 'bg-primary/10',
        textClass: 'text-primary',
      },
      {
        label: 'Evening (5 PM - 10 PM)',
        description: 'Lower concentration',
        score: 65,
        bgClass: 'bg-muted',
        textClass: 'text-muted-foreground',
      },
    ],
    isFallback: true,
  };
}

function getFallbackSubjects(): SubjectPerformance[] {
  return [
    { name: 'React', score: 92, colorClass: SUBJECT_COLORS[0] },
    { name: 'JavaScript', score: 88, colorClass: SUBJECT_COLORS[1] },
    { name: 'TypeScript', score: 75, colorClass: SUBJECT_COLORS[2] },
    { name: 'Algorithms', score: 65, colorClass: SUBJECT_COLORS[3] },
  ];
}
