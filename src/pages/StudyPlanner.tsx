import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CalendarDays } from 'lucide-react';
import StudyPlannerForm from '@/components/StudyPlannerForm';
import ScheduleList from '@/components/ScheduleList';
import ScheduleCalendar from '@/components/ScheduleCalendar';
import { generateSchedule } from '@/utils/generateSchedule';
import ClassroomAssignmentsPanel from '@/components/ClassroomAssignmentsPanel';
import useGoogleClassroom from '@/hooks/useGoogleClassroom';
import type { ClassroomAssignment } from '@/types/classroom';

const PRIORITY_BADGES = {
  high: 'bg-red-500/15 text-red-500',
  medium: 'bg-yellow-500/15 text-yellow-600',
  low: 'bg-emerald-500/15 text-emerald-600',
  buffer: 'bg-blue-500/15 text-blue-500',
};

const createId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const formatLocalDateLabel = (isoDate) => {
  if (!isoDate) return 'selected day';
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'selected day';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
};

const fallbackDueDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toISOString();
};

const toDateInput = (isoString: string) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const toTimeInput = (isoString: string) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '18:00';
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
};

const resolvePriority = (dueIso?: string | null) => {
  if (!dueIso) return 'medium';
  const dueDate = new Date(dueIso);
  if (Number.isNaN(dueDate.getTime())) return 'medium';
  const diffHours = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60);
  if (diffHours <= 48) return 'high';
  if (diffHours <= 24 * 7) return 'medium';
  return 'low';
};

const assignmentToTask = (assignment: ClassroomAssignment) => {
  const dueDate = assignment.dueDateTime || fallbackDueDate();
  return {
    id: createId(),
    name: assignment.title,
    deadline: dueDate,
    estimatedHours: 2,
    priority: resolvePriority(dueDate),
    source: 'google-classroom',
    sourceAssignmentId: assignment.id,
    courseName: assignment.courseName,
  };
};

const assignmentToPrefill = (assignment: ClassroomAssignment) => {
  const dueDate = assignment.dueDateTime || fallbackDueDate();
  return {
    name: assignment.title,
    deadlineDate: toDateInput(dueDate),
    deadlineTime: toTimeInput(dueDate),
    estimatedHours: '2',
    priority: resolvePriority(dueDate),
  };
};

