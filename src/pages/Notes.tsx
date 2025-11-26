import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { generateSummary, generateFlashcards, generateQuiz } from '@/lib/gemini';
import { extractTextFromFile, createNote } from '@/services/notesService';
import { getCurrentUserId } from '@/lib/auth';
import { TranslatedText } from '@/components/TranslatedText';
import { useTranslatedText } from '@/hooks/useTranslation';
import { Upload, FileText, Sparkles, Download, Loader2 } from 'lucide-react';

interface Flashcard {
  question: string;
  answer: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export default function Notes() {
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsProcessing(true);

    try {
      // Extract text from file
      const extractedText = await extractTextFromFile(uploadedFile);
      setContent(extractedText);

      // Auto-generate summary
      setIsGeneratingSummary(true);
      const summaryResult = await generateSummary(extractedText);
      setSummary(summaryResult);
      setIsGeneratingSummary(false);

      // Save note to database if user is logged in
      const userId = await getCurrentUserId();
      if (userId) {
        await createNote(userId, uploadedFile.name, extractedText);
      }

      toast({
        title: 'File processed',
        description: 'Your file has been uploaded and processed successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error processing file',
        description: error.message || 'Failed to process file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setIsGeneratingSummary(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!content) {
      toast({
        title: 'No content',
        description: 'Please upload a file first.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingFlashcards(true);
    try {
      const generatedFlashcards = await generateFlashcards(content);
      setFlashcards(generatedFlashcards);
      toast({
        title: 'Flashcards generated',
        description: `Generated ${generatedFlashcards.length} flashcards.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate flashcards.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!content) {
      toast({
        title: 'No content',
        description: 'Please upload a file first.',
        variant: 'destructive',
      });
      return;
    }

    if (quiz.length > 0) {
      toast({
        title: 'Quiz already generated',
        description: 'You can only generate one quiz at a time.',
        variant: 'warning',
      });
      return;
    }

    setIsGeneratingQuiz(true);
    try {
      const generatedQuiz = await generateQuiz(content);
      setQuiz(generatedQuiz);
      toast({
        title: 'Quiz generated',
        description: `Generated ${generatedQuiz.length} quiz questions.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate quiz.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [attemptedQuestions, setAttemptedQuestions] = useState<number[]>([]);
  const [quizReport, setQuizReport] = useState(null);

  const handleAnswerSelection = (index: number) => {
    setSelectedAnswer(index);
    setShowExplanation(true);
    if (!attemptedQuestions.includes(currentQuestionIndex)) {
      setAttemptedQuestions((prev) => [...prev, currentQuestionIndex]);
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setCurrentQuestionIndex((prev) => Math.min(prev + 1, quiz.length - 1));
  };

  const handlePreviousQuestion = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmitQuiz = () => {
    const correctAnswers = attemptedQuestions.filter(
      (index) => quiz[index].correctAnswer === selectedAnswer
    ).length;
    const totalQuestions = quiz.length;
    const wrongAnswers = totalQuestions - correctAnswers;

    setQuizReport({
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      attemptedQuestions: attemptedQuestions.length,
    });
  };

  const handleRetakeQuiz = () => {
    setQuizReport(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setAttemptedQuestions([]);
  };

  const renderQuestionNavigation = () => (
    <div className="flex space-x-2">
      {quiz.map((_, index) => (
        <span
          key={index}
          className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer ${
            index === currentQuestionIndex
              ? 'bg-primary text-white'
              : attemptedQuestions.includes(index)
              ? 'bg-success/20 text-success'
              : 'bg-muted text-muted-foreground'
          }`}
          onClick={() => setCurrentQuestionIndex(index)}
        >
          {index + 1}
        </span>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold"><TranslatedText text="Smart Notes" /></h1>
        </div>
      </motion.div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload"><TranslatedText text="Upload" /></TabsTrigger>
          <TabsTrigger value="summary"><TranslatedText text="Summary" /></TabsTrigger>
          <TabsTrigger value="flashcards"><TranslatedText text="Flashcards" /></TabsTrigger>
          <TabsTrigger value="quiz"><TranslatedText text="Quiz" /></TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle><TranslatedText text="Upload Your Notes" /></CardTitle>
              <CardDescription>
                <TranslatedText text="Upload PDFs, images, or documents. We'll extract and process the content." />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12 text-center">
                <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 font-semibold"><TranslatedText text="Upload your file" /></h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  <TranslatedText text="PDF, DOC, DOCX, JPG, PNG up to 20MB" />
                </p>
                <label htmlFor="file-upload">
                  <Button asChild>
                    <span><TranslatedText text="Choose File" /></span>
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                  />
                </label>
                {file && (
                  <div className="mt-4">
                    <p className="text-sm text-success">
                      ✓ {file.name} uploaded successfully
                    </p>
                    {isProcessing && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <TranslatedText text="Processing file..." />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle><TranslatedText text="AI-Generated Summary" /></CardTitle>
                  <CardDescription><TranslatedText text="Key points and main concepts from your notes" /></CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  <TranslatedText text="Export" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isGeneratingSummary ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground"><TranslatedText text="Generating summary with AI..." /></p>
                </div>
              ) : summary ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans">{summary}</pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Sparkles className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    <TranslatedText text="Upload a file to generate a summary" />
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flashcards Tab */}
        <TabsContent value="flashcards">
          <Card>
            <CardHeader>
              <CardTitle><TranslatedText text="AI-Generated Flashcards" /></CardTitle>
              <CardDescription><TranslatedText text="Review key concepts with interactive flashcards" /></CardDescription>
            </CardHeader>
            <CardContent>
              {flashcards.length > 0 ? (
                <div className="space-y-4">
                  {flashcards.map((flashcard, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="mb-2 font-semibold">Q: <TranslatedText text={flashcard.question} /></div>
                        <div className="text-sm text-muted-foreground">
                          A: <TranslatedText text={flashcard.answer} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground">
                    <TranslatedText text={content ? "Click the button to generate flashcards from your notes" : "Upload a file first to generate flashcards"} />
                  </p>
                  <Button
                    className="mt-4"
                    disabled={!content || isGeneratingFlashcards}
                    onClick={handleGenerateFlashcards}
                  >
                    {isGeneratingFlashcards ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <TranslatedText text="Generating..." />
                      </>
                    ) : (
                      <TranslatedText text="Generate Flashcards" />
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quiz Tab */}
        <TabsContent value="quiz">
          {quiz.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle><TranslatedText text="AI-Generated Quiz" /></CardTitle>
                <CardDescription><TranslatedText text="Test your knowledge with adaptive quizzes" /></CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground">
                    <TranslatedText text={content ? "Click the button to generate a quiz from your notes" : "Upload a file first to generate a quiz"} />
                  </p>
                  <Button
                    className="mt-4"
                    disabled={!content || isGeneratingQuiz}
                    onClick={handleGenerateQuiz}
                  >
                    {isGeneratingQuiz ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <TranslatedText text="Generating..." />
                      </>
                    ) : (
                      <TranslatedText text="Generate Quiz" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {quiz.length > 0 && (
            <div>
              <div className="mb-6 flex justify-between items-center">
                <p className="text-lg font-semibold">Total Questions: {quiz.length}</p>
                {renderQuestionNavigation()}
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Question {currentQuestionIndex + 1}</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="mb-6 text-lg font-semibold">{quiz[currentQuestionIndex].question}</p>
                  <ul className="space-y-4">
                    {quiz[currentQuestionIndex].options.map((option, index) => (
                      <li key={index}>
                        <Button
                          className="w-full text-left py-3 px-4"
                          variant={selectedAnswer === index ? 'secondary' : 'default'}
                          onClick={() => handleAnswerSelection(index)}
                          disabled={showExplanation}
                        >
                          {option}
                        </Button>
                      </li>
                    ))}
                  </ul>
                  {showExplanation && (
                    <div className="mt-6">
                      {selectedAnswer === quiz[currentQuestionIndex].correctAnswer ? (
                        <p className="text-green-500 text-lg">Correct!</p>
                      ) : (
                        <p className="text-red-500 text-lg">
                          Incorrect. Correct answer: {quiz[currentQuestionIndex].options[quiz[currentQuestionIndex].correctAnswer]}
                        </p>
                      )}
                      <p className="mt-4 text-base">{quiz[currentQuestionIndex].explanation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <div className="flex justify-between mt-8">
                <Button className="px-6 py-3" onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0}>
                  Previous
                </Button>
                {currentQuestionIndex === quiz.length - 1 ? (
                  <Button className="px-6 py-3" onClick={handleSubmitQuiz}>
                    Submit
                  </Button>
                ) : (
                  <Button className="px-6 py-3" onClick={handleNextQuestion}>
                    Next
                  </Button>
                )}
              </div>
            </div>
          )}
          {quizReport && (
            <div className="mt-12">
              <Card>
                <CardHeader>
                  <CardTitle>Quiz Report</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-lg font-semibold">Total Questions: {quizReport.totalQuestions}</p>
                  <p className="text-lg text-green-500">Correct Answers: {quizReport.correctAnswers}</p>
                  <p className="text-lg text-red-500">Wrong Answers: {quizReport.wrongAnswers}</p>
                  <p className="text-lg">Attempted Questions: {quizReport.attemptedQuestions}</p>
                  <Button className="mt-6 px-6 py-3" onClick={handleRetakeQuiz}>
                    Retake Quiz
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
