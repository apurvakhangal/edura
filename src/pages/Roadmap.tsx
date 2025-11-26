import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createRoadmap, createDetailedRoadmap } from '@/services/roadmapService';
import { getAvailableRoadmaps, getRoadmapsByCategory, searchRoadmaps, type RoadmapItem } from '@/services/roadmapShService';
import { getCurrentUserId } from '@/lib/auth';
import { TranslatedText } from '@/components/TranslatedText';
import { useTranslatedText } from '@/hooks/useTranslation';
import { type DetailedRoadmap } from '@/lib/gemini';
import { Target, CheckCircle2, Circle, Clock, Loader2, Search, ExternalLink, Sparkles, ArrowRight, ArrowLeft, BookOpen, Video, FileText, Link as LinkIcon, CheckCircle } from 'lucide-react';

interface Milestone {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedHours: number;
  completed: boolean;
}

export default function Roadmap() {
  const [activeTab, setActiveTab] = useState<'available' | 'custom'>('available');
  const [goal, setGoal] = useState('');
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [roadmapData, setRoadmapData] = useState<Milestone[]>([]);
  const [availableRoadmaps, setAvailableRoadmaps] = useState<RoadmapItem[]>([]);
  const [filteredRoadmaps, setFilteredRoadmaps] = useState<RoadmapItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'role' | 'skill' | 'beginner'>('all');
  const [isLoadingRoadmaps, setIsLoadingRoadmaps] = useState(true);
  
  // Questionnaire state
  const [questionStep, setQuestionStep] = useState(1);
  const [questionnaire, setQuestionnaire] = useState({
    topic: '',
    skillLevel: '' as 'beginner' | 'intermediate' | 'advanced' | '',
    duration: '',
    durationUnit: 'weeks' as 'days' | 'weeks' | 'months',
    hoursPerDay: '',
    hoursPerWeek: '',
  });
  const [detailedRoadmap, setDetailedRoadmap] = useState<DetailedRoadmap | null>(null);
  
  const { toast } = useToast();

  const completedCount = roadmapData.filter((m) => m.completed).length;
  const progressPercentage = roadmapData.length > 0 ? (completedCount / roadmapData.length) * 100 : 0;

  const difficultyColors = {
    easy: 'bg-success text-success-foreground',
    medium: 'bg-accent text-accent-foreground',
    hard: 'bg-destructive text-destructive-foreground',
  };

  const categoryColors = {
    role: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    skill: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    beginner: 'bg-green-500/10 text-green-600 dark:text-green-400',
  };

  const difficultyBadgeColors = {
    beginner: 'bg-green-500/10 text-green-600 dark:text-green-400',
    intermediate: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    advanced: 'bg-red-500/10 text-red-600 dark:text-red-400',
  };

  // Translation texts
  const goalRequiredText = useTranslatedText('Goal required');
  const pleaseEnterGoalText = useTranslatedText('Please enter a learning goal.');
  const mustBeLoggedInText = useTranslatedText('You must be logged in to generate a roadmap');
  const failedToGenerateText = useTranslatedText('Failed to generate roadmap');
  const roadmapGeneratedText = useTranslatedText('Roadmap generated!');
  const roadmapReadyText = useTranslatedText('Your personalized learning roadmap is ready.');
  const errorText = useTranslatedText('Error');
  const failedToGenerateTryAgainText = useTranslatedText('Failed to generate roadmap. Please try again.');
  const placeholderText = useTranslatedText("e.g., Master React and build web applications");
  const searchPlaceholderText = useTranslatedText('Search roadmaps...');

  // Load available roadmaps
  useEffect(() => {
    const loadRoadmaps = async () => {
      setIsLoadingRoadmaps(true);
      try {
        const roadmaps = await getAvailableRoadmaps();
        setAvailableRoadmaps(roadmaps);
        setFilteredRoadmaps(roadmaps);
      } catch (error) {
        console.error('Error loading roadmaps:', error);
        toast({
          title: errorText,
          description: 'Failed to load available roadmaps',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingRoadmaps(false);
      }
    };
    loadRoadmaps();
  }, []);

  // Filter roadmaps based on category and search
  useEffect(() => {
    const filterRoadmaps = async () => {
      let filtered = selectedCategory === 'all' 
        ? availableRoadmaps 
        : await getRoadmapsByCategory(selectedCategory);
      
      if (searchQuery.trim()) {
        filtered = await searchRoadmaps(searchQuery);
        // Also filter by category if not 'all'
        if (selectedCategory !== 'all') {
          filtered = filtered.filter((r) => r.category === selectedCategory);
        }
      }
      
      setFilteredRoadmaps(filtered);
    };
    
    filterRoadmaps();
  }, [searchQuery, selectedCategory, availableRoadmaps]);

  const generateRoadmap = async () => {
    if (!goal.trim()) {
      toast({
        title: goalRequiredText,
        description: pleaseEnterGoalText,
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error(mustBeLoggedInText);
      }

      const { roadmap, error } = await createRoadmap(userId, goal);
      
      if (error) throw new Error(error);
      if (!roadmap) throw new Error(failedToGenerateText);

      setRoadmapData(roadmap.milestones as Milestone[]);
      setShowRoadmap(true);
      setActiveTab('custom');
      
      toast({
        title: roadmapGeneratedText,
        description: roadmapReadyText,
      });
    } catch (error: any) {
      toast({
        title: errorText,
        description: error.message || failedToGenerateTryAgainText,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuestionnaireNext = () => {
    if (questionStep === 1 && !questionnaire.topic.trim()) {
      toast({
        title: errorText,
        description: 'Please enter a skill or topic',
        variant: 'destructive',
      });
      return;
    }
    if (questionStep === 2 && !questionnaire.skillLevel) {
      toast({
        title: errorText,
        description: 'Please select your skill level',
        variant: 'destructive',
      });
      return;
    }
    if (questionStep === 3 && (!questionnaire.duration || parseInt(questionnaire.duration) <= 0)) {
      toast({
        title: errorText,
        description: 'Please enter a valid duration',
        variant: 'destructive',
      });
      return;
    }
    if (questionStep === 4) {
      const hasHoursPerDay = questionnaire.hoursPerDay && parseInt(questionnaire.hoursPerDay) > 0;
      const hasHoursPerWeek = questionnaire.hoursPerWeek && parseInt(questionnaire.hoursPerWeek) > 0;
      if (!hasHoursPerDay && !hasHoursPerWeek) {
        toast({
          title: errorText,
          description: 'Please enter hours per day or per week',
          variant: 'destructive',
        });
        return;
      }
    }
    setQuestionStep(questionStep + 1);
  };

  const handleQuestionnaireBack = () => {
    if (questionStep > 1) {
      setQuestionStep(questionStep - 1);
    }
  };

  const generateDetailedRoadmapFromQuestionnaire = async () => {
    setIsGenerating(true);
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error(mustBeLoggedInText);
      }

      const roadmapQuestionnaire = {
        topic: questionnaire.topic,
        skillLevel: questionnaire.skillLevel as 'beginner' | 'intermediate' | 'advanced',
        duration: parseInt(questionnaire.duration),
        durationUnit: questionnaire.durationUnit,
        hoursPerDay: questionnaire.hoursPerDay ? parseInt(questionnaire.hoursPerDay) : undefined,
        hoursPerWeek: questionnaire.hoursPerWeek ? parseInt(questionnaire.hoursPerWeek) : undefined,
      };

      const { detailedRoadmap: generatedRoadmap, error } = await createDetailedRoadmap(userId, roadmapQuestionnaire);
      
      if (error) throw new Error(error);
      if (!generatedRoadmap) throw new Error(failedToGenerateText);

      setDetailedRoadmap(generatedRoadmap);
      setRoadmapData(generatedRoadmap.stages.map((stage) => ({
        id: stage.id,
        title: stage.title,
        description: stage.description,
        difficulty: stage.difficulty,
        estimatedHours: stage.estimatedHours,
        completed: stage.completed,
      })));
      setShowRoadmap(true);
      setQuestionStep(0); // Hide questionnaire
      
      toast({
        title: roadmapGeneratedText,
        description: roadmapReadyText,
      });
    } catch (error: any) {
      toast({
        title: errorText,
        description: error.message || failedToGenerateTryAgainText,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetQuestionnaire = () => {
    setQuestionStep(1);
    setQuestionnaire({
      topic: '',
      skillLevel: '',
      duration: '',
      durationUnit: 'weeks',
      hoursPerDay: '',
      hoursPerWeek: '',
    });
    setDetailedRoadmap(null);
    setShowRoadmap(false);
  };

  const handleViewRoadmap = (roadmap: RoadmapItem) => {
    window.open(roadmap.url, '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex items-center gap-3">
          <Target className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold"><TranslatedText text="Learning Roadmaps" /></h1>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'available' | 'custom')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="available">
            <TranslatedText text="Available Roadmaps" />
          </TabsTrigger>
          <TabsTrigger value="custom">
            <TranslatedText text="Generate Custom" />
          </TabsTrigger>
        </TabsList>

        {/* Available Roadmaps Tab */}
        <TabsContent value="available" className="mt-6">
          {/* Search and Filter */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={searchPlaceholderText}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedCategory === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('all')}
                  >
                    <TranslatedText text="All" />
                  </Button>
                  <Button
                    variant={selectedCategory === 'role' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('role')}
                  >
                    <TranslatedText text="Role Based" />
                  </Button>
                  <Button
                    variant={selectedCategory === 'skill' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('skill')}
                  >
                    <TranslatedText text="Skill Based" />
                  </Button>
                  <Button
                    variant={selectedCategory === 'beginner' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('beginner')}
                  >
                    <TranslatedText text="Beginner" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Roadmaps Grid */}
          {isLoadingRoadmaps ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredRoadmaps.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">
                  <TranslatedText text="No roadmaps found. Try a different search or category." />
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRoadmaps.map((roadmap, index) => (
                <motion.div
                  key={roadmap.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="flex h-full flex-col transition-all hover:shadow-lg">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="mb-2">{roadmap.title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {roadmap.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge className={categoryColors[roadmap.category]}>
                          <TranslatedText text={roadmap.category} />
                        </Badge>
                        <Badge className={difficultyBadgeColors[roadmap.difficulty]}>
                          <TranslatedText text={roadmap.difficulty} />
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {roadmap.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {roadmap.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{roadmap.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                      <Button
                        className="mt-auto"
                        variant="outline"
                        onClick={() => handleViewRoadmap(roadmap)}
                      >
                        <TranslatedText text="View Roadmap" />
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Custom Roadmap Generation Tab */}
        <TabsContent value="custom" className="mt-6">
          {questionStep > 0 && !showRoadmap ? (
            /* Questionnaire Steps */
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <TranslatedText text="Generate Custom Roadmap" />
                </CardTitle>
                <CardDescription>
                  <TranslatedText text="Answer a few questions to get a personalized learning roadmap" />
                </CardDescription>
                <div className="mt-4">
                  <Progress value={(questionStep / 5) * 100} className="h-2" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Step {questionStep} of 5
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  {/* Step 1: Topic */}
                  {questionStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div>
                        <Label htmlFor="topic" className="text-base font-semibold">
                          <TranslatedText text="What skill or topic do you want to learn?" />
                        </Label>
                        <Input
                          id="topic"
                          placeholder={placeholderText}
                          value={questionnaire.topic}
                          onChange={(e) => setQuestionnaire({ ...questionnaire, topic: e.target.value })}
                          onKeyPress={(e) => e.key === 'Enter' && handleQuestionnaireNext()}
                          className="mt-2"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Skill Level */}
                  {questionStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div>
                        <Label className="text-base font-semibold">
                          <TranslatedText text="What is your current skill level?" />
                        </Label>
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                            <Button
                              key={level}
                              variant={questionnaire.skillLevel === level ? 'default' : 'outline'}
                              className="h-auto flex-col gap-2 py-6"
                              onClick={() => setQuestionnaire({ ...questionnaire, skillLevel: level })}
                            >
                              <span className="text-lg font-semibold capitalize">
                                <TranslatedText text={level} />
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {level === 'beginner' && <TranslatedText text="Starting from basics" />}
                                {level === 'intermediate' && <TranslatedText text="Some experience" />}
                                {level === 'advanced' && <TranslatedText text="Looking to master" />}
                              </span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Duration */}
                  {questionStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div>
                        <Label className="text-base font-semibold">
                          <TranslatedText text="In how much time do you want to complete this course?" />
                        </Label>
                        <div className="mt-4 flex gap-4">
                          <Input
                            type="number"
                            min="1"
                            placeholder="e.g., 4"
                            value={questionnaire.duration}
                            onChange={(e) => setQuestionnaire({ ...questionnaire, duration: e.target.value })}
                            className="flex-1"
                          />
                          <Select
                            value={questionnaire.durationUnit}
                            onValueChange={(value: 'days' | 'weeks' | 'months') =>
                              setQuestionnaire({ ...questionnaire, durationUnit: value })
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="days"><TranslatedText text="Days" /></SelectItem>
                              <SelectItem value="weeks"><TranslatedText text="Weeks" /></SelectItem>
                              <SelectItem value="months"><TranslatedText text="Months" /></SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4: Time Commitment */}
                  {questionStep === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div>
                        <Label className="text-base font-semibold">
                          <TranslatedText text="How many hours per day or per week can you commit?" />
                        </Label>
                        <div className="mt-4 space-y-4">
                          <div className="flex items-center gap-4">
                            <Label htmlFor="hoursPerDay" className="w-32">
                              <TranslatedText text="Hours per day:" />
                            </Label>
                            <Input
                              id="hoursPerDay"
                              type="number"
                              min="0"
                              max="24"
                              placeholder="e.g., 2"
                              value={questionnaire.hoursPerDay}
                              onChange={(e) => setQuestionnaire({ ...questionnaire, hoursPerDay: e.target.value, hoursPerWeek: '' })}
                              className="flex-1"
                            />
                          </div>
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-background px-2 text-muted-foreground">
                                <TranslatedText text="OR" />
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Label htmlFor="hoursPerWeek" className="w-32">
                              <TranslatedText text="Hours per week:" />
                            </Label>
                            <Input
                              id="hoursPerWeek"
                              type="number"
                              min="0"
                              max="168"
                              placeholder="e.g., 10"
                              value={questionnaire.hoursPerWeek}
                              onChange={(e) => setQuestionnaire({ ...questionnaire, hoursPerWeek: e.target.value, hoursPerDay: '' })}
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 5: Review & Generate */}
                  {questionStep === 5 && (
                    <motion.div
                      key="step5"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div>
                        <Label className="text-base font-semibold">
                          <TranslatedText text="Review your answers" />
                        </Label>
                        <Card className="mt-4">
                          <CardContent className="pt-6">
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground"><TranslatedText text="Topic:" /></span>
                                <span className="font-medium">{questionnaire.topic}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground"><TranslatedText text="Skill Level:" /></span>
                                <span className="font-medium capitalize"><TranslatedText text={questionnaire.skillLevel} /></span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground"><TranslatedText text="Duration:" /></span>
                                <span className="font-medium">
                                  {questionnaire.duration} <TranslatedText text={questionnaire.durationUnit} />
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground"><TranslatedText text="Time Commitment:" /></span>
                                <span className="font-medium">
                                  {questionnaire.hoursPerDay
                                    ? `${questionnaire.hoursPerDay} hours/day`
                                    : questionnaire.hoursPerWeek
                                    ? `${questionnaire.hoursPerWeek} hours/week`
                                    : 'Not specified'}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Button
                          onClick={generateDetailedRoadmapFromQuestionnaire}
                          disabled={isGenerating}
                          className="mt-6 w-full"
                          size="lg"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              <TranslatedText text="Generating Roadmap..." />
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              <TranslatedText text="Generate My Roadmap" />
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="mt-6 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={handleQuestionnaireBack}
                    disabled={questionStep === 1}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    <TranslatedText text="Back" />
                  </Button>
                  {questionStep < 5 && (
                    <Button onClick={handleQuestionnaireNext}>
                      <TranslatedText text="Next" />
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : showRoadmap && detailedRoadmap ? (
            /* Detailed Roadmap Display */
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl">{detailedRoadmap.title}</CardTitle>
                      <CardDescription className="mt-2">
                        <div className="grid gap-2 md:grid-cols-2">
                          <div><TranslatedText text="Skill:" /> {detailedRoadmap.userSummary.skill}</div>
                          <div><TranslatedText text="Level:" /> <span className="capitalize">{detailedRoadmap.userSummary.level}</span></div>
                          <div><TranslatedText text="Timeline:" /> {detailedRoadmap.userSummary.timeline}</div>
                          <div><TranslatedText text="Commitment:" /> {detailedRoadmap.userSummary.commitment}</div>
                        </div>
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={resetQuestionnaire}>
                      <TranslatedText text="Create New" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle><TranslatedText text="Your Progress" /></CardTitle>
                  <CardDescription>
                    {completedCount} <TranslatedText text="of" /> {roadmapData.length} <TranslatedText text="stages completed" />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={progressPercentage} className="mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {Math.round(progressPercentage)}% <TranslatedText text="complete" />
                  </p>
                </CardContent>
              </Card>

              {/* Stages */}
              <div className="space-y-4">
                {detailedRoadmap.stages.map((stage, index) => (
                  <motion.div
                    key={stage.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={`transition-all ${stage.completed ? 'border-success' : ''}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{stage.stage}</Badge>
                              <Badge className={difficultyColors[stage.difficulty]}>
                                <TranslatedText text={stage.difficulty} />
                              </Badge>
                              <Badge variant="outline" className="gap-1">
                                <Clock className="h-3 w-3" />
                                {stage.estimatedHours}h
                              </Badge>
                            </div>
                            <CardTitle className="text-xl">{stage.title}</CardTitle>
                            <CardDescription className="mt-2">{stage.description}</CardDescription>
                          </div>
                          <Button
                            variant={stage.completed ? 'outline' : 'default'}
                            size="sm"
                            onClick={() => {
                              const updatedStages = detailedRoadmap.stages.map((s) =>
                                s.id === stage.id ? { ...s, completed: !s.completed } : s
                              );
                              setDetailedRoadmap({ ...detailedRoadmap, stages: updatedStages });
                              setRoadmapData(updatedStages.map((s) => ({
                                id: s.id,
                                title: s.title,
                                description: s.description,
                                difficulty: s.difficulty,
                                estimatedHours: s.estimatedHours,
                                completed: s.completed,
                              })));
                            }}
                          >
                            {stage.completed ? <CheckCircle className="mr-2 h-4 w-4" /> : <Circle className="mr-2 h-4 w-4" />}
                            {stage.completed ? <TranslatedText text="Completed" /> : <TranslatedText text="Mark Complete" />}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Topics */}
                        {stage.topics.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              <TranslatedText text="Topics to Learn" />
                            </h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                              {stage.topics.map((topic, i) => (
                                <li key={i}>{topic}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Exercises */}
                        {stage.exercises.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2"><TranslatedText text="Exercises" /></h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                              {stage.exercises.map((exercise, i) => (
                                <li key={i}>{exercise}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Projects */}
                        {stage.projects && stage.projects.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2"><TranslatedText text="Projects" /></h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                              {stage.projects.map((project, i) => (
                                <li key={i}>{project}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Resources */}
                        {stage.resources.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <LinkIcon className="h-4 w-4" />
                              <TranslatedText text="Resources" />
                            </h4>
                            <div className="grid gap-2 md:grid-cols-2">
                              {stage.resources.map((resource, i) => (
                                <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                                  {resource.type === 'video' && <Video className="h-4 w-4 mt-0.5 text-primary" />}
                                  {resource.type === 'documentation' && <FileText className="h-4 w-4 mt-0.5 text-primary" />}
                                  {resource.type === 'practice' && <BookOpen className="h-4 w-4 mt-0.5 text-primary" />}
                                  {resource.type === 'article' && <FileText className="h-4 w-4 mt-0.5 text-primary" />}
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{resource.title}</div>
                                    {resource.description && (
                                      <div className="text-xs text-muted-foreground">{resource.description}</div>
                                    )}
                                    {resource.url && (
                                      <a
                                        href={resource.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                                      >
                                        <TranslatedText text="Visit" /> <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Final Project */}
              {detailedRoadmap.finalProject && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      <TranslatedText text="Final Project" />
                    </CardTitle>
                    <CardDescription>{detailedRoadmap.finalProject.title}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p>{detailedRoadmap.finalProject.description}</p>
                    {detailedRoadmap.finalProject.requirements.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2"><TranslatedText text="Requirements" /></h4>
                        <ul className="list-disc list-inside space-y-1 text-sm ml-6">
                          {detailedRoadmap.finalProject.requirements.map((req, i) => (
                            <li key={i}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <Badge className={difficultyColors[detailedRoadmap.finalProject.complexity]}>
                      <TranslatedText text={detailedRoadmap.finalProject.complexity} /> <TranslatedText text="Complexity" />
                    </Badge>
                  </CardContent>
                </Card>
              )}

              {/* Resource List */}
              {detailedRoadmap.resourceList && detailedRoadmap.resourceList.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle><TranslatedText text="Additional Resources" /></CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {detailedRoadmap.resourceList.map((category, i) => (
                        <div key={i}>
                          <h4 className="font-semibold mb-3">{category.category}</h4>
                          <div className="space-y-2">
                            {category.items.map((item, j) => (
                              <div key={j} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50">
                                <LinkIcon className="h-4 w-4 mt-0.5 text-primary" />
                                <div className="flex-1">
                                  <div className="font-medium">{item.title}</div>
                                  <div className="text-sm text-muted-foreground">{item.description}</div>
                                  {item.url && (
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                                    >
                                      <TranslatedText text="Visit" /> <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : null}

          {/* Generated Roadmap Display */}
          {showRoadmap && (
            <>
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle><TranslatedText text="Your Progress" /></CardTitle>
                  <CardDescription>
                    {completedCount} <TranslatedText text="of" /> {roadmapData.length} <TranslatedText text="milestones completed" />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={progressPercentage} className="mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {Math.round(progressPercentage)}% <TranslatedText text="complete" />
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {roadmapData.length === 0 && showRoadmap && (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <TranslatedText text='No roadmap generated yet. Enter a goal and click "Generate Roadmap".' />
                    </CardContent>
                  </Card>
                )}
                {roadmapData.map((milestone, index) => (
                  <motion.div
                    key={milestone.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card
                      className={`transition-all ${
                        milestone.completed ? 'border-success' : ''
                      }`}
                    >
                      <CardContent className="flex items-start gap-4 p-6">
                        <div className="mt-1">
                          {milestone.completed ? (
                            <CheckCircle2 className="h-6 w-6 text-success" />
                          ) : (
                            <Circle className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="mb-2 flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-semibold"><TranslatedText text={milestone.title} /></h3>
                              <p className="text-sm text-muted-foreground">
                                <TranslatedText text={milestone.description} />
                              </p>
                            </div>
                            <Button
                              variant={milestone.completed ? 'outline' : 'default'}
                              size="sm"
                            >
                              {milestone.completed ? <TranslatedText text="Review" /> : <TranslatedText text="Start" />}
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={difficultyColors[milestone.difficulty]}>
                              <TranslatedText text={milestone.difficulty} />
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                              <Clock className="h-3 w-3" />
                              {milestone.estimatedHours}h
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