const StudyPlanner = () => {
  const [tasks, setTasks] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [prefillTask, setPrefillTask] = useState(null);
  const { toast } = useToast();
  const {
    assignments: classroomAssignments,
    loading: classroomLoading,
    error: classroomError,
    userProfile,
    lastSyncedAt,
    isConnected: classroomConnected,
    connectAndSync,
  } = useGoogleClassroom();

  useEffect(() => {
    // Clear tasks and schedule on component mount
    setTasks([]);
    setSchedule([]);
  }, []);

  const totalHours = useMemo(
    () => tasks.reduce((sum, task) => sum + Number(task.estimatedHours || 0), 0),
    [tasks],
  );

  const handleAddTask = (task) => {
    setTasks((prev) => [...prev, { ...task, id: createId() }]);
  };

  const handleGenerateSchedule = useCallback(
    (tasksToSchedule = tasks) => {
      const plan = generateSchedule(tasksToSchedule);
      setSchedule([]); // Clear the existing schedule
      const firstDay = plan[0];
      setSelectedDate(firstDay?.date || '');
      setSelectedTasks(firstDay?.tasks || []);

      toast({
        title: plan.length ? 'Study schedule ready' : 'Need more info',
        description: plan.length
          ? 'We distributed your workload. Tap any day to view focus blocks.'
          : 'Add at least one task with a deadline to generate a plan.',
      });

      const urgentSlot = plan.find((day) => day.tasks.some((task) => task.priority === 'high'));
      if (urgentSlot) {
        toast({
          title: 'Urgent block scheduled',
          description: `Focus on ${urgentSlot.tasks.find((task) => task.priority === 'high')?.task} on ${new Date(
            urgentSlot.date,
          ).toLocaleDateString()}.`,
          variant: 'destructive',
        });
      }
    },
    [tasks, toast],
  );

  const handlePrefillFromAssignment = (assignment: ClassroomAssignment) => {
    setPrefillTask(assignmentToPrefill(assignment));
    toast({
      title: 'Planner pre-filled',
      description: `Review and add “${assignment.title}” to your queue.`,
    });
  };

  const handleBulkScheduleFromClassroom = () => {
    const pendingAssignments = classroomAssignments.pending;
    if (!pendingAssignments.length) {
      toast({
        title: 'No Classroom tasks',
        description: 'Sync pending assignments before generating a schedule.',
      });
      return;
    }

    setTasks((prev) => {
      const existingAssignmentIds = new Set(
        prev.map((task) => task.sourceAssignmentId).filter(Boolean),
      );
      const newTasks = pendingAssignments
        .map(assignmentToTask)
        .filter((task) => !existingAssignmentIds.has(task.sourceAssignmentId));

      if (!newTasks.length) {
        toast({
          title: 'Already imported',
          description: 'All pending Classroom assignments are already in your planner.',
        });
        return prev;
      }

      const updated = [...prev, ...newTasks];
      handleGenerateSchedule(updated);
      toast({
        title: 'Schedule generated',
        description: 'Pending Classroom tasks were added and scheduled automatically.',
      });
      return updated;
    });
  };

  const handleImportFromClassroom = async () => {
    try {
      await connectAndSync();
      toast({
        title: 'Classroom synced',
        description: 'Courses and assignments imported successfully.',
      });
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Unable to reach Google Classroom.',
        variant: 'destructive',
      });
    }
  };

  const handleDateSelect = (iso, dayTasks) => {
    setSelectedDate(iso);
    setSelectedTasks(dayTasks);
  };

  const selectedHeading = formatLocalDateLabel(selectedDate);

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex items-center gap-3">
          <CalendarDays className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">AI Study Planner</h1>
            <p className="text-muted-foreground">Balance tasks, deadlines, and focus time automatically.</p>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <StudyPlannerForm
            onAddTask={handleAddTask}
            onGenerateSchedule={handleGenerateSchedule}
            tasks={tasks}
            prefillTask={prefillTask}
            onPrefillConsumed={() => setPrefillTask(null)}
          />

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>At a glance</CardTitle>
              <CardDescription>Your queue before scheduling</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">Tasks queued:</span>{' '}
                <span className="font-semibold">{tasks.length}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Estimated effort:</span>{' '}
                <span className="font-semibold">{totalHours.toFixed(1)} hrs</span>
              </p>
              <Separator className="my-3" />
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge className="bg-red-500/15 text-red-500">High priority first</Badge>
                <Badge className="bg-primary/15 text-primary">Max 3 hrs/day</Badge>
                <Badge className="bg-blue-500/15 text-blue-500">Buffers on urgent days</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <ScheduleCalendar schedule={schedule} onDateSelect={handleDateSelect} />

          <ClassroomAssignmentsPanel
            assignments={classroomAssignments}
            loading={classroomLoading}
            error={classroomError}
            isConnected={classroomConnected}
            userLabel={userProfile?.name || userProfile?.email || undefined}
            lastSyncedAt={lastSyncedAt}
            onImport={handleImportFromClassroom}
            onBulkGenerate={handleBulkScheduleFromClassroom}
            onPrefill={handlePrefillFromAssignment}
          />

          <Card>
            <CardHeader>
              <CardTitle>Tasks on {selectedHeading}</CardTitle>
              <CardDescription>
                Click any date in the calendar to inspect its workload.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedTasks.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  {selectedDate
                    ? 'No study blocks scheduled for this day yet.'
                    : 'Pick a day on the calendar to preview its focus blocks.'}
                </div>
              ) : (
                selectedTasks.map((task, index) => (
                  <div
                    key={`${selectedDate}-${index}`}
                    className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
                  >
                    <div>
                      <p className="font-semibold">{task.task}</p>
                      <p className="text-xs text-muted-foreground">{task.duration}</p>
                    </div>
                    <Badge className={PRIORITY_BADGES[task.priority] || 'bg-primary/10 text-primary'}>
                      {task.priority === 'buffer'
                        ? 'Buffer'
                        : task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)}
                    </Badge>
                  </div>
                ))
              )}
              {schedule.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => handleGenerateSchedule()}>
                  Re-run AI distribution
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-2xl font-semibold">Daily Plan</h2>
        <ScheduleList schedule={schedule} />
      </div>
    </div>
  );
};

export default StudyPlanner;
