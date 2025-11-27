export type ClassroomAssignmentStatus = 'pending' | 'upcoming' | 'completed';

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  alternateLink?: string;
  descriptionHeading?: string;
}

export interface ClassroomAssignment {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  description?: string;
  dueDateTime: string | null;
  alternateLink?: string;
  state?: string;
  status: ClassroomAssignmentStatus;
  maxPoints?: number;
}

export interface ClassroomAssignmentBuckets {
  pending: ClassroomAssignment[];
  upcoming: ClassroomAssignment[];
  completed: ClassroomAssignment[];
}
