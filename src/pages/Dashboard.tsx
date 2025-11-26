import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUserStore } from '@/store/userStore';
import { useTranslatedText } from '@/hooks/useTranslation';
import { TranslatedText } from '@/components/TranslatedText';
import { BookOpen, Brain, Target, Zap, Trophy, Clock, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUserId } from '@/lib/auth';
import { getUserProfile } from '@/services/userService';
import { getUserCourses, getCourseProgress, type Course } from '@/services/courseService';
import { supabase } from '@/lib/supabase';

interface CourseWithProgress extends Course {
  progress?: number;
  completedModules?: number;
}

export default function Dashboard() {
  const user = useUserStore((state) => state.user);
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    xp: 0,
    level: 1,
    streak: 0,
  });
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [totalCourses, setTotalCourses] = useState(0);
  const [todayModulesCompleted, setTodayModulesCompleted] = useState(0);
  const [todayGoal, setTodayGoal] = useState(2);
  const [isLoading, setIsLoading] = useState(true);

  const quickActions = [
    { icon: BookOpen, label: 'Browse Courses', color: 'text-primary', path: '/courses' },
    { icon: Brain, label: 'Ask AI Bot', color: 'text-accent', path: '/ai-bot' },
    { icon: Target, label: 'View Roadmap', color: 'text-success', path: '/roadmap' },
    { icon: Clock, label: 'Focus Session', color: 'text-destructive', path: '/focus' },
  ];

  // Translate all text strings
  const welcomeText = useTranslatedText('Welcome back');
  const readyText = useTranslatedText('Ready to continue your learning journey?');
  const totalXPText = useTranslatedText('Total XP');
  const levelText = useTranslatedText('Level');
  const coursesText = useTranslatedText('Courses');
  const streakText = useTranslatedText('Streak');
  const daysText = useTranslatedText('days');
  const quickActionsTitle = useTranslatedText('Quick Actions');
  const quickActionsDesc = useTranslatedText('Jump right into your learning activities');
  const yourCoursesTitle = useTranslatedText('Your Courses');
  const yourCoursesDesc = useTranslatedText('Continue where you left off');
  const modulesCompletedText = useTranslatedText('modules completed');
  const ofText = useTranslatedText('of');
  const continueText = useTranslatedText('Continue');
  const levelProgressTitle = useTranslatedText('Level Progress');
  const xpToLevelText = useTranslatedText('XP to Level');
  const todaysGoalTitle = useTranslatedText("Today's Goal");
  const todaysGoalDesc = useTranslatedText('Stay consistent to build your streak');
  const completeModulesText = useTranslatedText('Complete');
  const modulesText = useTranslatedText('modules');
  const startLearningText = useTranslatedText('Start Learning');

  useEffect(() => {
    loadDashboardData();
    
    // Listen for dashboard refresh events
    const handleRefresh = () => {
      loadDashboardData();
    };
    
    // Refresh when window regains focus (user returns to tab)
    const handleFocus = () => {
      loadDashboardData();
    };
    
    window.addEventListener('dashboard-refresh', handleRefresh);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('dashboard-refresh', handleRefresh);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        navigate('/login');
        return;
      }

      // Load user profile
      const profileResult = await getUserProfile(userId);
      let currentLevel = 1;
      if (profileResult.profile) {
        const profile = profileResult.profile;
        currentLevel = profile.level || 1;
        setUserData({
          xp: profile.xp || 0,
          level: currentLevel,
          streak: profile.streak || 0,
        });
        
        // Update user store
        useUserStore.setState({
          user: {
            name: profile.name || user?.name || '',
            email: profile.email || user?.email || '',
            xp: profile.xp || 0,
            level: currentLevel,
            streak: profile.streak || 0,
          },
        });
      }

      // Load courses with progress (courses the user has started)
      const { data: progressData, error: progressError } = await supabase
        .from('user_course_progress')
        .select(`
          *,
          courses (
            id,
            title,
            description,
            category,
            level,
            total_modules,
            created_at
          )
        `)
        .eq('user_id', userId)
        .order('last_accessed', { ascending: false })
        .limit(3);

      if (!progressError && progressData) {
        const coursesWithProgress = progressData
          .filter(item => item.courses) // Filter out null courses
          .map(item => ({
            ...(item.courses as Course),
            progress: item.progress_percentage || 0,
            completedModules: item.completed_modules || 0,
          }));
        
        setCourses(coursesWithProgress);
        setTotalCourses(coursesWithProgress.length);
      } else {
        // Fallback: also check user's own courses
        const coursesResult = await getUserCourses(userId);
        if (coursesResult.courses) {
          const coursesList = coursesResult.courses;
          setTotalCourses(coursesList.length);

          // Load progress for each course
          const coursesWithProgress = await Promise.all(
            coursesList.slice(0, 3).map(async (course) => {
              const progressResult = await getCourseProgress(course.id, userId);
              const progress = progressResult.progress;
              
              return {
                ...course,
                progress: progress?.progress_percentage || 0,
                completedModules: progress?.completed_modules || 0,
              };
            })
          );

          setCourses(coursesWithProgress);
        }
      }

      // Calculate today's completed modules
      await calculateTodayProgress(userId, currentLevel);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTodayProgress = async (userId: string, userLevel: number) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Get all course progress updated today
      const { data: progressData, error } = await supabase
        .from('user_course_progress')
        .select('completed_modules, updated_at')
        .eq('user_id', userId)
        .gte('updated_at', todayISO);

      if (error) {
        console.error('Error fetching today progress:', error);
        return;
      }

      // Count modules completed today
      // This is a simplified calculation - in a real app, you'd track module completions separately
      let modulesToday = 0;
      if (progressData && progressData.length > 0) {
        // For now, we'll estimate based on progress updates
        // In a real implementation, you'd have a separate table for module completions
        modulesToday = Math.min(progressData.length, 2); // Estimate
      }

      setTodayModulesCompleted(modulesToday);
      
      // Set goal based on user level (higher level = more modules)
      const goal = Math.max(2, Math.floor(userLevel / 2) + 1);
      setTodayGoal(goal);
    } catch (error) {
      console.error('Error calculating today progress:', error);
    }
  };

  // Calculate XP needed for next level
  const xpForNextLevel = 100; // 100 XP per level
  const currentLevelXP = userData.xp % xpForNextLevel;
  const xpNeeded = xpForNextLevel - currentLevelXP;
  const levelProgress = (currentLevelXP / xpForNextLevel) * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container px-4 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="mb-2 text-3xl font-bold">
            {welcomeText}, {user?.name}! 👋
          </h1>
          <p className="text-muted-foreground">
            {readyText}
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-primary/10 p-3">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{totalXPText}</p>
                  <p className="text-2xl font-bold">{userData.xp}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-success/10 p-3">
                  <Trophy className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{levelText}</p>
                  <p className="text-2xl font-bold">{userData.level}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-accent/10 p-3">
                  <BookOpen className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{coursesText}</p>
                  <p className="text-2xl font-bold">{totalCourses}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-destructive/10 p-3">
                  <Clock className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{streakText}</p>
                  <p className="text-2xl font-bold">{userData.streak} {daysText}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>{quickActionsTitle}</CardTitle>
                <CardDescription>{quickActionsDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {quickActions.map((action, index) => (
                    <motion.div
                      key={action.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                    >
                      <Link to={action.path}>
                        <Button
                          variant="outline"
                          className="h-auto flex-col gap-2 p-4 w-full"
                        >
                          <action.icon className={`h-6 w-6 ${action.color}`} />
                          <span className="text-xs"><TranslatedText text={action.label} /></span>
                        </Button>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Active Courses */}
            <Card>
              <CardHeader>
                <CardTitle>{yourCoursesTitle}</CardTitle>
                <CardDescription>{yourCoursesDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {courses.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No courses yet. Start learning!</p>
                    <Button asChild>
                      <Link to="/courses">
                        <TranslatedText text="Browse Courses" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  courses.map((course, index) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{course.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {course.completedModules || 0} {ofText} {course.total_modules || 0} {modulesCompletedText}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/courses/${course.id}`}>
                            {continueText}
                          </Link>
                        </Button>
                      </div>
                      <Progress value={course.progress || 0} />
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Level Progress */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>{levelProgressTitle}</CardTitle>
                  <CardDescription>
                    {xpNeeded} {xpToLevelText} {userData.level + 1}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Progress value={levelProgress} />
                    <div className="flex items-center justify-between text-sm">
                      <span>{levelText} {userData.level}</span>
                      <span>{levelText} {userData.level + 1}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Today's Goal */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>{todaysGoalTitle}</CardTitle>
                  <CardDescription>{todaysGoalDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{completeModulesText} {todayGoal} {modulesText}</span>
                      <span className="text-sm text-muted-foreground">{todayModulesCompleted}/{todayGoal}</span>
                    </div>
                    <Progress value={(todayModulesCompleted / todayGoal) * 100} />
                    <Button className="w-full" variant="outline" asChild>
                      <Link to="/courses">
                        {startLearningText}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
