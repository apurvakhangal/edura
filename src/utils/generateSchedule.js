const PRIORITY_RANK = { high: 3, medium: 2, low: 1 };
const MAX_HOURS_PER_DAY = 3;
const URGENT_CAPACITY = 4;
const MAX_CHUNK = { high: 2, medium: 1.5, low: 1 };
const BUFFER_HOURS = 0.5;
const MS_IN_DAY = 1000 * 60 * 60 * 24;

const toStartOfDay = (value) => {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return day;
};

const formatISODate = (value) => {
  const day = toStartOfDay(value);
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, '0');
  const date = String(day.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};

const daysBetween = (from, to) => Math.ceil((toStartOfDay(to) - toStartOfDay(from)) / MS_IN_DAY);

const normalizeTasks = (tasks) =>
  (tasks || [])
    .filter((task) => task?.name && task?.deadline && Number(task?.estimatedHours) > 0)
    .map((task, index) => ({
      id: task.id || `task-${index}`,
      name: task.name,
      priority: (task.priority || 'medium').toLowerCase(),
      deadline: toStartOfDay(task.deadline),
      estimatedHours: Math.max(0.5, Number(task.estimatedHours)),
      remainingHours: Math.max(0.5, Number(task.estimatedHours)),
    }));

const sortByPriority = (tasks) =>
  [...tasks].sort((a, b) => {
    const priorityDiff = (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0);
    if (priorityDiff !== 0) return priorityDiff;
    return a.deadline.getTime() - b.deadline.getTime();
  });

export function generateSchedule(tasks = []) {
  const normalized = normalizeTasks(tasks);
  if (!normalized.length) return [];

  const today = toStartOfDay(new Date());
  const lastDeadline = normalized.reduce((latest, task) =>
    task.deadline > latest ? task.deadline : latest,
  today);

  const hasRemainingWork = () => normalized.some((task) => task.remainingHours > 0);
  const plan = [];
  let cursor = new Date(today);
  let safety = 0;

  while ((cursor <= lastDeadline || hasRemainingWork()) && safety < 365) {
    const dayCandidates = normalized.filter((task) => task.remainingHours > 0 && cursor <= task.deadline);
    const overdueFallback = dayCandidates.length ? dayCandidates : normalized.filter((task) => task.remainingHours > 0);

    if (!overdueFallback.length) break;

    const urgentToday = overdueFallback.some(
      (task) => task.priority === 'high' && daysBetween(cursor, task.deadline) <= 1,
    );
    let capacity = urgentToday ? URGENT_CAPACITY : MAX_HOURS_PER_DAY;
    const daySchedule = [];

    sortByPriority(overdueFallback).forEach((task) => {
      if (capacity <= 0) return;
      const daysLeft = Math.max(0, daysBetween(cursor, task.deadline));
      const requiredToday = task.remainingHours / (daysLeft + 1);
      const capacityLimit = Math.min(task.remainingHours, capacity);
      const normalChunk = Math.min(capacityLimit, MAX_CHUNK[task.priority] || capacityLimit);
      const chunk = Math.max(requiredToday, normalChunk);
      const appliedChunk = Math.min(capacityLimit, chunk);
      if (appliedChunk <= 0) return;

      daySchedule.push({
        task: task.name,
        durationHours: appliedChunk,
        priority: task.priority,
      });

      task.remainingHours -= appliedChunk;
      capacity -= appliedChunk;
    });

    if (urgentToday && capacity >= BUFFER_HOURS) {
      daySchedule.push({ task: 'Urgent buffer / review', durationHours: BUFFER_HOURS, priority: 'buffer' });
      capacity -= BUFFER_HOURS;
    }

    if (daySchedule.length) {
      plan.push({
        date: formatISODate(cursor),
        tasks: daySchedule.map((entry) => ({
          task: entry.task,
          duration: `${entry.durationHours % 1 === 0 ? entry.durationHours : entry.durationHours.toFixed(1)} hrs`,
          priority: entry.priority,
        })),
      });
    }

    cursor.setDate(cursor.getDate() + 1);
    safety += 1;
  }

  return plan;
}

export default generateSchedule;
