import { ClassroomAssignmentBuckets, ClassroomAssignment, ClassroomCourse } from '@/types/classroom';

const CLASSROOM_BASE_URL = 'https://classroom.googleapis.com/v1';
const SUBMISSION_STATES = ['NEW', 'CREATED', 'TURNED_IN', 'RETURNED', 'RECLAIMED_BY_STUDENT'];

const classroomFetch = async <T>(token: string, endpoint: string): Promise<T> => {
  const url = endpoint.startsWith('http') ? endpoint : `${CLASSROOM_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Google Classroom error (${response.status}): ${message}`);
  }

  return response.json();
};

const toISODateTime = (
  date?: { year: number; month: number; day: number },
  time?: { hours?: number; minutes?: number; seconds?: number; nanos?: number },
): string | null => {
  if (!date) return null;
  const localDate = new Date(
    date.year,
    (date.month || 1) - 1,
    date.day || 1,
    time?.hours ?? 23,
    time?.minutes ?? 59,
    time?.seconds ?? 0,
    (time?.nanos ?? 0) / 1_000_000,
  );
  return Number.isNaN(localDate.getTime()) ? null : localDate.toISOString();
};

const deriveStatus = (dueDateTime: string | null, submissionState?: string): 'pending' | 'upcoming' | 'completed' => {
  if (submissionState === 'TURNED_IN' || submissionState === 'RETURNED') {
    return 'completed';
  }
  const dueTime = dueDateTime ? new Date(dueDateTime).getTime() : null;
  if (dueTime && dueTime < Date.now()) {
    return 'pending';
  }
  return 'upcoming';
};

const bucketAssignments = (assignments: ClassroomAssignment[]): ClassroomAssignmentBuckets =>
  assignments.reduce<ClassroomAssignmentBuckets>(
    (acc, assignment) => {
      acc[assignment.status] = [...acc[assignment.status], assignment];
      return acc;
    },
    { pending: [], upcoming: [], completed: [] },
  );

export const fetchClassroomCourses = async (token: string): Promise<ClassroomCourse[]> => {
  const data = await classroomFetch<{ courses?: ClassroomCourse[] }>(token, '/courses?courseStates=ACTIVE');
  return data.courses || [];
};

const buildSubmissionQuery = () => SUBMISSION_STATES.map((state) => `states=${state}`).join('&');

export const fetchCourseWork = async (token: string, courseId: string) => {
  const data = await classroomFetch<{ courseWork?: any[] }>(
    token,
    `/courses/${courseId}/courseWork?orderBy=DUE_DATE&courseWorkStates=PUBLISHED`,
  );
  return data.courseWork || [];
};

export const fetchStudentSubmissions = async (token: string, courseId: string) => {
  const query = buildSubmissionQuery();
  const data = await classroomFetch<{ studentSubmissions?: any[] }>(
    token,
    `/courses/${courseId}/courseWork/-/studentSubmissions?${query}`,
  );
  return data.studentSubmissions || [];
};

export const getClassroomAssignments = async (
  token: string,
): Promise<{
  courses: ClassroomCourse[];
  assignments: ClassroomAssignment[];
  buckets: ClassroomAssignmentBuckets;
}> => {
  const courses = await fetchClassroomCourses(token);

  const courseAssignments = await Promise.all(
    courses.map(async (course) => {
      const [courseWork, submissions] = await Promise.all([
        fetchCourseWork(token, course.id),
        fetchStudentSubmissions(token, course.id),
      ]);

      const submissionMap = submissions.reduce<Record<string, string>>((acc, submission) => {
        if (submission.courseWorkId) {
          acc[submission.courseWorkId] = submission.state;
        }
        return acc;
      }, {});

      return courseWork.map((item) => {
        const dueDateTime = toISODateTime(item.dueDate, item.dueTime);
        const assignment: ClassroomAssignment = {
          id: `${course.id}-${item.id}`,
          courseId: course.id,
          courseName: course.name,
          title: item.title,
          description: item.description || '',
          dueDateTime,
          alternateLink: item.alternateLink,
          state: submissionMap[item.id] || 'CREATED',
          status: deriveStatus(dueDateTime, submissionMap[item.id]),
          maxPoints: item.maxPoints,
        };
        return assignment;
      });
    }),
  );

  const assignments = courseAssignments.flat();
  const buckets = bucketAssignments(assignments);

  return { courses, assignments, buckets };
};

export const fetchGoogleProfile = async (token: string) =>
  classroomFetch<{ name: string; picture?: string; email?: string }>(
    token,
    'https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
  );
