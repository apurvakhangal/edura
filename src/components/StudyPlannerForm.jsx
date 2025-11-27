import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const PRIORITY_OPTIONS = [
  { label: 'High', value: 'high', badge: 'bg-red-500/15 text-red-500' },
  { label: 'Medium', value: 'medium', badge: 'bg-yellow-500/15 text-yellow-600' },
  { label: 'Low', value: 'low', badge: 'bg-emerald-500/15 text-emerald-600' },
];

const todayISODate = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString().split('T')[0];
};

function StudyPlannerForm({ onAddTask, onGenerateSchedule, tasks = [], prefillTask, onPrefillConsumed }) {
  const [formState, setFormState] = useState({
    name: '',
    deadlineDate: todayISODate(),
    deadlineTime: '18:00',
    estimatedHours: '1.5',
    priority: 'medium',
  });

  const updateField = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (!prefillTask) return;
    setFormState((prev) => ({
      ...prev,
      ...prefillTask,
    }));
    onPrefillConsumed?.();
  }, [prefillTask, onPrefillConsumed]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formState.name.trim() || !formState.deadlineDate) {
      return;
    }

    const composedDeadline = new Date(
      `${formState.deadlineDate}T${formState.deadlineTime || '23:59'}`
    );

    const parsedHours = Math.max(0.5, Number(formState.estimatedHours));
    onAddTask?.({
      name: formState.name.trim(),
      deadline: composedDeadline.toISOString(),
      estimatedHours: parsedHours,
      priority: formState.priority,
    });

    setFormState((prev) => ({
      ...prev,
      name: '',
      estimatedHours: '1.5',
      deadlineDate: todayISODate(),
      deadlineTime: '18:00',
    }));
  };

  const handleGenerateClick = () => {
    if (tasks.length === 0) {
      return;
    }
    onGenerateSchedule?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">AI Study Planner</CardTitle>
        <CardDescription>
          Add every upcoming study task with a deadline and priority. The planner will balance the load for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="taskName">Task name</Label>
            <Input
              id="taskName"
              placeholder="e.g., DSA Assignment, AI Quiz"
              value={formState.name}
              onChange={(event) => updateField('name', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadlineDate">Deadline date</Label>
            <Input
              id="deadlineDate"
              type="date"
              value={formState.deadlineDate}
              min={todayISODate()}
              onChange={(event) => updateField('deadlineDate', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadlineTime">Deadline time</Label>
            <Input
              id="deadlineTime"
              type="time"
              value={formState.deadlineTime}
              onChange={(event) => updateField('deadlineTime', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedHours">Estimated hours</Label>
            <Input
              id="estimatedHours"
              type="number"
              min="0.5"
              step="0.5"
              value={formState.estimatedHours}
              onChange={(event) => updateField('estimatedHours', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={formState.priority} onValueChange={(value) => updateField('priority', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col justify-end">
            <span className="text-sm font-medium text-transparent" aria-hidden>
              Add Task
            </span>
            <Button type="submit" className="w-full">
              Add Task
            </Button>
          </div>

          <div className="md:col-span-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGenerateClick}
              disabled={tasks.length === 0}
            >
              Generate Schedule
            </Button>
          </div>
        </form>

        {tasks.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Pending Tasks
              </h4>
              <span className="text-xs text-muted-foreground">{tasks.length} total</span>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {tasks.map((task) => {
                const priorityMeta = PRIORITY_OPTIONS.find((option) => option.value === task.priority);
                return (
                  <div
                    key={task.id || task.deadline + task.name}
                    className="flex flex-wrap items-center justify-between rounded-lg border bg-muted/40 p-3"
                  >
                    <div>
                      <p className="font-medium">{task.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Due {new Date(task.deadline).toLocaleString()} • {task.estimatedHours} hrs
                      </p>
                    </div>
                    <Badge className={priorityMeta?.badge}>{priorityMeta?.label}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default StudyPlannerForm;
