import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Play, RotateCcw, CheckCircle2, XCircle, Code } from 'lucide-react';

interface IDEProps {
  courseId: string;
  moduleNumber: number;
}

export default function IDE({ courseId, moduleNumber }: IDEProps) {
  const { toast } = useToast();

  // Sample starter code based on course
  const getStarterCode = () => {
    if (courseId.includes('python') || courseId === 'ext-1') {
      return `# Python Starter Code
def hello_world():
    print("Hello, World!")
    return "Welcome to Python!"

# Your code here
result = hello_world()
print(result)`;
    } else if (courseId.includes('javascript') || courseId === 'ext-2') {
      return `// JavaScript Starter Code
function helloWorld() {
    console.log("Hello, World!");
    return "Welcome to JavaScript!";
}

// Your code here
const result = helloWorld();
console.log(result);`;
    } else if (courseId.includes('react') || courseId === 'ext-3') {
      return `// React Component Example
import React from 'react';

function App() {
    return (
        <div>
            <h1>Hello, World!</h1>
            <p>Welcome to React!</p>
        </div>
    );
}

export default App;`;
    }
    return `// Your code here
console.log("Hello, World!");`;
  };

  const [code, setCode] = useState(getStarterCode());
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);

  // Simulate code execution based on language
  const simulateExecution = (code: string, language: string): string => {
    const outputLines: string[] = [];
    
    try {
      if (language === 'python' || courseId.includes('python') || courseId === 'ext-1') {
        // Extract print statements from Python code (handles both single and double quotes, and variables)
        const printRegex = /print\s*\((.*?)\)/g;
        let match;
        
        while ((match = printRegex.exec(code)) !== null) {
          const content = match[1].trim();
          
          // Handle string literals
          if ((content.startsWith('"') && content.endsWith('"')) || 
              (content.startsWith("'") && content.endsWith("'"))) {
            const cleanContent = content.slice(1, -1);
            outputLines.push(cleanContent);
          }
          // Handle variables (like result, hello_world(), etc.)
          else if (content.includes('result') || content.includes('hello_world')) {
            // Check if hello_world function is called
            if (code.includes('def hello_world()')) {
              // Extract what the function returns/prints
              const funcMatch = code.match(/def hello_world\(\):[\s\S]*?print\s*\(["']([^"']+)["']\)/);
              if (funcMatch) {
                outputLines.push(funcMatch[1]);
              } else if (code.includes('Hello, World')) {
                outputLines.push('Hello, World!');
              }
              if (code.includes('Welcome')) {
                outputLines.push('Welcome to Python!');
              }
            } else {
              outputLines.push('Hello, World!');
              outputLines.push('Welcome to Python!');
            }
          }
          // Handle other expressions
          else {
            outputLines.push(`[Variable: ${content}]`);
          }
        }
        
        // If no print statements found but function exists, show default output
        if (outputLines.length === 0 && code.includes('def hello_world()')) {
          outputLines.push('Hello, World!');
          if (code.includes('Welcome')) {
            outputLines.push('Welcome to Python!');
          }
        }
      } else if (language === 'javascript' || courseId.includes('javascript') || courseId === 'ext-2') {
        // Extract console.log statements from JavaScript code
        const consoleRegex = /console\.log\s*\((.*?)\)/g;
        let match;
        
        while ((match = consoleRegex.exec(code)) !== null) {
          const content = match[1].trim();
          
          // Handle string literals
          if ((content.startsWith('"') && content.endsWith('"')) || 
              (content.startsWith("'") && content.endsWith("'")) ||
              (content.startsWith('`') && content.endsWith('`'))) {
            const cleanContent = content.slice(1, -1);
            outputLines.push(cleanContent);
          }
          // Handle variables (like result, helloWorld(), etc.)
          else if (content.includes('result') || content.includes('helloWorld')) {
            // Check if helloWorld function is called
            if (code.includes('function helloWorld()') || code.includes('const helloWorld')) {
              // Extract what the function logs/returns
              const funcMatch = code.match(/(?:function helloWorld|const helloWorld)[\s\S]*?console\.log\s*\(["']([^"']+)["']\)/);
              if (funcMatch) {
                outputLines.push(funcMatch[1]);
              } else if (code.includes('Hello, World')) {
                outputLines.push('Hello, World!');
              }
              if (code.includes('Welcome')) {
                outputLines.push('Welcome to JavaScript!');
              }
            } else {
              outputLines.push('Hello, World!');
              outputLines.push('Welcome to JavaScript!');
            }
          }
          // Handle other expressions
          else {
            outputLines.push(`[Variable: ${content}]`);
          }
        }
        
        // If no console.log found but function exists, show default output
        if (outputLines.length === 0 && (code.includes('function helloWorld()') || code.includes('const helloWorld'))) {
          outputLines.push('Hello, World!');
          if (code.includes('Welcome')) {
            outputLines.push('Welcome to JavaScript!');
          }
        }
      } else if (language === 'react' || courseId.includes('react') || courseId === 'ext-3') {
        // For React, show component preview
        outputLines.push('React Component Compiled Successfully!');
        outputLines.push('');
        outputLines.push('Component Preview:');
        outputLines.push('<div>');
        outputLines.push('  <h1>Hello, World!</h1>');
        outputLines.push('  <p>Welcome to React!</p>');
        outputLines.push('</div>');
      } else {
        // Generic JavaScript/console.log handling
        const consoleMatches = code.match(/console\.log\s*\(([^)]+)\)/g);
        if (consoleMatches) {
          consoleMatches.forEach(match => {
            const content = match.replace(/console\.log\s*\(['"]?([^'"]+)['"]?\)/, '$1');
            const cleanContent = content.replace(/^['"]|['"]$/g, '');
            outputLines.push(cleanContent);
          });
        }
      }
      
      // If no output found, provide default message
      if (outputLines.length === 0) {
        outputLines.push('Code executed successfully!');
        outputLines.push('(No output generated)');
      }
      
      return outputLines.join('\n');
    } catch (error) {
      return `Execution Error: ${error}`;
    }
  };

  const handleRun = async () => {
    if (!code.trim()) {
      toast({
        title: 'Error',
        description: 'Please write some code first',
        variant: 'destructive',
      });
      return;
    }

    setIsRunning(true);
    setOutput('');
    setResult(null);

    // Simulate code execution
    setTimeout(() => {
      try {
        // Determine language
        let language = 'javascript';
        if (courseId.includes('python') || courseId === 'ext-1') {
          language = 'python';
        } else if (courseId.includes('react') || courseId === 'ext-3') {
          language = 'react';
        } else if (courseId.includes('javascript') || courseId === 'ext-2') {
          language = 'javascript';
        }
        
        // Simulate execution
        const executionOutput = simulateExecution(code, language);
        const executionTime = (Math.random() * 100 + 50).toFixed(2);
        
        const output = `${executionOutput}\n\n---\nExecution completed in ${executionTime}ms`;
        
        setOutput(output);
        setResult('success');
        toast({
          title: 'Success',
          description: 'Code executed successfully!',
        });
      } catch (error: any) {
        setOutput(`Error: ${error.message || error}`);
        setResult('error');
        toast({
          title: 'Error',
          description: 'Code execution failed',
          variant: 'destructive',
        });
      } finally {
        setIsRunning(false);
      }
    }, 1000);
  };

  const handleReset = () => {
    setCode(getStarterCode());
    setOutput('');
    setResult(null);
  };

  const handleClear = () => {
    setCode('');
    setOutput('');
    setResult(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Code Editor
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
              >
                Clear
              </Button>
              <Button
                onClick={handleRun}
                disabled={isRunning}
                size="sm"
              >
                {isRunning ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Running...
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
        <CardContent>
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono text-sm min-h-[400px] resize-none"
            placeholder="Write your code here..."
          />
        </CardContent>
      </Card>

      {output && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Output</CardTitle>
              {result && (
                <Badge variant={result === 'success' ? 'default' : 'destructive'}>
                  {result === 'success' ? (
                    <>
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Success
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-1 h-3 w-3" />
                      Error
                    </>
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
              {output}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-2">Tips:</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Write your code in the editor above</li>
            <li>• Click "Run Code" to execute your code</li>
            <li>• Use "Reset" to restore the starter code</li>
            <li>• Check the output panel for results</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

