import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { TranslatedText } from '@/components/TranslatedText';
import {
  ArrowLeft,
  ArrowRight,
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
  ListChecks,
  Film,
  PlayCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getPublishedCourses,
  getUserCourses,
  getExternalCourses,
  type Course,
  type ExternalCourse,
} from '@/services/courseService';
import IDE from '@/components/IDE';
import {
  generatePersonalizedCourse,
  type GeneratedCoursePlan,
  type CourseGeneratorQuestionnaire,
} from '@/services/courseGeneratorService';

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

const formatOptions = [
  { value: 'balanced', label: 'Balanced mix' },
  { value: 'project', label: 'Project heavy' },
  { value: 'theory', label: 'Theory first' },
] as const;

const learningStyles = [
  { value: 'visual', label: 'Visual (videos, diagrams)' },
  { value: 'auditory', label: 'Auditory (talk-throughs)' },
  { value: 'kinesthetic', label: 'Kinesthetic (hands-on)' },
  { value: 'read-write', label: 'Read & write (notes, docs)' },
] as const;

const generatorStepMeta = [
  {
    title: 'Vision & goals',
    description: 'Tell us the topic, the outcome you care about, and your current experience.',
  },
  {
    title: 'Time & cadence',
    description: 'Share how many hours you can spend and how long we can stretch the plan.',
  },
  {
    title: 'Support style',
    description: 'Describe how you learn best and whether we should include coding labs.',
  },
];

const generatorStepCount = generatorStepMeta.length;

type GeneratorAnswers = {
  topic: string;
  outcome: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredFormat: 'balanced' | 'project' | 'theory';
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'read-write';
  timePerWeek: string;
  durationWeeks: string;
  supportNeeds: string;
  codingFocus: boolean;
};

const initialGeneratorAnswers: GeneratorAnswers = {
  topic: '',
  outcome: '',
  experienceLevel: 'beginner',
  preferredFormat: 'balanced',
  learningStyle: 'visual',
  timePerWeek: '6',
  durationWeeks: '6',
  supportNeeds: '',
  codingFocus: true,
};

const slugify = (value: string) => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'course';
};

const getYouTubeEmbedUrl = (url?: string | null) => {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  const videoId = match ? match[1] : null;
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
};

const parseNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function Courses() {
  const [activeTab, setActiveTab] = useState<'library' | 'my-courses' | 'generator'>('library');
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
  const [generatorStep, setGeneratorStep] = useState(1);
  const [generatorAnswers, setGeneratorAnswers] = useState<GeneratorAnswers>(initialGeneratorAnswers);
  const [isGeneratingCourse, setIsGeneratingCourse] = useState(false);
  const [generatedCourse, setGeneratedCourse] = useState<GeneratedCoursePlan | null>(null);

  const { toast } = useToast();
  const generatorProgress = (generatorStep / generatorStepCount) * 100;
  const selectedLearningStyleLabel = useMemo(() => {
    return (
      learningStyles.find((style) => style.value === generatorAnswers.learningStyle)?.label || '—'
    );
  }, [generatorAnswers.learningStyle]);
  const aiCourseId = useMemo(() => {
    if (!generatedCourse?.title) return 'ai-course-draft';
    return `ai-${slugify(generatedCourse.title)}`;
  }, [generatedCourse?.title]);

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
    } else if (activeTab === 'my-courses') {
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
    } else {
      // Keep previously fetched published courses handy for generator tab
      setFilteredCourses(publishedCourses);
    }
  };

  const validateGeneratorStep = (step: number) => {
    if (step === 1) {
      if (!generatorAnswers.topic.trim()) {
        toast({ title: 'Missing topic', description: 'Tell us what you want to learn first.', variant: 'destructive' });
        return false;
      }
      if (!generatorAnswers.outcome.trim()) {
        toast({ title: 'Missing outcome', description: 'Share the outcome or role you are targeting.', variant: 'destructive' });
        return false;
      }
    }
    if (step === 2) {
      if (!generatorAnswers.timePerWeek.trim()) {
        toast({ title: 'Time per week', description: 'Let us know roughly how many hours you can invest.', variant: 'destructive' });
        return false;
      }
      if (!generatorAnswers.durationWeeks.trim()) {
        toast({ title: 'Timeline', description: 'Set a timeline in weeks so we can size the plan.', variant: 'destructive' });
        return false;
      }
    }
    if (step === 3 && !generatorAnswers.learningStyle) {
      toast({ title: 'Learning style', description: 'Pick a learning style so we can tailor resources.', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleGeneratorNext = () => {
    if (!validateGeneratorStep(generatorStep)) return;
    setGeneratorStep((prev) => Math.min(prev + 1, generatorStepCount));
  };

  const handleGeneratorBack = () => {
    setGeneratorStep((prev) => Math.max(prev - 1, 1));
  };

  const resetGeneratorFlow = () => {
    setGeneratorStep(1);
    setGeneratorAnswers(initialGeneratorAnswers);
    setGeneratedCourse(null);
  };

  const handleGenerateCourse = async () => {
    if (!validateGeneratorStep(generatorStep)) return;
    setIsGeneratingCourse(true);
    try {
      const questionnaire: CourseGeneratorQuestionnaire = {
        topic: generatorAnswers.topic.trim(),
        outcome: generatorAnswers.outcome.trim(),
        experienceLevel: generatorAnswers.experienceLevel,
        preferredFormat: generatorAnswers.preferredFormat,
        learningStyle: generatorAnswers.learningStyle,
        timePerWeek: parseNumber(generatorAnswers.timePerWeek, 6),
        durationWeeks: parseNumber(generatorAnswers.durationWeeks, 6),
        supportNeeds: generatorAnswers.supportNeeds.trim(),
        codingFocus: generatorAnswers.codingFocus,
        motivation: generatorAnswers.supportNeeds.trim() || undefined,
      };

      const { plan, error } = await generatePersonalizedCourse(questionnaire);
      if (!plan || error) {
        throw new Error(error || 'Failed to generate course plan.');
      }

      setGeneratedCourse(plan);
      toast({
        title: 'Course plan ready',
        description: 'Scroll down to review your personalized curriculum.',
      });
    } catch (error: any) {
      toast({
        title: 'Generator error',
        description: error.message || 'Unable to generate the course right now.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingCourse(false);
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

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'library' | 'my-courses' | 'generator')}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-3xl grid-cols-3">
          <TabsTrigger value="library">
            <TranslatedText text="Course Library" />
          </TabsTrigger>
          <TabsTrigger value="my-courses">
            <TranslatedText text="My Courses" />
          </TabsTrigger>
          <TabsTrigger value="generator">
            AI Course Builder
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

        {/* AI Course Generator Tab */}
        <TabsContent value="generator" className="mt-6 space-y-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Sparkles className="h-6 w-6 text-primary" />
                  AI Course Architect
                </CardTitle>
                <CardDescription>
                  Answer a few prompts and we will assemble a full curriculum, mini projects, and recommended media.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Step {generatorStep} of {generatorStepCount}</span>
                    <span>{generatorStepMeta[generatorStep - 1]?.title}</span>
                  </div>
                  <Progress value={generatorProgress} className="h-2" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {generatorStepMeta[generatorStep - 1]?.description}
                  </p>
                </div>

                {generatorStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="generator-topic">What should we learn?</Label>
                      <Input
                        id="generator-topic"
                        placeholder="e.g., Build an AI-ready React app"
                        value={generatorAnswers.topic}
                        onChange={(e) => setGeneratorAnswers((prev) => ({ ...prev, topic: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="generator-outcome">Desired outcome</Label>
                      <Textarea
                        id="generator-outcome"
                        placeholder="Describe the project, role, or impact you are chasing"
                        value={generatorAnswers.outcome}
                        onChange={(e) => setGeneratorAnswers((prev) => ({ ...prev, outcome: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Current experience</Label>
                      <Select
                        value={generatorAnswers.experienceLevel}
                        onValueChange={(value) =>
                          setGeneratorAnswers((prev) => ({
                            ...prev,
                            experienceLevel: value as 'beginner' | 'intermediate' | 'advanced',
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {generatorStep === 2 && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="generator-hours">Hours per week</Label>
                        <Input
                          id="generator-hours"
                          type="number"
                          min={1}
                          value={generatorAnswers.timePerWeek}
                          onChange={(e) => setGeneratorAnswers((prev) => ({ ...prev, timePerWeek: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="generator-weeks">Duration (weeks)</Label>
                        <Input
                          id="generator-weeks"
                          type="number"
                          min={1}
                          value={generatorAnswers.durationWeeks}
                          onChange={(e) => setGeneratorAnswers((prev) => ({ ...prev, durationWeeks: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Preferred delivery</Label>
                      <Select
                        value={generatorAnswers.preferredFormat}
                        onValueChange={(value) =>
                          setGeneratorAnswers((prev) => ({
                            ...prev,
                            preferredFormat: value as 'balanced' | 'project' | 'theory',
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {formatOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {generatorStep === 3 && (
                  <div className="space-y-4">
                    <div>
                      <Label>Learning style</Label>
                      <Select
                        value={generatorAnswers.learningStyle}
                        onValueChange={(value) =>
                          setGeneratorAnswers((prev) => ({
                            ...prev,
                            learningStyle: value as 'visual' | 'auditory' | 'kinesthetic' | 'read-write',
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {learningStyles.map((style) => (
                            <SelectItem key={style.value} value={style.value}>
                              {style.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="generator-support">Support that helps you stay consistent</Label>
                      <Textarea
                        id="generator-support"
                        rows={3}
                        value={generatorAnswers.supportNeeds}
                        onChange={(e) => setGeneratorAnswers((prev) => ({ ...prev, supportNeeds: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <Label className="mb-1 flex items-center gap-2 text-base">
                          <Code className="h-4 w-4" />
                          Include coding labs?
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Toggle off if this topic is non-technical.
                        </p>
                      </div>
                      <Switch
                        checked={generatorAnswers.codingFocus}
                        onCheckedChange={(checked) =>
                          setGeneratorAnswers((prev) => ({ ...prev, codingFocus: checked }))
                        }
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap justify-between gap-3 border-t pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleGeneratorBack}
                    disabled={generatorStep === 1 || isGeneratingCourse}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetGeneratorFlow}
                      disabled={isGeneratingCourse}
                    >
                      Reset
                    </Button>
                    {generatorStep < generatorStepCount ? (
                      <Button type="button" onClick={handleGeneratorNext} className="gap-2">
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button type="button" onClick={handleGenerateCourse} disabled={isGeneratingCourse} className="gap-2">
                        {isGeneratingCourse ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Build my course
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>What you will get</CardTitle>
                  <CardDescription>
                    A multi-stage syllabus, mini projects, resources, and an optional IDE sandbox.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li>• Module-by-module outline with estimated time</li>
                    <li>• Resource curation plus practice prompts</li>
                    <li>• Capstone project brief and deliverables</li>
                    <li>• YouTube recommendation embedded inline</li>
                    <li>• In-browser IDE for coding-focused tracks</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-muted/60">
                <CardHeader>
                  <CardTitle>Generator status</CardTitle>
                  <CardDescription>
                    {generatedCourse ? 'Updated with your latest answers.' : 'Waiting for your prompts.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><strong>Topic:</strong> {generatorAnswers.topic || '—'}</p>
                    <p><strong>Outcome:</strong> {generatorAnswers.outcome || '—'}</p>
                    <p><strong>Cadence:</strong> {generatorAnswers.timePerWeek}h / week • {generatorAnswers.durationWeeks} weeks</p>
                    <p><strong>Style:</strong> {selectedLearningStyleLabel}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {generatedCourse ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-2xl">{generatedCourse.title}</CardTitle>
                      <CardDescription>{generatedCourse.summary}</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{generatedCourse.weeklyCommitment}</Badge>
                      <Badge variant="outline">{generatedCourse.totalDuration}</Badge>
                      {generatedCourse.codingFocus && <Badge className="bg-primary/10 text-primary">Coding focus</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Audience</p>
                      <p className="font-medium">{generatedCourse.audience}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Delivery</p>
                      <p className="font-medium">{generatedCourse.deliveryStyle}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tools</p>
                      <p className="font-medium">
                        {generatedCourse.tools?.length
                          ? generatedCourse.tools.slice(0, 3).join(', ')
                          : 'Curated per module'}
                      </p>
                    </div>
                  </div>
                  {generatedCourse.studyTips?.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium">Study tips</p>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        {generatedCourse.studyTips.map((tip, index) => (
                          <Badge key={index} variant="secondary">
                            {tip}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                {(generatedCourse.modules ?? []).map((module) => (
                  <Card key={module.id} className="h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle>{module.title}</CardTitle>
                          <CardDescription>{module.description}</CardDescription>
                        </div>
                        <Badge variant="outline">{module.durationWeeks}w sprint</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <p className="font-medium">Focus</p>
                        <p className="text-muted-foreground">{module.focus}</p>
                      </div>
                      {module.learningObjectives.length > 0 && (
                        <div>
                          <p className="font-medium">Objectives</p>
                          <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                            {module.learningObjectives.map((objective, index) => (
                              <li key={index}>{objective}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {module.practiceIdeas.length > 0 && (
                        <div>
                          <p className="font-medium">Practice</p>
                          <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                            {module.practiceIdeas.map((idea, index) => (
                              <li key={index}>{idea}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {module.resources.length > 0 && (
                        <div>
                          <p className="font-medium">Resources</p>
                          <ul className="space-y-1 text-muted-foreground">
                            {module.resources.slice(0, 3).map((resource, index) => (
                              <li key={index}>
                                <span className="font-medium">{resource.type}:</span> {resource.title}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {module.includeMiniProject && <Badge variant="secondary">Mini project</Badge>}
                        {module.hasCodingLab && <Badge variant="secondary">Coding lab</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-primary" />
                    Capstone: {generatedCourse.capstone.title}
                  </CardTitle>
                  <CardDescription>{generatedCourse.capstone.brief}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-medium">Deliverables</p>
                      <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                        {generatedCourse.capstone.deliverables.map((deliverable, index) => (
                          <li key={index}>{deliverable}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium">Evaluation hints</p>
                      <p className="text-sm text-muted-foreground">{generatedCourse.capstone.evaluation}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                {generatedCourse.videoRecommendations?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Film className="h-5 w-5 text-primary" />
                        Recommended video
                      </CardTitle>
                      <CardDescription>
                        {generatedCourse.videoRecommendations[0]?.reason || 'Top pick aligned with this module sequence.'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(() => {
                        const primaryVideo = generatedCourse.videoRecommendations[0];
                        const embedUrl = getYouTubeEmbedUrl(primaryVideo?.url);
                        return (
                          <>
                            {embedUrl ? (
                              <div className="aspect-video overflow-hidden rounded-lg">
                                <iframe
                                  src={embedUrl}
                                  title={primaryVideo?.title}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  className="h-full w-full"
                                />
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                {primaryVideo?.title} ({primaryVideo?.duration})
                              </p>
                            )}
                            <div className="text-sm text-muted-foreground">
                              <p className="font-medium">{primaryVideo?.title}</p>
                              <p>{primaryVideo?.channel}</p>
                            </div>
                            <Button asChild variant="secondary" size="sm" className="gap-2">
                              <a href={primaryVideo?.url} target="_blank" rel="noreferrer">
                                <PlayCircle className="h-4 w-4" />
                                Watch on YouTube
                              </a>
                            </Button>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}

                {generatedCourse.codingFocus && generatedCourse.sampleIdeSnippet && (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Starter snippet ({generatedCourse.sampleIdeSnippet.language})</CardTitle>
                        <CardDescription>{generatedCourse.sampleIdeSnippet.instructions}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <pre className="rounded-lg bg-muted p-4 text-sm font-mono whitespace-pre-wrap">
                          {generatedCourse.sampleIdeSnippet.starter}
                        </pre>
                      </CardContent>
                    </Card>
                    <div>
                      <h3 className="mb-3 text-lg font-semibold">Interactive IDE</h3>
                      <IDE courseId={aiCourseId} moduleNumber={1} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Your plan will appear here
                </CardTitle>
                <CardDescription>
                  Complete the short questionnaire and we will stream your course outline below.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
