import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getPublishedCourses,
  getUserCourses,
  getExternalCourses,
  type Course,
  type ExternalCourse,
} from '@/services/courseService';

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

  const { toast } = useToast();
  const navigate = useNavigate();

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
