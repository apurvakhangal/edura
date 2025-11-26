import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { TranslatedText } from '@/components/TranslatedText';
import { useTranslatedText } from '@/hooks/useTranslation';
import {
  BookOpen,
  Clock,
  Star,
  Search,
  Loader2,
  TrendingUp,
  Users,
  Code,
  GraduationCap,
  Sparkles,
  Target,
  Layers,
  ListChecks,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getPublishedCourses,
  getUserCourses,
  getExternalCourses,
  type Course,
  type ExternalCourse,
  generateAICourse,
} from '@/services/courseService';
import type { CourseGenerationInput } from '@/lib/gemini';

export default function Courses() {
  const [activeTab, setActiveTab] = useState<'library' | 'my-courses'>('library');
  const [publishedCourses, setPublishedCourses] = useState<Course[]>([]);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [externalCourses, setExternalCourses] = useState<ExternalCourse[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingExternal, setIsLoadingExternal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    level: 'all' as 'all' | 'beginner' | 'intermediate' | 'advanced',
    category: 'all' as string,
    language: 'all' as string,
  });
  const [showCourseGenerator, setShowCourseGenerator] = useState(false);
  const [courseGeneratorStep, setCourseGeneratorStep] = useState(1);
  const [isGeneratingCourse, setIsGeneratingCourse] = useState(false);
  const [courseForm, setCourseForm] = useState<CourseGenerationInput>({
    topic: '',
    goal: '',
    audience: 'Motivated learners eager to level up',
    level: 'beginner',
    durationWeeks: 4,
    preferredLanguage: 'English',
    focusArea: 'Hands-on, project-based learning',
    includeProjects: true,
    includeIDE: false,
    category: 'tech',
  });

  const { toast } = useToast();

  const difficultyColors = {
    beginner: 'bg-success text-success-foreground',
    intermediate: 'bg-accent text-accent-foreground',
    advanced: 'bg-destructive text-destructive-foreground',
  };

  const categories = [
    { value: 'tech', label: 'Technology', icon: Code },
    { value: 'language', label: 'Languages', icon: BookOpen },
    { value: 'arts', label: 'Arts', icon: GraduationCap },
    { value: 'upsc', label: 'UPSC', icon: TrendingUp },
    { value: 'medical', label: 'Medical', icon: Users },
    { value: 'coding', label: 'Coding', icon: Code },
    { value: 'school', label: 'School Subjects', icon: BookOpen },
  ];
  const courseGeneratorSteps = ['Learning Goal', 'Skill & Schedule', 'Review'];
  const generatorBenefits = [
    { title: 'Tailored modules', description: 'Structured weeks with skills that build on each other.', icon: Layers },
    { title: 'Hands-on projects', description: 'Real-world practice tasks and flashcards per module.', icon: ListChecks },
    { title: 'Assessments included', description: 'Auto-generated quizzes and reflections to measure progress.', icon: Target },
  ];
  const courseStepProgress = (courseGeneratorStep / courseGeneratorSteps.length) * 100;

  const resetCourseGenerator = () => {
    setCourseForm({
      topic: '',
      goal: '',
      audience: 'Motivated learners eager to level up',
      level: 'beginner',
      durationWeeks: 4,
      preferredLanguage: 'English',
      focusArea: 'Hands-on, project-based learning',
      includeProjects: true,
      includeIDE: false,
      category: courseForm.category || 'tech',
    });
    setCourseGeneratorStep(1);
    setIsGeneratingCourse(false);
  };

  const handleGeneratorOpenChange = (open: boolean) => {
    setShowCourseGenerator(open);
    if (!open) {
      resetCourseGenerator();
    }
  };

  const validateCourseStep = () => {
    if (courseGeneratorStep === 1) {
      if (!courseForm.topic.trim() || !courseForm.goal.trim() || !courseForm.audience.trim()) {
        toast({
          title: 'Tell us about the course',
          description: 'Add a topic, audience, and learning goal to continue.',
          variant: 'destructive',
        });
        return false;
      }
    }
    if (courseGeneratorStep === 2) {
      if (courseForm.durationWeeks < 1 || !courseForm.focusArea.trim()) {
        toast({
          title: 'Almost there',
          description: 'Please set a realistic duration and focus area.',
          variant: 'destructive',
        });
        return false;
      }
    }
    return true;
  };

  const handleCourseNext = () => {
    if (!validateCourseStep()) return;
    setCourseGeneratorStep((prev) => Math.min(prev + 1, courseGeneratorSteps.length));
  };

  const handleCourseBack = () => {
    setCourseGeneratorStep((prev) => Math.max(prev - 1, 1));
  };

  const handleGenerateCourse = async () => {
    if (!validateCourseStep()) return;
    setIsGeneratingCourse(true);
    try {
      const payload: CourseGenerationInput = {
        ...courseForm,
        durationWeeks: Math.max(1, courseForm.durationWeeks),
        includeIDE: Boolean(courseForm.includeIDE),
      };
      const result = await generateAICourse(payload);
      if (result.error || !result.course) {
        throw new Error(result.error || 'Failed to generate course.');
      }
      toast({
        title: 'Course generated! 🎉',
        description: `${result.course.title} is ready in your library.`,
      });
      handleGeneratorOpenChange(false);
      setActiveTab('my-courses');
      await loadCourses();
    } catch (error: any) {
      toast({
        title: 'Generation failed',
        description: error.message || 'Could not generate course. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingCourse(false);
    }
  };

  // Load courses
  useEffect(() => {
    loadCourses();
  }, []);

  // Load external courses when library tab is active
  useEffect(() => {
    if (activeTab === 'library') {
      loadExternalCourses();
    }
  }, [activeTab]);

  // Filter courses
  useEffect(() => {
    filterCourses();
  }, [searchQuery, filters, publishedCourses, myCourses, activeTab, externalCourses]);

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const [publishedResult, myCoursesResult] = await Promise.all([
        getPublishedCourses(),
        getUserCourses(),
      ]);

      // Handle published courses
      if (publishedResult.error) {
        console.error('Error loading published courses:', publishedResult.error);
        toast({
          title: 'Warning',
          description: publishedResult.error,
          variant: 'destructive',
        });
        setPublishedCourses([]);
      } else {
        setPublishedCourses(publishedResult.courses || []);
      }

      // Handle user courses
      if (myCoursesResult.error) {
        console.error('Error loading user courses:', myCoursesResult.error);
        // Only show error if it's not a "not logged in" type error
        if (!myCoursesResult.error.includes('logged in')) {
          toast({
            title: 'Warning',
            description: myCoursesResult.error,
            variant: 'destructive',
          });
        }
        setMyCourses([]);
      } else {
        setMyCourses(myCoursesResult.courses || []);
      }
    } catch (error: any) {
      console.error('Unexpected error loading courses:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load courses',
        variant: 'destructive',
      });
      setPublishedCourses([]);
      setMyCourses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExternalCourses = async () => {
    // Only load if not already loaded or if we need to refresh
    if (externalCourses.length > 0 && !isLoadingExternal) {
      return; // Already loaded
    }
    
    setIsLoadingExternal(true);
    try {
      const result = await getExternalCourses();
      if (result.courses && result.courses.length > 0) {
        // Display all static courses
        setExternalCourses(result.courses);
        console.log('Loaded external courses:', result.courses.length);
      } else if (result.error) {
        console.warn('Failed to load external courses:', result.error);
        // Set empty array to prevent retries
        setExternalCourses([]);
      } else {
        // No courses returned, set empty array
        setExternalCourses([]);
      }
    } catch (error: any) {
      console.error('Error loading external courses:', error);
      // Set empty array on error
      setExternalCourses([]);
    } finally {
      setIsLoadingExternal(false);
    }
  };

  const filterCourses = () => {
    if (activeTab === 'library') {
      // For library tab, we'll display both published courses and external courses separately
      // Filter published courses
      let filtered = [...publishedCourses];
      
      if (searchQuery.trim()) {
        filtered = filtered.filter(
          (course) =>
            course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      if (filters.level !== 'all') {
        filtered = filtered.filter((course) => course.level === filters.level);
      }

      if (filters.category !== 'all') {
        filtered = filtered.filter((course) => course.category === filters.category);
      }

      if (filters.language !== 'all') {
        filtered = filtered.filter((course) => course.primary_language === filters.language);
      }

      setFilteredCourses(filtered);
    } else {
      // For my-courses tab, only filter my courses
      let filtered = [...myCourses];

      if (searchQuery.trim()) {
        filtered = filtered.filter(
          (course) =>
            course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      if (filters.level !== 'all') {
        filtered = filtered.filter((course) => course.level === filters.level);
      }

      if (filters.category !== 'all') {
        filtered = filtered.filter((course) => course.category === filters.category);
      }

      if (filters.language !== 'all') {
        filtered = filtered.filter((course) => course.primary_language === filters.language);
      }

      setFilteredCourses(filtered);
    }
  };

  const totalModules = (myCourses || []).reduce((sum, c) => sum + (c.total_modules || 0), 0);
  const totalHours = (myCourses || []).reduce((sum, c) => sum + (c.estimated_hours || 0), 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold"><TranslatedText text="Courses" /></h1>
        </div>
      </motion.div>

      <Card className="mb-8 border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />
              <p className="text-sm font-semibold uppercase tracking-wide">AI Course Builder</p>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Generate an AI-Powered Course</h2>
              <p className="text-muted-foreground">
                Answer a few questions and let our course builder craft modules, projects, flashcards, and quizzes tailored to your goal.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {generatorBenefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div key={benefit.title} className="flex items-start gap-2 text-sm">
                    <Icon className="mt-1 h-4 w-4 text-primary" />
                    <div>
                      <p className="font-semibold">{benefit.title}</p>
                      <p className="text-xs text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-48">
            <Button onClick={() => handleGeneratorOpenChange(true)}>
              Generate Course
            </Button>
            <Button variant="outline" onClick={() => setActiveTab('my-courses')}>
              View My Courses
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCourseGenerator} onOpenChange={handleGeneratorOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create a Custom Course</DialogTitle>
            <DialogDescription>
              We will use your answers to assemble modules, practice tasks, flashcards, and quizzes tailored to your learning objective.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Step {courseGeneratorStep} of {courseGeneratorSteps.length}: {courseGeneratorSteps[courseGeneratorStep - 1]}
                </span>
                <span className="font-semibold text-primary">AI Builder</span>
              </div>
              <Progress value={courseStepProgress} className="mt-2" />
            </div>

            {courseGeneratorStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label>What should we teach?</Label>
                  <Input
                    placeholder="e.g., Full-stack TypeScript, UPSC GS3, Human Anatomy"
                    value={courseForm.topic}
                    onChange={(e) => setCourseForm({ ...courseForm, topic: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Learning goal</Label>
                  <Textarea
                    placeholder="Describe the outcome or transformation you want for learners."
                    value={courseForm.goal}
                    onChange={(e) => setCourseForm({ ...courseForm, goal: e.target.value })}
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Audience</Label>
                  <Input
                    placeholder="Who is this course for?"
                    value={courseForm.audience}
                    onChange={(e) => setCourseForm({ ...courseForm, audience: e.target.value })}
                  />
                </div>
              </div>
            )}

            {courseGeneratorStep === 2 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Current level</Label>
                  <Select
                    value={courseForm.level}
                    onValueChange={(value) =>
                      setCourseForm({ ...courseForm, level: value as 'beginner' | 'intermediate' | 'advanced' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duration (weeks)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={courseForm.durationWeeks}
                    onChange={(e) => setCourseForm({ ...courseForm, durationWeeks: Number(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preferred language</Label>
                  <Input
                    placeholder="English"
                    value={courseForm.preferredLanguage}
                    onChange={(e) => setCourseForm({ ...courseForm, preferredLanguage: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Focus area</Label>
                  <Input
                    placeholder="e.g., Project-based learning, Exam strategies, Clinical reasoning"
                    value={courseForm.focusArea}
                    onChange={(e) => setCourseForm({ ...courseForm, focusArea: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={courseForm.category || 'tech'}
                    onValueChange={(value) => setCourseForm({ ...courseForm, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <Label className="text-base">Include projects & practice?</Label>
                    <p className="text-sm text-muted-foreground">Adds hands-on tasks, flashcards, and module quizzes.</p>
                  </div>
                  <Switch
                    checked={courseForm.includeProjects}
                    onCheckedChange={(checked) => setCourseForm({ ...courseForm, includeProjects: checked })}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <Label className="text-base">Include IDE guidance?</Label>
                    <p className="text-sm text-muted-foreground">Adds environment setup tips for each generated module.</p>
                  </div>
                  <Switch
                    checked={Boolean(courseForm.includeIDE)}
                    onCheckedChange={(checked) => setCourseForm({ ...courseForm, includeIDE: checked })}
                  />
                </div>
              </div>
            )}

            {courseGeneratorStep === 3 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Summary</CardTitle>
                    <CardDescription>
                      The AI assistant will generate {Math.max(4, courseForm.durationWeeks)}+ modules, each with practice material and assessments.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Topic</p>
                      <p className="font-semibold">{courseForm.topic || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Audience</p>
                      <p className="font-semibold">{courseForm.audience}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Level</p>
                      <p className="font-semibold capitalize">{courseForm.level}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Timeline</p>
                      <p className="font-semibold">{courseForm.durationWeeks} weeks</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Learning goal</p>
                      <p className="font-semibold text-sm leading-relaxed">{courseForm.goal || 'No goal provided yet.'}</p>
                    </div>
                  </CardContent>
                </Card>
                <div className="rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">
                  <p>The generated course will automatically appear in "My Courses" as a draft. You can edit modules, publish, or keep it private.</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => handleGeneratorOpenChange(false)} disabled={isGeneratingCourse}>
                Cancel
              </Button>
              <Button variant="outline" onClick={handleCourseBack} disabled={courseGeneratorStep === 1 || isGeneratingCourse}>
                Back
              </Button>
            </div>
            {courseGeneratorStep < courseGeneratorSteps.length ? (
              <Button onClick={handleCourseNext} disabled={isGeneratingCourse}>
                Next
              </Button>
            ) : (
              <Button onClick={handleGenerateCourse} disabled={isGeneratingCourse}>
                {isGeneratingCourse ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </span>
                ) : (
                  'Generate Course'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="library">
            <TranslatedText text="Course Library" />
          </TabsTrigger>
          <TabsTrigger value="my-courses">
            <TranslatedText text="My Courses" />
          </TabsTrigger>
        </TabsList>

        {/* Course Library Tab */}
        <TabsContent value="library" className="mt-6">
          {/* Search and Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={filters.level}
                    onValueChange={(value: any) => setFilters({ ...filters, level: value })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all"><TranslatedText text="All Levels" /></SelectItem>
                      <SelectItem value="beginner"><TranslatedText text="Beginner" /></SelectItem>
                      <SelectItem value="intermediate"><TranslatedText text="Intermediate" /></SelectItem>
                      <SelectItem value="advanced"><TranslatedText text="Advanced" /></SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.category}
                    onValueChange={(value) => setFilters({ ...filters, category: value })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all"><TranslatedText text="All Categories" /></SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Course Grid */}
          {isLoading && filteredCourses.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredCourses.length === 0 && externalCourses.length === 0 && !isLoadingExternal ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">
                  <TranslatedText text="No courses found. Try adjusting your filters or check back later." />
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Published Courses */}
              {filteredCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="h-full transition-all hover:shadow-lg">
                    <CardHeader>
                      <div className="mb-2 flex items-start justify-between">
                        <Badge className={difficultyColors[course.level]}>
                          <TranslatedText text={course.level} />
                        </Badge>
                        {course.rating > 0 && (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-4 w-4 fill-success text-success" />
                            <span>{course.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                      <CardDescription className="line-clamp-3">
                        {course.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {course.tags?.slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{course.estimated_hours || 0}h</span>
                        </div>
                        <Button size="sm" asChild>
                          <Link to={`/courses/${course.id}`}>
                            <TranslatedText text="View Course" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              
              {/* External Courses - Static courses */}
              {isLoadingExternal && externalCourses.length === 0 && (
                <div className="col-span-full flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    <TranslatedText text="Loading external courses..." />
                  </span>
                </div>
              )}
              {externalCourses.map((course, index) => (
                <motion.div
                  key={course.id || `external-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (filteredCourses.length + index) * 0.05 }}
                >
                  <Card className="h-full transition-all hover:shadow-lg">
                    <CardHeader>
                      <div className="mb-2 flex items-start justify-between">
                        {course.level && (
                          <Badge className={difficultyColors[course.level] || 'bg-accent text-accent-foreground'}>
                            <TranslatedText text={course.level} />
                          </Badge>
                        )}
                        {course.rating > 0 && (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{course.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                      <CardDescription className="line-clamp-3">
                        {course.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{course.instructor}</span>
                      </div>
                      {course.students && (
                        <div className="text-sm text-muted-foreground">
                          {typeof course.students === 'number' 
                            ? `${course.students.toLocaleString()} students`
                            : course.students}
                        </div>
                      )}
                      <Button
                        size="sm"
                        className="w-full"
                        asChild
                      >
                        <Link to={`/courses/${course.id}`}>
                          <TranslatedText text="View Course" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Courses Tab */}
        <TabsContent value="my-courses" className="mt-6">
          {/* Stats */}
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-primary/10 p-3">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground"><TranslatedText text="My Courses" /></p>
                  <p className="text-2xl font-bold">{myCourses?.length || 0}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-success/10 p-3">
                  <Star className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground"><TranslatedText text="Total Modules" /></p>
                  <p className="text-2xl font-bold">{totalModules}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-accent/10 p-3">
                  <Clock className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground"><TranslatedText text="Learning Hours" /></p>
                  <p className="text-2xl font-bold">{totalHours}h</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* My Courses Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !myCourses || myCourses.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-4 text-muted-foreground">
                  <TranslatedText text="You haven't enrolled in any courses yet." />
                </p>
                <Button onClick={() => setActiveTab('library')}>
                  <TranslatedText text="Browse Course Library" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {myCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="h-full transition-all hover:shadow-lg">
                    <CardHeader>
                      <div className="mb-2 flex items-start justify-between">
                        <Badge className={difficultyColors[course.level]}>
                          <TranslatedText text={course.level} />
                        </Badge>
                      </div>
                      <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {course.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {course.total_modules} <TranslatedText text="modules" />
                        </span>
                        <span className="text-muted-foreground">
                          {course.duration_days} <TranslatedText text="days" />
                        </span>
                      </div>
                      <Button className="w-full" asChild>
                        <Link to={`/courses/${course.id}`}>
                          <TranslatedText text="Continue Learning" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
