import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TranslatedText } from '@/components/TranslatedText';
import { BarChart, TrendingUp, Clock, Target, Award } from 'lucide-react';

export default function Analytics() {
  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex items-center gap-3">
          <BarChart className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold"><TranslatedText text="Analytics" /></h1>
        </div>
      </motion.div>

      {/* Overview Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-primary/10 p-3">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground"><TranslatedText text="Study Time" /></p>
              <p className="text-2xl font-bold">24.5h</p>
              <p className="text-xs text-success">+12% <TranslatedText text="this week" /></p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-success/10 p-3">
              <Target className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground"><TranslatedText text="Focus Score" /></p>
              <p className="text-2xl font-bold">87%</p>
              <p className="text-xs text-success">+5% <TranslatedText text="this week" /></p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-accent/10 p-3">
              <TrendingUp className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground"><TranslatedText text="Streak" /></p>
              <p className="text-2xl font-bold">12 <TranslatedText text="days" /></p>
              <p className="text-xs text-muted-foreground"><TranslatedText text="Keep it up!" /></p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-destructive/10 p-3">
              <Award className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground"><TranslatedText text="Completed" /></p>
              <p className="text-2xl font-bold">18</p>
              <p className="text-xs text-muted-foreground"><TranslatedText text="modules" /></p>
            </div>
          </CardContent>
        </Card>
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
                  {[20, 25, 18, 30, 24, 28, 32].map((height, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${(height / 32) * 100}%` }}
                      transition={{ delay: i * 0.1 }}
                      className="w-full rounded-t-lg bg-primary"
                    />
                  ))}
                </div>
                <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                  <span>Week 1</span>
                  <span>Week 2</span>
                  <span>Week 3</span>
                  <span>Week 4</span>
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
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, i) => {
                    const score = [85, 92, 78, 88, 95][i];
                    return (
                      <div key={day}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span>{day}</span>
                          <span className="font-semibold">{score}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${score}%` }}
                            transition={{ delay: i * 0.1 }}
                            className="h-full bg-gradient-accent"
                          />
                        </div>
                      </div>
                    );
                  })}
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
                {[
                  { name: 'React', score: 92, color: 'bg-primary' },
                  { name: 'JavaScript', score: 88, color: 'bg-accent' },
                  { name: 'TypeScript', score: 75, color: 'bg-success' },
                  { name: 'Algorithms', score: 65, color: 'bg-destructive' },
                ].map((subject, i) => (
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
                        className={`h-full ${subject.color}`}
                      />
                    </div>
                  </motion.div>
                ))}
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
                <div className="flex items-center justify-between rounded-lg bg-success/10 p-4">
                  <div>
                    <p className="font-semibold"><TranslatedText text="Morning (8 AM - 12 PM)" /></p>
                    <p className="text-sm text-muted-foreground"><TranslatedText text="Your peak performance time" /></p>
                  </div>
                  <div className="text-2xl font-bold text-success">92%</div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-primary/10 p-4">
                  <div>
                    <p className="font-semibold"><TranslatedText text="Afternoon (12 PM - 5 PM)" /></p>
                    <p className="text-sm text-muted-foreground"><TranslatedText text="Good focus levels" /></p>
                  </div>
                  <div className="text-2xl font-bold text-primary">78%</div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted p-4">
                  <div>
                    <p className="font-semibold"><TranslatedText text="Evening (5 PM - 10 PM)" /></p>
                    <p className="text-sm text-muted-foreground"><TranslatedText text="Lower concentration" /></p>
                  </div>
                  <div className="text-2xl font-bold text-muted-foreground">65%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
