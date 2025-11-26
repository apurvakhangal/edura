import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const PRIORITY_BADGES = {
  high: 'bg-red-500/15 text-red-500',
  medium: 'bg-yellow-500/15 text-yellow-600',
  low: 'bg-emerald-500/15 text-emerald-600',
  buffer: 'bg-blue-500/15 text-blue-500',
};

function ScheduleList({ schedule = [] }) {
  if (!schedule.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Add a few tasks and generate your plan to see study slots here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {schedule.map((day) => (
        <Card key={day.date}>
          <CardHeader className="flex flex-col gap-1 pb-2">
            <CardTitle className="text-lg">{new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}</CardTitle>
            <p className="text-sm text-muted-foreground">{day.tasks.length} focused block(s)</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {day.tasks.map((task, index) => (
              <div
                key={`${day.date}-${index}`}
                className="flex flex-wrap items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{task.task}</p>
                  <p className="text-xs text-muted-foreground">{task.duration}</p>
                </div>
                <Badge className={PRIORITY_BADGES[task.priority] || 'bg-primary/10 text-primary'}>
                  {task.priority === 'buffer' ? 'Buffer' : task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default ScheduleList;
