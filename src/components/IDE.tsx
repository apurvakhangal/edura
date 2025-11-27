import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import Editor from '@monaco-editor/react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Code,
  Terminal,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface IDEProps {
  courseId: string;
  moduleNumber: number;
}

type Judge0Response = {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: { id: number; description: string };
  time?: string | null;
  memory?: number | null;
};

const defaultSnippets: Record<string, string> = {
  javascript: `// JavaScript Starter Code
function greet(name) {
  console.log(
    \
Hello, \\\\${name}!\\\nWelcome to the Edura sandbox.\
  );
}

greet('Learner');`,
  python: `# Python Starter Code
def greet(name: str) -> None:
    print(f"Hello, {name}! Welcome to the Edura sandbox.")

greet("Learner")`,
  java: `// Java Starter Code
import java.util.*;

public class Main {
  public static void main(String[] args) {
    System.out.println("Hello from Edura IDE!");
  }
}`,
  c: `#include <stdio.h>

int main(void) {
  printf("Hello from Edura IDE!\\n");
  return 0;
}`,
};

const languageOptions = [
  { label: 'JavaScript (Node)', value: 'javascript', languageId: 63 },
  { label: 'Python 3', value: 'python', languageId: 71 },
  { label: 'Java', value: 'java', languageId: 62 },
  { label: 'C', value: 'c', languageId: 50 },
];

const statusStyles: Record<string, string> = {
  Accepted: 'bg-emerald-100 text-emerald-700',
  'Wrong Answer': 'bg-red-100 text-red-700',
  'Time Limit Exceeded': 'bg-yellow-100 text-yellow-700',
  'Compilation Error': 'bg-orange-100 text-orange-700',
  'Runtime Error (SIGSEGV)': 'bg-red-100 text-red-700',
};

export default function IDE({ courseId, moduleNumber }: IDEProps) {
  const { toast } = useToast();
  const defaultLanguage = useMemo(() => {
    if (courseId.includes('python')) return 'python';
    if (courseId.includes('java')) return 'java';
    if (courseId.includes('c')) return 'c';
    return 'javascript';
  }, [courseId]);

  const [language, setLanguage] = useState(defaultLanguage);
  const [code, setCode] = useState(defaultSnippets[defaultLanguage] || defaultSnippets.javascript);
  const [customInput, setCustomInput] = useState('');
  const [output, setOutput] = useState<Judge0Response | null>(null);
  const [stdoutPreview, setStdoutPreview] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);

  const judgeBaseUrl = import.meta.env.VITE_JUDGE0_URL || 'http://localhost:2358';
  const judgeApiKey = import.meta.env.VITE_JUDGE0_KEY;
  const judgeApiHost = import.meta.env.VITE_JUDGE0_HOST;

  const selectedLanguage = languageOptions.find((option) => option.value === language) || languageOptions[0];

  const handleReset = () => {
    setCode(defaultSnippets[language] || defaultSnippets.javascript);
    setCustomInput('');
    setOutput(null);
    setStdoutPreview('');
    setError(null);
  };

  const handleRun = async () => {
    if (!code.trim()) {
      toast({
        title: 'Write code first',
        description: 'Add some instructions before executing.',
        variant: 'destructive',
      });
      return;
    }

    setIsRunning(true);
    setError(null);
    setOutput(null);
    setStdoutPreview('');

    try {
      const payload = {
        source_code: code,
        language_id: selectedLanguage.languageId,
        stdin: customInput,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (judgeApiKey) {
        headers['X-RapidAPI-Key'] = judgeApiKey;
      }
      if (judgeApiHost) {
        headers['X-RapidAPI-Host'] = judgeApiHost;
      }

      const response = await fetch(`${judgeBaseUrl.replace(/\/$/, '')}/submissions?base64_encoded=false&wait=true`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to reach execution sandbox. Confirm Judge0 is running.');
      }

      const data: Judge0Response = await response.json();
      setExecutionId(String(Date.now()));
      setOutput(data);
      setStdoutPreview((data.stdout || data.stderr || data.compile_output || '').trim());

      const status = data.status?.description || 'Execution completed';
      const isSuccess = data.status?.id === 3;

      toast({
        title: status,
        description: isSuccess ? 'Code executed successfully.' : 'Check the output panel for details.',
        variant: isSuccess ? 'default' : 'destructive',
      });
    } catch (err: any) {
      console.error('IDE execution error:', err);
      setError(err.message || 'Failed to run code');
      toast({
        title: 'Execution failed',
        description: err.message || 'Could not execute your code. Verify the sandbox service.',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const statusDescription = output?.status?.description || 'Ready';
  const statusBadgeClass = statusStyles[statusDescription] || 'bg-slate-100 text-slate-700';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Interactive IDE
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-md border bg-background px-3 py-1 text-sm"
                value={language}
                onChange={(e) => {
                  const nextLang = e.target.value;
                  setLanguage(nextLang);
                  setCode(defaultSnippets[nextLang] || defaultSnippets.javascript);
                }}
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button onClick={handleRun} size="sm" disabled={isRunning}>
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Code
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            <Editor
              height="380px"
              defaultLanguage={language}
              language={language}
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Input (stdin)</label>
            <Input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Provide input if your program expects stdin..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Execution Output
            </CardTitle>
            <div className="flex items-center gap-2 text-sm">
              <Badge className={statusBadgeClass}>{statusDescription}</Badge>
              {executionId && <span className="text-muted-foreground text-xs">Session {executionId}</span>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Execution error</p>
                <p>{error}</p>
              </div>
            </div>
          ) : output ? (
            <div className="space-y-4 text-sm font-mono">
              {output.stdout && (
                <div>
                  <p className="mb-1 font-semibold text-emerald-600">stdout</p>
                  <pre className="rounded-lg bg-muted p-3 text-emerald-900 whitespace-pre-wrap">
                    {output.stdout}
                  </pre>
                </div>
              )}
              {output.stderr && (
                <div>
                  <p className="mb-1 font-semibold text-red-600">stderr</p>
                  <pre className="rounded-lg bg-muted p-3 text-red-900 whitespace-pre-wrap">
                    {output.stderr}
                  </pre>
                </div>
              )}
              {output.compile_output && (
                <div>
                  <p className="mb-1 font-semibold text-orange-600">Compiler output</p>
                  <pre className="rounded-lg bg-muted p-3 text-orange-900 whitespace-pre-wrap">
                    {output.compile_output}
                  </pre>
                </div>
              )}
              {!stdoutPreview && (
                <p className="text-muted-foreground">No output yet. Write code and run to see results.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No output yet. Run your code to see results here.</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Sandbox details:</p>
          <p>• Each run executes inside Judge0, an isolated Docker sandbox.</p>
          <p>• Support for 60+ languages. Extend `languageOptions` to enable more IDs.</p>
          <p>• Need remote execution? Point `VITE_JUDGE0_URL` to your hosted API.</p>
          <p>• For best security, keep Judge0 on a private network or behind auth.</p>
        </CardContent>
      </Card>
    </div>
  );
}

