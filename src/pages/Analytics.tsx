import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, TrendingUp, Clock, Target, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { TranslatedText } from '@/components/TranslatedText';
import { getAnalyticsData, AnalyticsData, getFallbackAnalytics } from '@/services/analyticsService';

export default function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData>(() => getFallbackAnalytics());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const loadAnalytics = async () => {
      try {
        const data = await getAnalyticsData();
        if (isActive) {
          setAnalytics(data);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Unable to load analytics right now.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();
    return () => {
      isActive = false;
    };
  }, []);

  const summary = analytics?.summary;
  const hasProvisionalData = Boolean(summary);
  const showSkeleton = loading && !hasProvisionalData;
  const trendPoints = analytics?.weeklyTrend ?? [];
  const trendLabels = trendPoints.length
    ? trendPoints.map((point) => point.label)
    : ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  const focusEntries = analytics?.focusByDay ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((label) => ({ label, score: 0 }));
  const subjectEntries = analytics?.subjects ?? [];
  const timeBlockEntries = analytics?.timeBlocks ?? [];

  const overviewCards = [
    {
      label: 'Study Time',
      value: summary ? `${summary.studyHours.toFixed(1)}h` : '--',
      delta: summary ? `${summary.studyHoursChange >= 0 ? '+' : ''}${summary.studyHoursChange}%` : '',
      deltaLabel: 'this week',
      deltaClass: summary && summary.studyHoursChange >= 0 ? 'text-success' : 'text-destructive',
      icon: Clock,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      label: 'Focus Score',
      value: summary ? `${summary.focusScore}%` : '--',
      delta: summary ? `${summary.focusChange >= 0 ? '+' : ''}${summary.focusChange}%` : '',
      deltaLabel: 'vs last week',
      deltaClass: summary && summary.focusChange >= 0 ? 'text-success' : 'text-destructive',
      icon: Target,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      label: 'Streak',
      value: summary ? `${summary.streak} days` : '--',
      delta: 'Keep it up!',
      deltaLabel: '',
      translateDelta: true,
      deltaClass: 'text-muted-foreground',
      icon: TrendingUp,
      iconBg: 'bg-accent/10',
      iconColor: 'text-accent',
    },
    {
      label: 'Completed',
      value: summary ? summary.completedModules.toString() : '--',
      delta: 'modules',
      deltaLabel: '',
      translateDelta: true,
      deltaClass: 'text-muted-foreground',
      icon: Award,
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex items-center gap-3">
          <BarChart className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold"><TranslatedText text="Analytics" /></h1>
        </div>
      </motion.div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!error && !loading && analytics?.isFallback && (
        <div className="mb-4 rounded-lg border border-muted/40 bg-muted/20 p-4 text-sm text-muted-foreground">
          Showing sample insights until you log study sessions.
        </div>
      )}

      {/* Overview Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        {overviewCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`rounded-full ${card.iconBg} p-3`}>
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  <TranslatedText text={card.label} />
                </p>
                {showSkeleton ? (
                  <Skeleton className="mt-2 h-6 w-24" />
                ) : (
                  <p className="text-2xl font-bold">{card.value}</p>
                )}
                {!showSkeleton && card.delta && (
                  <p className={`text-xs ${card.deltaClass}`}>
                    {card.translateDelta ? <TranslatedText text={card.delta} /> : card.delta}
                    {card.deltaLabel && (
                      <span className="text-muted-foreground">
                        {' '}
                        <TranslatedText text={card.deltaLabel} />
                      </span>
                    )}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview"><TranslatedText text="Overview" /></TabsTrigger>
          <TabsTrigger value="subjects"><TranslatedText text="By Subject" /></TabsTrigger>
          <TabsTrigger value="time"><TranslatedText text="Time Analysis" /></TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle><TranslatedText text="Study Time Trend" /></CardTitle>
                <CardDescription><TranslatedText text="Your weekly study hours over the last month" /></CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex h-64 items-end justify-around gap-2">
                  {trendPoints.length > 0 &&
                    trendPoints.map((point, i) => {
                      const max = Math.max(...trendPoints.map((p) => p.hours), 1);
                      const heightPercent = max ? (point.hours / max) * 100 : 0;
                      return (
                        <motion.div
                          key={point.label}
                          initial={{ height: 0 }}
                          animate={{ height: `${heightPercent}%` }}
                          transition={{ delay: i * 0.1 }}
                          className="w-full rounded-t-lg bg-primary"
                          title={`${point.hours}h`}
                        />
                      );
                    })}
                  {!trendPoints.length && showSkeleton && (
                    <div className="flex w-full gap-2">
                      {[...Array(4)].map((_, index) => (
                        <Skeleton key={index} className="h-full w-full rounded" />
                      ))}
                    </div>
                  )}
                  {!trendPoints.length && !showSkeleton && (
                    <p className="w-full text-center text-sm text-muted-foreground">
                      Start a study session to see your weekly trend.
                    </p>
                  )}
                </div>
                <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                  {trendLabels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle><TranslatedText text="Focus Score" /></CardTitle>
                <CardDescription><TranslatedText text="Your concentration levels throughout the week" /></CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {focusEntries.map((entry, i) => (
                    <div key={entry.label}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{entry.label}</span>
                        {showSkeleton && !analytics ? (
                          <Skeleton className="h-3 w-12" />
                        ) : (
                          <span className="font-semibold">{entry.score}%</span>
                        )}
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        {showSkeleton && !analytics ? (
                          <Skeleton className="h-2 w-full rounded-full" />
                        ) : (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${entry.score}%` }}
                            transition={{ delay: i * 0.1 }}
                            className="h-full bg-gradient-accent"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subjects">
          <Card>
            <CardHeader>
              <CardTitle><TranslatedText text="Performance by Subject" /></CardTitle>
              <CardDescription><TranslatedText text="Your strongest and weakest areas" /></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {subjectEntries.map((subject, i) => (
                  <motion.div
                    key={subject.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="mb-2 flex justify-between">
                      <span className="font-semibold">{subject.name}</span>
                      <span className="text-sm text-muted-foreground">{subject.score}%</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${subject.score}%` }}
                        transition={{ delay: i * 0.1 + 0.2 }}
                        className={`h-full ${subject.colorClass}`}
                      />
                    </div>
                  </motion.div>
                ))}
                {subjectEntries.length === 0 && (
                  <p className="text-sm text-muted-foreground">Log some course progress to see subject performance.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time">
          <Card>
            <CardHeader>
              <CardTitle><TranslatedText text="Best Study Times" /></CardTitle>
              <CardDescription><TranslatedText text="When you're most productive" /></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeBlockEntries.map((block) => (
                  <div
                    key={block.label}
                    className={`flex items-center justify-between rounded-lg p-4 ${block.bgClass}`}
                  >
                    <div>
                      <p className="font-semibold"><TranslatedText text={block.label} /></p>
                      <p className="text-sm text-muted-foreground">{block.description}</p>
                    </div>
                    <div className={`text-2xl font-bold ${block.textClass}`}>{block.score}%</div>
                  </div>
                ))}
                {timeBlockEntries.length === 0 && (
                  <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                    We'll highlight your most productive hours once we detect enough study sessions.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
