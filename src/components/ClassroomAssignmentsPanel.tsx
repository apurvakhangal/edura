import { Fragment, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Loader2, RefreshCw, UploadCloud } from 'lucide-react';
import type { ClassroomAssignment, ClassroomAssignmentBuckets } from '@/types/classroom';

interface ClassroomAssignmentsPanelProps {
  assignments: ClassroomAssignmentBuckets;
  loading: boolean;
  error?: string | null;
  isConnected: boolean;
  userLabel?: string;
  lastSyncedAt: number | null;
  onImport: () => Promise<void> | void;
  onBulkGenerate: () => void;
  onPrefill: (assignment: ClassroomAssignment) => void;
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-red-500/15 text-red-600',
  upcoming: 'bg-amber-500/15 text-amber-600',
  completed: 'bg-emerald-500/15 text-emerald-600',
};

const formatDueLabel = (dueDateTime: string | null) => {
  if (!dueDateTime) return 'No due date';
  const date = new Date(dueDateTime);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const EmptyState = ({ label }: { label: string }) => (
  <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
    No {label} assignments synced yet.
  </div>
);

const AssignmentList = ({ assignments, onPrefill }: { assignments: ClassroomAssignment[]; onPrefill: (assignment: ClassroomAssignment) => void }) => (
  <div className="space-y-3">
    {assignments.map((assignment) => (
      <div key={assignment.id} className="space-y-2 rounded-xl border bg-background/70 p-3 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold leading-tight">{assignment.title}</p>
            <p className="text-xs text-muted-foreground">{assignment.courseName}</p>
          </div>
          <Badge className={STATUS_BADGE[assignment.status]}>{assignment.status}</Badge>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>Due {formatDueLabel(assignment.dueDateTime)}</span>
          {assignment.maxPoints && <span>{assignment.maxPoints} pts</span>}
          {assignment.alternateLink && (
            <a
              href={assignment.alternateLink}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Open in Classroom
            </a>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {assignment.description || 'No description provided.'}
          </p>
          <Button size="sm" variant="outline" onClick={() => onPrefill(assignment)}>
            Add to Planner
          </Button>
        </div>
      </div>
    ))}
  </div>
);

const ClassroomAssignmentsPanel = ({
  assignments,
  loading,
  error,
  isConnected,
  userLabel,
  lastSyncedAt,
  onImport,
  onBulkGenerate,
  onPrefill,
}: ClassroomAssignmentsPanelProps) => {
  const pendingCount = assignments.pending.length;

  const syncLabel = useMemo(() => {
    if (!lastSyncedAt) return 'Not synced yet';
    return `Last sync: ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, [lastSyncedAt]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">Google Classroom</CardTitle>
            <CardDescription>
              Import assignments directly and feed them to the AI planner.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => onImport?.()} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  {isConnected ? <RefreshCw className="mr-2 h-4 w-4" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  {isConnected ? 'Refresh Classroom' : 'Import from Google Classroom'}
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={onBulkGenerate}
              disabled={!pendingCount || loading}
              title={pendingCount ? 'Generate a plan from Classroom tasks' : 'No pending Classroom tasks yet'}
            >
              Generate Schedule from Classroom Tasks
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {userLabel ? (
            <Fragment>
              <p className="font-medium text-foreground">Connected as {userLabel}</p>
              <p>{syncLabel}</p>
            </Fragment>
          ) : (
            <p>Connect your Google account to sync Classroom courses and assignments.</p>
          )}
        </div>
        {error && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">Pending ({assignments.pending.length})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({assignments.upcoming.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({assignments.completed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">
            {assignments.pending.length ? (
              <AssignmentList assignments={assignments.pending} onPrefill={onPrefill} />
            ) : (
              <EmptyState label="pending" />
            )}
          </TabsContent>
          <TabsContent value="upcoming">
            {assignments.upcoming.length ? (
              <AssignmentList assignments={assignments.upcoming} onPrefill={onPrefill} />
            ) : (
              <EmptyState label="upcoming" />
            )}
          </TabsContent>
          <TabsContent value="completed">
            {assignments.completed.length ? (
              <AssignmentList assignments={assignments.completed} onPrefill={onPrefill} />
            ) : (
              <EmptyState label="completed" />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ClassroomAssignmentsPanel;
