import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { TranslatedText } from '@/components/TranslatedText';
import {
  BookOpen,
  Clock,
  Star,
  Trophy,
  Award,
  CheckCircle2,
  PlayCircle,
  Code,
  MessageSquare,
  ArrowLeft,
  Target,
  Zap,
  Users,
} from 'lucide-react';
import { getExternalCourses, type ExternalCourse } from '@/services/courseService';
import { getCourseById, getCourseProgress, completeModule, updateCourseProgress, type Course, type Module } from '@/services/courseService';
import { updateUserXP, getUserProfile } from '@/services/userService';
import { getCurrentUserId } from '@/lib/auth';
import { useUserStore } from '@/store/userStore';
import IDE from '@/components/IDE';
import DiscussionForum from '@/components/DiscussionForum';

function isInternalCourse(course: Course | ExternalCourse | null): course is Course {
  return Boolean(course && 'meta' in course);
}

function isExternalCatalogCourse(course: Course | ExternalCourse | null): course is ExternalCourse {
  return Boolean(course && 'provider' in course);
}

function getYouTubeEmbedUrl(rawUrl?: string): string | null {
  if (!rawUrl) {
    return null;
  }

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace(/^www\./, '');
    const pathSegments = parsed.pathname.split('/').filter(Boolean);

    let videoId = parsed.searchParams.get('v');

    if (!videoId && host === 'youtu.be' && pathSegments.length) {
      videoId = pathSegments[0];
    }

    if (!videoId && (host.includes('youtube.com') || host.includes('youtube-nocookie.com'))) {
      if (pathSegments[0] === 'shorts' && pathSegments[1]) {
        videoId = pathSegments[1];
      } else if (['embed', 'v'].includes(pathSegments[0]) && pathSegments[1]) {
        videoId = pathSegments[1];
      } else if (pathSegments.length) {
        videoId = pathSegments[pathSegments.length - 1];
      }
    }

    return videoId ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}` : null;
  } catch (error) {
    console.debug('Unable to parse YouTube URL', error);
    return null;
  }
}

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useUserStore((state) => state.user);
  
  const [course, setCourse] = useState<Course | ExternalCourse | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [activeModule, setActiveModule] = useState<number>(1);
  const [progress, setProgress] = useState(0);
  const [completedModules, setCompletedModules] = useState<number[]>([]);
  const [xp, setXp] = useState(user?.xp || 0);
  const [level, setLevel] = useState(user?.level || 1);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'ide' | 'discussion'>('content');
  const internalCourse = isInternalCourse(course) ? course : null;
  const externalCourse = isExternalCatalogCourse(course) ? course : null;
  const modulesOfferIde = modules.some((module) => Boolean(module.content?.ideSetup));
  const showIdeTab = Boolean(
    modulesOfferIde ||
      (internalCourse?.meta?.includeIDE) ||
      (externalCourse && (externalCourse.is_tech || externalCourse.category === 'coding' || externalCourse.category === 'tech'))
  );

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  // Save active module when it changes (for resume functionality)
  useEffect(() => {
    if (courseId && activeModule > 0 && !isLoading) {
      // Save to localStorage for quick access
      localStorage.setItem(`last_module_${courseId}`, activeModule.toString());
      
      // For database courses, update last_accessed when module changes
      if (!courseId.startsWith('ext-')) {
        updateCourseProgress(courseId, {
          completed_modules: completedModules.length,
          progress_percentage: progress,
        }).catch(err => {
          // Silently fail - this is just for tracking, not critical
          console.debug('Could not update last accessed:', err);
        });
      }
    }
  }, [activeModule, courseId, isLoading]);

  const loadCourse = async () => {
    setIsLoading(true);
    try {
      if (!courseId) {
        throw new Error('Course ID is required');
      }

      // Check if it's an external course
      if (courseId.startsWith('ext-')) {
        const result = await getExternalCourses();
        const externalCourse = result.courses?.find(c => c.id === courseId);
        if (externalCourse) {
          setCourse(externalCourse);
          // Generate mock modules for external courses
          const mockModules = generateMockModules(externalCourse);
          setModules(mockModules);
          
          // Load progress from localStorage for external courses
          const savedProgress = localStorage.getItem(`course_progress_${courseId}`);
          if (savedProgress) {
            try {
              const progressData = JSON.parse(savedProgress);
              setProgress(progressData.progress || 0);
              setCompletedModules(progressData.completedModules || []);
              // Set active module to next incomplete module
              if (progressData.completedModules && progressData.completedModules.length > 0) {
                const lastCompleted = Math.max(...progressData.completedModules);
                if (lastCompleted < mockModules.length) {
                  setActiveModule(lastCompleted + 1);
                } else {
                  setActiveModule(mockModules.length);
                }
              }
            } catch (e) {
              console.error('Error loading saved progress:', e);
            }
          }
          
          // Check for last viewed module
          const lastModule = localStorage.getItem(`last_module_${courseId}`);
          if (lastModule) {
            const moduleNum = parseInt(lastModule, 10);
            if (moduleNum >= 1 && moduleNum <= mockModules.length) {
              setActiveModule(moduleNum);
            }
          }
        }
        // Load user XP and level for external courses too
        const userId = await getCurrentUserId();
        if (userId) {
          const profileResult = await getUserProfile(userId);
          if (profileResult.profile) {
            setXp(profileResult.profile.xp || 0);
            setLevel(profileResult.profile.level || 1);
          }
        }
        setIsLoading(false);
        return;
      }

      // Load from database
      const result = await getCourseById(courseId);
      const courseModules = result.modules || [];
      if (result.course) {
        setCourse(result.course);
        setModules(courseModules);
      }
      
      // Load user XP and level first
      const userId = await getCurrentUserId();
      if (userId) {
        const profileResult = await getUserProfile(userId);
        if (profileResult.profile) {
          setXp(profileResult.profile.xp || 0);
          setLevel(profileResult.profile.level || 1);
        }
      }
      
      // Load progress only for database courses
      try {
        const progressResult = await getCourseProgress(courseId);
        if (progressResult.progress && !progressResult.error && courseModules.length > 0) {
          const progressData = progressResult.progress;
          setProgress(progressData.progress_percentage);
          const completed = Array.from({ length: progressData.completed_modules }, (_, i) => i + 1);
          setCompletedModules(completed);
          
          // Check for last viewed module first
          const lastModule = localStorage.getItem(`last_module_${courseId}`);
          if (lastModule) {
            const moduleNum = parseInt(lastModule, 10);
            if (moduleNum >= 1 && moduleNum <= courseModules.length) {
              setActiveModule(moduleNum);
            } else {
              // Invalid module number, use default logic
              if (completed.length > 0 && completed.length < courseModules.length) {
                setActiveModule(completed.length + 1);
              } else if (completed.length === courseModules.length) {
                setActiveModule(courseModules.length);
              } else {
                setActiveModule(1);
              }
            }
          } else {
            // No last module saved, set active module to next incomplete module or last completed + 1
            if (completed.length > 0 && completed.length < courseModules.length) {
              setActiveModule(completed.length + 1);
            } else if (completed.length === courseModules.length) {
              setActiveModule(courseModules.length);
            } else {
              setActiveModule(1);
            }
          }
        } else {
          // No progress yet, check for last viewed module
          const lastModule = localStorage.getItem(`last_module_${courseId}`);
          if (lastModule) {
            const moduleNum = parseInt(lastModule, 10);
            if (moduleNum >= 1 && moduleNum <= courseModules.length) {
              setActiveModule(moduleNum);
            } else {
              setActiveModule(1);
            }
          } else {
            setActiveModule(1);
          }
        }
      } catch (progressError) {
        // Progress loading failed, but continue with course loading
        console.warn('Failed to load progress:', progressError);
        // Check for last viewed module as fallback
        const lastModule = localStorage.getItem(`last_module_${courseId}`);
        if (lastModule) {
          const moduleNum = parseInt(lastModule, 10);
          if (moduleNum >= 1 && moduleNum <= courseModules.length) {
            setActiveModule(moduleNum);
          } else {
            setActiveModule(1);
          }
        } else {
          setActiveModule(1);
        }
      }
    } catch (error: any) {
      console.error('Error loading course:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load course',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockModules = (course: ExternalCourse): Module[] => {
    const moduleCount = 8;
    
    // Special handling for Python Programming for Beginners
    if (course.id === 'ext-1' || course.title.toLowerCase().includes('python')) {
      return generatePythonModules(course);
    }
    
    // Default generic modules for other courses
    return Array.from({ length: moduleCount }, (_, i) => ({
      id: `module-${i + 1}`,
      course_id: course.id,
      module_number: i + 1,
      title: `Module ${i + 1}: ${getModuleTitle(course, i + 1)}`,
      summary: `Learn the fundamentals of ${getModuleTitle(course, i + 1).toLowerCase()}`,
      content: {
        concepts: [`Concept 1 for Module ${i + 1}`, `Concept 2 for Module ${i + 1}`],
        examples: [`Example 1 for Module ${i + 1}`, `Example 2 for Module ${i + 1}`],
        content_blocks: [
          {
            type: 'text',
            content: `This is the content for Module ${i + 1}. Learn about ${getModuleTitle(course, i + 1).toLowerCase()} in detail.`,
          },
        ],
      },
      time_required: 30 + i * 10,
      flashcards: [],
      practice_tasks: [],
      quiz: { questions: [] },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  };

  const generatePythonModules = (course: ExternalCourse): Module[] => {
    const pythonModules = [
      {
        module_number: 1,
        title: 'Module 1: Introduction to Python',
        summary: 'Get started with Python programming. Learn what Python is, why it\'s popular, and how to set up your development environment.',
        concepts: [
          'What is Python and its history',
          'Python\'s advantages and use cases',
          'Installing Python and choosing an IDE',
          'Writing and running your first Python program',
          'Understanding the Python interpreter'
        ],
        content: `Python is a high-level, interpreted programming language known for its simplicity and readability. Created by Guido van Rossum and first released in 1991, Python has become one of the most popular programming languages in the world.

**Why Learn Python?**
- Easy to learn: Python's syntax is clear and intuitive
- Versatile: Used in web development, data science, AI, automation, and more
- Large community: Extensive libraries and frameworks
- High demand: One of the most sought-after skills in tech

**Setting Up Python:**
1. Download Python from python.org (latest version recommended)
2. Install Python and check the "Add Python to PATH" option
3. Verify installation by running: python --version
4. Choose an IDE: VS Code, PyCharm, or IDLE (comes with Python)

**Your First Python Program:**
The traditional first program in any language is "Hello, World!":

\`\`\`python
print("Hello, World!")
\`\`\`

This simple line demonstrates Python's readability. The print() function outputs text to the console. Notice there's no need for semicolons or complex syntax - Python emphasizes code readability.`,
        examples: [
          {
            title: 'Hello World Program',
            code: `print("Hello, World!")
print("Welcome to Python Programming!")`,
            explanation: 'The print() function displays text. You can call it multiple times to print different messages.'
          },
          {
            title: 'Comments in Python',
            code: `# This is a single-line comment
print("Comments are ignored by Python")

"""
This is a multi-line comment
You can write multiple lines here
"""`,
            explanation: 'Comments help document your code. Use # for single-line comments and triple quotes for multi-line comments.'
          }
        ],
        time_required: 45
      },
      {
        module_number: 2,
        title: 'Module 2: Variables and Data Types',
        summary: 'Learn about variables, different data types in Python, and how to work with them effectively.',
        concepts: [
          'Variables and naming conventions',
          'Basic data types: int, float, str, bool',
          'Type conversion and type checking',
          'String operations and formatting',
          'Constants and best practices'
        ],
        content: `Variables are containers for storing data values. In Python, you don't need to declare the type of a variable - Python automatically determines it based on the value you assign.

**Basic Data Types:**

1. **Integers (int)**: Whole numbers
   \`\`\`python
   age = 25
   count = -10
   \`\`\`

2. **Floats (float)**: Decimal numbers
   \`\`\`python
   price = 19.99
   temperature = -5.5
   \`\`\`

3. **Strings (str)**: Text data
   \`\`\`python
   name = "Alice"
   message = 'Hello, Python!'
   \`\`\`

4. **Booleans (bool)**: True or False
   \`\`\`python
   is_active = True
   is_complete = False
   \`\`\`

**Variable Naming Rules:**
- Must start with a letter or underscore
- Can contain letters, numbers, and underscores
- Case-sensitive (age ≠ Age)
- Cannot use Python keywords (if, for, while, etc.)
- Use descriptive names: user_name instead of un

**Type Conversion:**
You can convert between types using built-in functions:
\`\`\`python
num_str = "42"
num_int = int(num_str)  # Convert to integer
num_float = float(num_str)  # Convert to float
\`\`\``,
        examples: [
          {
            title: 'Working with Variables',
            code: `# Different data types
name = "Python"
version = 3.11
is_awesome = True

# Type checking
print(type(name))  # <class 'str'>
print(type(version))  # <class 'int'>
print(type(is_awesome))  # <class 'bool'>

# Type conversion
age_str = "25"
age_int = int(age_str)
print(age_int + 5)  # 30`,
            explanation: 'Python automatically assigns types to variables. Use type() to check the type and conversion functions to change types.'
          },
          {
            title: 'String Operations',
            code: `first_name = "John"
last_name = "Doe"

# Concatenation
full_name = first_name + " " + last_name
print(full_name)  # John Doe

# String formatting (f-strings)
age = 30
message = f"My name is {full_name} and I'm {age} years old"
print(message)  # My name is John Doe and I'm 30 years old

# String methods
text = "  Hello Python  "
print(text.strip())  # "Hello Python"
print(text.upper())  # "  HELLO PYTHON  "`,
            explanation: 'Strings support many operations. F-strings (formatted string literals) are the modern way to format strings in Python.'
          }
        ],
        time_required: 60
      },
      {
        module_number: 3,
        title: 'Module 3: Control Flow',
        summary: 'Master conditional statements and loops to control the flow of your Python programs.',
        concepts: [
          'If, elif, and else statements',
          'Comparison and logical operators',
          'For loops and while loops',
          'Loop control: break, continue, pass',
          'Nested loops and conditions'
        ],
        content: `Control flow allows your program to make decisions and repeat actions. Python provides several control structures to handle different scenarios.

**Conditional Statements:**

The if statement allows your program to execute code conditionally:

\`\`\`python
age = 18
if age >= 18:
    print("You are an adult")
elif age >= 13:
    print("You are a teenager")
else:
    print("You are a child")
\`\`\`

**Comparison Operators:**
- == (equal to)
- != (not equal to)
- < (less than)
- > (greater than)
- <= (less than or equal to)
- >= (greater than or equal to)

**Logical Operators:**
- and: Both conditions must be True
- or: At least one condition must be True
- not: Reverses the boolean value

**Loops:**

1. **For Loop**: Iterates over a sequence
   \`\`\`python
   for i in range(5):
       print(i)  # Prints 0, 1, 2, 3, 4
   \`\`\`

2. **While Loop**: Repeats while condition is True
   \`\`\`python
   count = 0
   while count < 5:
       print(count)
       count += 1
   \`\`\`

**Loop Control:**
- break: Exit the loop immediately
- continue: Skip to the next iteration
- pass: Do nothing (placeholder)`,
        examples: [
          {
            title: 'Conditional Statements',
            code: `score = 85

if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
else:
    grade = "F"

print(f"Your grade is {grade}")

# Logical operators
age = 25
has_license = True

if age >= 18 and has_license:
    print("You can drive")
else:
    print("You cannot drive")`,
            explanation: 'Use if/elif/else for decision-making. Combine conditions with logical operators (and, or, not) for complex logic.'
          },
          {
            title: 'Loops in Action',
            code: `# For loop with range
print("Counting to 5:")
for i in range(1, 6):
    print(i)

# For loop with list
fruits = ["apple", "banana", "cherry"]
for fruit in fruits:
    print(f"I like {fruit}")

# While loop
countdown = 5
while countdown > 0:
    print(countdown)
    countdown -= 1
print("Blast off!")

# Loop with break
for num in range(10):
    if num == 5:
        break
    print(num)  # Prints 0-4`,
            explanation: 'For loops are great when you know how many iterations you need. While loops are useful when the condition determines when to stop.'
          }
        ],
        time_required: 75
      },
      {
        module_number: 4,
        title: 'Module 4: Functions',
        summary: 'Learn to create reusable code blocks with functions. Understand parameters, return values, and scope.',
        concepts: [
          'Defining and calling functions',
          'Parameters and arguments',
          'Return values',
          'Default parameters and keyword arguments',
          'Variable scope: local vs global',
          'Lambda functions'
        ],
        content: `Functions are reusable blocks of code that perform a specific task. They help organize code, reduce repetition, and make programs easier to understand and maintain.

**Defining Functions:**

\`\`\`python
def greet(name):
    return f"Hello, {name}!"

message = greet("Alice")
print(message)  # Hello, Alice!
\`\`\`

**Function Components:**
- def: Keyword to define a function
- Function name: Follows variable naming rules
- Parameters: Variables that receive values
- Return statement: Sends a value back (optional)

**Parameters and Arguments:**

Functions can accept multiple parameters:

\`\`\`python
def add_numbers(a, b):
    return a + b

result = add_numbers(5, 3)  # 8
\`\`\`

**Default Parameters:**

You can provide default values for parameters:

\`\`\`python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

print(greet("Alice"))  # Hello, Alice!
print(greet("Bob", "Hi"))  # Hi, Bob!
\`\`\`

**Variable Scope:**

Variables defined inside a function are local to that function. Variables defined outside are global.

\`\`\`python
global_var = "I'm global"

def my_function():
    local_var = "I'm local"
    print(global_var)  # Can access global
    print(local_var)   # Can access local

my_function()
# print(local_var)  # Error! local_var doesn't exist here
\`\`\``,
        examples: [
          {
            title: 'Basic Functions',
            code: `# Simple function
def square(number):
    return number ** 2

result = square(5)
print(result)  # 25

# Function with multiple parameters
def calculate_area(length, width):
    area = length * width
    return area

room_area = calculate_area(10, 8)
print(f"Room area: {room_area} square feet")  # 80`,
            explanation: 'Functions encapsulate logic. Use return to send values back. Functions without return statements return None.'
          },
          {
            title: 'Advanced Function Features',
            code: `# Default parameters
def introduce(name, age, city="Unknown"):
    return f"{name} is {age} years old and lives in {city}"

print(introduce("Alice", 25))  # Uses default city
print(introduce("Bob", 30, "New York"))  # Overrides default

# Keyword arguments
def create_profile(name, age, email):
    return {
        "name": name,
        "age": age,
        "email": email
    }

profile = create_profile(age=25, email="alice@example.com", name="Alice")
print(profile)

# Lambda functions (anonymous functions)
multiply = lambda x, y: x * y
print(multiply(3, 4))  # 12`,
            explanation: 'Default parameters make functions flexible. Keyword arguments allow you to pass arguments in any order. Lambda functions are concise one-line functions.'
          }
        ],
        time_required: 90
      },
      {
        module_number: 5,
        title: 'Module 5: Data Structures',
        summary: 'Explore Python\'s built-in data structures: lists, tuples, dictionaries, and sets.',
        concepts: [
          'Lists: creation, indexing, and methods',
          'Tuples: immutable sequences',
          'Dictionaries: key-value pairs',
          'Sets: unique collections',
          'List comprehensions',
          'Nested data structures'
        ],
        content: `Python provides several built-in data structures to store and organize data efficiently. Each has its own characteristics and use cases.

**Lists:**

Lists are ordered, mutable collections. They can contain items of different types.

\`\`\`python
fruits = ["apple", "banana", "cherry"]
numbers = [1, 2, 3, 4, 5]
mixed = [1, "hello", 3.14, True]

# Accessing elements
print(fruits[0])  # apple
print(fruits[-1])  # cherry (last item)

# List methods
fruits.append("orange")  # Add item
fruits.remove("banana")  # Remove item
fruits.sort()  # Sort list
\`\`\`

**Tuples:**

Tuples are ordered, immutable collections. Use parentheses.

\`\`\`python
coordinates = (10, 20)
point = (x, y, z)  # Cannot modify after creation
\`\`\`

**Dictionaries:**

Dictionaries store key-value pairs. Keys must be unique and immutable.

\`\`\`python
student = {
    "name": "Alice",
    "age": 20,
    "grade": "A"
}

# Accessing values
print(student["name"])  # Alice
print(student.get("age"))  # 20

# Adding/updating
student["email"] = "alice@example.com"
\`\`\`

**Sets:**

Sets are unordered collections of unique elements.

\`\`\`python
unique_numbers = {1, 2, 3, 4, 5}
unique_numbers.add(6)
unique_numbers.remove(3)
\`\`\``,
        examples: [
          {
            title: 'Working with Lists',
            code: `# List operations
shopping_list = ["milk", "bread", "eggs"]

# Add items
shopping_list.append("butter")
shopping_list.insert(1, "cheese")

# Remove items
shopping_list.remove("bread")
last_item = shopping_list.pop()  # Removes and returns last item

# List slicing
numbers = [0, 1, 2, 3, 4, 5]
print(numbers[1:4])  # [1, 2, 3]
print(numbers[:3])   # [0, 1, 2]
print(numbers[3:])   # [3, 4, 5]

# List comprehension
squares = [x**2 for x in range(5)]
print(squares)  # [0, 1, 4, 9, 16]`,
            explanation: 'Lists are versatile. Use methods like append(), remove(), and pop() to modify them. List comprehensions provide a concise way to create lists.'
          },
          {
            title: 'Dictionaries and Sets',
            code: `# Dictionary operations
person = {
    "name": "John",
    "age": 30,
    "city": "New York"
}

# Accessing
print(person["name"])  # John
print(person.get("email", "Not provided"))  # Safe access with default

# Iterating
for key, value in person.items():
    print(f"{key}: {value}")

# Set operations
set1 = {1, 2, 3, 4}
set2 = {3, 4, 5, 6}

print(set1.union(set2))      # {1, 2, 3, 4, 5, 6}
print(set1.intersection(set2))  # {3, 4}
print(set1.difference(set2))    # {1, 2}`,
            explanation: 'Dictionaries are perfect for structured data. Sets are great for mathematical operations and removing duplicates.'
          }
        ],
        time_required: 90
      },
      {
        module_number: 6,
        title: 'Module 6: Object-Oriented Programming',
        summary: 'Introduction to classes, objects, inheritance, and encapsulation in Python.',
        concepts: [
          'Classes and objects',
          'Attributes and methods',
          'The __init__ method (constructor)',
          'Inheritance and method overriding',
          'Encapsulation and access modifiers',
          'Special methods (__str__, __repr__)'
        ],
        content: `Object-Oriented Programming (OOP) is a programming paradigm that organizes code into objects, which contain both data (attributes) and functions (methods) that operate on that data.

**Classes and Objects:**

A class is a blueprint for creating objects. An object is an instance of a class.

\`\`\`python
class Dog:
    def __init__(self, name, breed):
        self.name = name
        self.breed = breed
    
    def bark(self):
        return f"{self.name} says Woof!"

# Creating objects
my_dog = Dog("Buddy", "Golden Retriever")
print(my_dog.bark())  # Buddy says Woof!
\`\`\`

**Key Concepts:**

1. **__init__ method**: Constructor that initializes the object
2. **self**: Reference to the instance of the class
3. **Attributes**: Variables that belong to the object
4. **Methods**: Functions that belong to the object

**Inheritance:**

Classes can inherit from other classes, allowing code reuse:

\`\`\`python
class Animal:
    def __init__(self, name):
        self.name = name
    
    def speak(self):
        return "Some sound"

class Cat(Animal):
    def speak(self):
        return f"{self.name} says Meow!"

my_cat = Cat("Whiskers")
print(my_cat.speak())  # Whiskers says Meow!
\`\`\``,
        examples: [
          {
            title: 'Creating Classes',
            code: `class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height
    
    def area(self):
        return self.width * self.height
    
    def perimeter(self):
        return 2 * (self.width + self.height)
    
    def __str__(self):
        return f"Rectangle({self.width}x{self.height})"

# Create rectangle objects
rect1 = Rectangle(5, 3)
print(rect1)  # Rectangle(5x3)
print(f"Area: {rect1.area()}")  # 15
print(f"Perimeter: {rect1.perimeter()}")  # 16`,
            explanation: 'Classes define objects with attributes (data) and methods (functions). The __init__ method initializes new objects. __str__ defines how objects are displayed.'
          },
          {
            title: 'Inheritance Example',
            code: `class Vehicle:
    def __init__(self, brand, model):
        self.brand = brand
        self.model = model
    
    def start(self):
        return f"{self.brand} {self.model} is starting..."

class Car(Vehicle):
    def __init__(self, brand, model, doors):
        super().__init__(brand, model)
        self.doors = doors
    
    def honk(self):
        return "Beep beep!"

class Motorcycle(Vehicle):
    def wheelie(self):
        return "Doing a wheelie!"

# Using inheritance
my_car = Car("Toyota", "Camry", 4)
print(my_car.start())  # Toyota Camry is starting...
print(my_car.honk())   # Beep beep!

my_bike = Motorcycle("Honda", "CBR")
print(my_bike.start())  # Honda CBR is starting...`,
            explanation: 'Inheritance allows classes to inherit attributes and methods from parent classes. Use super() to call parent class methods. Child classes can add new methods or override existing ones.'
          }
        ],
        time_required: 100
      },
      {
        module_number: 7,
        title: 'Module 7: File Handling and Error Handling',
        summary: 'Learn to read from and write to files, and handle errors gracefully in your Python programs.',
        concepts: [
          'Reading and writing files',
          'File modes (r, w, a, x)',
          'Context managers (with statement)',
          'Exception handling (try, except, finally)',
          'Common exceptions and custom exceptions',
          'Best practices for file operations'
        ],
        content: `Working with files and handling errors are essential skills for any Python programmer. Python provides powerful tools for both.

**File Operations:**

Python uses the open() function to work with files:

\`\`\`python
# Reading a file
with open("data.txt", "r") as file:
    content = file.read()
    print(content)
\`\`\`

**File Modes:**
- 'r': Read mode (default)
- 'w': Write mode (overwrites existing file)
- 'a': Append mode (adds to end of file)
- 'x': Exclusive creation (fails if file exists)
- 'b': Binary mode (for images, etc.)

**The with Statement:**

The with statement automatically closes files, even if an error occurs:

\`\`\`python
with open("file.txt", "w") as file:
    file.write("Hello, Python!")
# File is automatically closed here
\`\`\`

**Error Handling:**

Use try-except blocks to handle errors gracefully:

\`\`\`python
try:
    result = 10 / 0
except ZeroDivisionError:
    print("Cannot divide by zero!")
except Exception as e:
    print(f"An error occurred: {e}")
finally:
    print("This always executes")
\`\`\`

**Common Exceptions:**
- FileNotFoundError: File doesn't exist
- ValueError: Invalid value
- TypeError: Wrong type
- KeyError: Dictionary key not found
- IndexError: List index out of range`,
        examples: [
          {
            title: 'File Operations',
            code: `# Writing to a file
with open("notes.txt", "w") as file:
    file.write("Line 1\\n")
    file.write("Line 2\\n")
    file.writelines(["Line 3\\n", "Line 4\\n"])

# Reading from a file
with open("notes.txt", "r") as file:
    # Read entire file
    content = file.read()
    print(content)
    
    # Read line by line
    file.seek(0)  # Reset to beginning
    for line in file:
        print(line.strip())

# Appending to a file
with open("notes.txt", "a") as file:
    file.write("Line 5\\n")`,
            explanation: 'Use with statement for file operations - it automatically handles file closing. Different modes (r, w, a) serve different purposes.'
          },
          {
            title: 'Error Handling',
            code: `# Basic error handling
try:
    age = int(input("Enter your age: "))
    result = 100 / age
    print(f"Result: {result}")
except ValueError:
    print("Please enter a valid number")
except ZeroDivisionError:
    print("Age cannot be zero")
except Exception as e:
    print(f"Unexpected error: {e}")
else:
    print("Calculation successful!")
finally:
    print("Program finished")

# Handling file errors
try:
    with open("nonexistent.txt", "r") as file:
        content = file.read()
except FileNotFoundError:
    print("File not found!")
except PermissionError:
    print("Permission denied!")
except Exception as e:
    print(f"Error: {e}")`,
            explanation: 'Try-except blocks catch and handle errors. Use specific exception types for better error handling. The finally block always executes, useful for cleanup.'
          }
        ],
        time_required: 80
      },
      {
        module_number: 8,
        title: 'Module 8: Project Work - Building a Python Application',
        summary: 'Apply everything you\'ve learned by building a complete Python application from scratch.',
        concepts: [
          'Planning and designing your application',
          'Breaking down problems into smaller tasks',
          'Implementing core functionality',
          'Testing and debugging',
          'Code organization and best practices',
          'Documentation and comments'
        ],
        content: `Now it's time to put everything together! In this module, you'll build a complete Python application that demonstrates all the concepts you've learned.

**Project: Task Manager Application**

We'll build a command-line task manager that allows users to:
- Add tasks
- View all tasks
- Mark tasks as complete
- Delete tasks
- Save tasks to a file
- Load tasks from a file

**Planning Your Application:**

1. **Define the data structure**: Use a list of dictionaries
2. **Create functions for each operation**: add_task(), view_tasks(), complete_task(), etc.
3. **Implement file persistence**: Save/load tasks from a JSON file
4. **Create a user interface**: Menu-driven command-line interface
5. **Add error handling**: Handle invalid inputs and file errors

**Implementation Steps:**

1. Start with basic data structure and functions
2. Add file I/O functionality
3. Create the main menu loop
4. Add error handling
5. Test thoroughly
6. Refactor and improve

**Best Practices:**
- Write clear, descriptive function names
- Add comments explaining complex logic
- Handle errors gracefully
- Keep functions focused on one task
- Test your code frequently`,
        examples: [
          {
            title: 'Task Manager - Core Structure',
            code: `import json
import os

class TaskManager:
    def __init__(self, filename="tasks.json"):
        self.filename = filename
        self.tasks = self.load_tasks()
    
    def load_tasks(self):
        """Load tasks from file"""
        if os.path.exists(self.filename):
            try:
                with open(self.filename, "r") as file:
                    return json.load(file)
            except Exception as e:
                print(f"Error loading tasks: {e}")
                return []
        return []
    
    def save_tasks(self):
        """Save tasks to file"""
        try:
            with open(self.filename, "w") as file:
                json.dump(self.tasks, file, indent=2)
            return True
        except Exception as e:
            print(f"Error saving tasks: {e}")
            return False
    
    def add_task(self, description):
        """Add a new task"""
        task = {
            "id": len(self.tasks) + 1,
            "description": description,
            "completed": False
        }
        self.tasks.append(task)
        self.save_tasks()
        print(f"Task '{description}' added!")
    
    def view_tasks(self):
        """Display all tasks"""
        if not self.tasks:
            print("No tasks found!")
            return
        
        for task in self.tasks:
            status = "✓" if task["completed"] else " "
            print(f"{status} [{task['id']}] {task['description']}")
    
    def complete_task(self, task_id):
        """Mark a task as complete"""
        for task in self.tasks:
            if task["id"] == task_id:
                task["completed"] = True
                self.save_tasks()
                print(f"Task {task_id} marked as complete!")
                return
        print(f"Task {task_id} not found!")

# Usage
manager = TaskManager()
manager.add_task("Learn Python")
manager.add_task("Build a project")
manager.view_tasks()`,
            explanation: 'This TaskManager class demonstrates OOP, file handling, error handling, and data structures. It\'s a complete, working application that you can extend further.'
          },
          {
            title: 'Adding a Menu Interface',
            code: `def main():
    manager = TaskManager()
    
    while True:
        print("\\n=== Task Manager ===")
        print("1. Add task")
        print("2. View tasks")
        print("3. Complete task")
        print("4. Delete task")
        print("5. Exit")
        
        choice = input("\\nEnter your choice: ")
        
        if choice == "1":
            description = input("Enter task description: ")
            manager.add_task(description)
        elif choice == "2":
            manager.view_tasks()
        elif choice == "3":
            try:
                task_id = int(input("Enter task ID: "))
                manager.complete_task(task_id)
            except ValueError:
                print("Invalid task ID!")
        elif choice == "4":
            try:
                task_id = int(input("Enter task ID to delete: "))
                manager.delete_task(task_id)
            except ValueError:
                print("Invalid task ID!")
        elif choice == "5":
            print("Goodbye!")
            break
        else:
            print("Invalid choice!")

if __name__ == "__main__":
    main()`,
            explanation: 'The main() function creates a menu-driven interface. This demonstrates control flow, user input, and error handling in a practical application.'
          }
        ],
        time_required: 120
      }
    ];

    return pythonModules.map(module => ({
      id: `module-${module.module_number}`,
      course_id: course.id,
      module_number: module.module_number,
      title: module.title,
      summary: module.summary,
      content: {
        concepts: module.concepts,
        examples: module.examples.map(ex => ex.code),
        content_blocks: [
          {
            type: 'text',
            content: module.content,
          },
          ...module.examples.map(ex => ({
            type: 'code',
            content: ex.code,
            title: ex.title,
            explanation: ex.explanation,
          })),
        ],
      },
      time_required: module.time_required,
      flashcards: [],
      practice_tasks: [],
      quiz: { questions: [] },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  };

  const getModuleTitle = (course: ExternalCourse, moduleNum: number): string => {
    if (course.category === 'coding' || course.is_tech) {
      const titles = [
        'Introduction',
        'Basic Concepts',
        'Variables and Data Types',
        'Control Structures',
        'Functions and Methods',
        'Object-Oriented Programming',
        'Advanced Topics',
        'Projects and Practice',
      ];
      return titles[moduleNum - 1] || `Topic ${moduleNum}`;
    } else if (course.category === 'language') {
      const titles = [
        'Introduction',
        'Alphabet and Pronunciation',
        'Basic Vocabulary',
        'Grammar Basics',
        'Common Phrases',
        'Conversation Practice',
        'Advanced Grammar',
        'Cultural Context',
      ];
      return titles[moduleNum - 1] || `Topic ${moduleNum}`;
    }
    return `Topic ${moduleNum}`;
  };

  const handleModuleComplete = async (moduleNum: number) => {
    if (completedModules.includes(moduleNum)) return;
    
    const userId = await getCurrentUserId();
    if (!userId) {
      toast({
        title: 'Error',
        description: 'You must be logged in to complete modules',
        variant: 'destructive',
      });
      return;
    }
    
    const newCompleted = [...completedModules, moduleNum];
    setCompletedModules(newCompleted);
    
    const newProgress = (newCompleted.length / modules.length) * 100;
    setProgress(newProgress);
    
    // Award XP (50 XP per module, 100 XP per level)
    const xpGain = 50;
    const currentXp = xp;
    const newXp = currentXp + xpGain;
    const newLevel = Math.floor(newXp / 100) + 1;
    
    setXp(newXp);
    setLevel(newLevel);
    
    // Update user XP in database
    try {
      const xpResult = await updateUserXP(userId, xpGain);
      if (xpResult.error) {
        console.error('Error updating XP:', xpResult.error);
      } else {
        // Update user store
        useUserStore.setState((state) => {
          if (state.user) {
            return {
              user: {
                ...state.user,
                xp: xpResult.xp || newXp,
                level: xpResult.level || newLevel,
              },
            };
          }
          return state;
        });
      }
    } catch (error) {
      console.error('Error updating XP:', error);
    }
    
    toast({
      title: 'Module Completed!',
      description: `You earned ${xpGain} XP!`,
    });
    
    // Save progress
    if (courseId && !courseId.startsWith('ext-')) {
      // Database course - save to Supabase
      const result = await completeModule(courseId, moduleNum);
      if (result.error) {
        console.error('Error saving progress:', result.error);
        toast({
          title: 'Warning',
          description: 'Progress saved locally but failed to sync to server',
          variant: 'destructive',
        });
      }
    } else if (courseId && courseId.startsWith('ext-')) {
      // External course - save to localStorage
      try {
        const progressData = {
          progress: newProgress,
          completedModules: newCompleted,
          lastUpdated: new Date().toISOString(),
        };
        localStorage.setItem(`course_progress_${courseId}`, JSON.stringify(progressData));
      } catch (error) {
        console.error('Error saving progress to localStorage:', error);
      }
    }
    
    // Trigger dashboard refresh event
    window.dispatchEvent(new CustomEvent('dashboard-refresh'));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading course...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">Course not found</p>
            <Button onClick={() => navigate('/courses')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentModule = modules.find(m => m.module_number === activeModule);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Button
          variant="ghost"
          onClick={() => navigate('/courses')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Courses
        </Button>

        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
              <p className="text-muted-foreground text-lg">{course.description}</p>
            </div>
          </div>

          {/* Gamification Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Progress</p>
                    <p className="text-2xl font-bold">{Math.round(progress)}%</p>
                  </div>
                </div>
                <Progress value={progress} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-yellow-500/10 p-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">XP</p>
                    <p className="text-2xl font-bold">{xp}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-purple-500/10 p-2">
                    <Trophy className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Level</p>
                    <p className="text-2xl font-bold">{level}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-500/10 p-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{completedModules.length}/{modules.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Module List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Modules</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {modules.map((module) => (
                  <button
                    key={module.id}
                    onClick={() => setActiveModule(module.module_number)}
                    className={`w-full text-left p-3 hover:bg-accent transition-colors ${
                      activeModule === module.module_number ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {completedModules.includes(module.module_number) ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <PlayCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">
                          {module.module_number}. {module.title}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1 ml-6">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{module.time_required} min</span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content">
                <BookOpen className="mr-2 h-4 w-4" />
                Content
              </TabsTrigger>
              {showIdeTab && (
                <TabsTrigger value="ide">
                  <Code className="mr-2 h-4 w-4" />
                  IDE
                </TabsTrigger>
              )}
              <TabsTrigger value="discussion">
                <MessageSquare className="mr-2 h-4 w-4" />
                Discussion
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-6">
              {currentModule ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{currentModule.title}</CardTitle>
                        <CardDescription>{currentModule.summary}</CardDescription>
                      </div>
                      {!completedModules.includes(currentModule.module_number) && (
                        <Button
                          onClick={() => handleModuleComplete(currentModule.module_number)}
                          size="sm"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Concepts */}
                    {currentModule.content.concepts && currentModule.content.concepts.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Key Concepts</h3>
                        <ul className="space-y-2">
                          {currentModule.content.concepts.map((concept, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Star className="h-4 w-4 text-yellow-500 mt-1 flex-shrink-0" />
                              <span>{concept}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Lesson Highlights */}
                    {currentModule.content.lessonHighlights && currentModule.content.lessonHighlights.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Lesson Highlights</h3>
                        <ul className="grid gap-2 md:grid-cols-2">
                          {currentModule.content.lessonHighlights.map((highlight: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                              <Award className="h-4 w-4 text-primary mt-0.5" />
                              <span>{highlight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Content Blocks */}
                    {currentModule.content.content_blocks && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Lesson Content</h3>
                        <div className="prose max-w-none">
                          {currentModule.content.content_blocks.map((block: any, idx: number) => (
                            <div key={idx} className="mb-6">
                              {block.type === 'text' && (
                                <div 
                                  className="whitespace-pre-wrap prose dark:prose-invert max-w-none"
                                  dangerouslySetInnerHTML={{ 
                                    __html: block.content
                                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                      .replace(/```python\n([\s\S]*?)```/g, '<pre class="bg-muted p-4 rounded-lg overflow-x-auto"><code class="text-sm">$1</code></pre>')
                                      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
                                      .replace(/\n/g, '<br />')
                                  }} 
                                />
                              )}
                              {block.type === 'code' && (
                                <div className="space-y-2">
                                  {block.title && (
                                    <h4 className="text-lg font-semibold mb-2">{block.title}</h4>
                                  )}
                                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                                    <code className="text-sm">{block.content}</code>
                                  </pre>
                                  {block.explanation && (
                                    <p className="text-sm text-muted-foreground italic">
                                      {block.explanation}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lesson Narrative */}
                    {currentModule.content.lessonNarrative && !currentModule.content.content_blocks && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Guided Lesson</h3>
                        <p className="whitespace-pre-wrap text-muted-foreground">
                          {currentModule.content.lessonNarrative}
                        </p>
                      </div>
                    )}

                    {/* Examples */}
                    {currentModule.content.examples && currentModule.content.examples.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Examples</h3>
                        <div className="space-y-3">
                          {currentModule.content.examples.map((example, idx) => (
                            <Card key={idx} className="bg-muted/50">
                              <CardContent className="p-4">
                                <p>{example}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Learning Activities */}
                    {currentModule.content.activities && currentModule.content.activities.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Learning Activities</h3>
                        <div className="space-y-3">
                          {currentModule.content.activities.map((activity: string, idx: number) => (
                            <Card key={idx} className="bg-muted/40">
                              <CardContent className="p-4 text-sm">
                                {activity}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resources */}
                    {currentModule.content.resources && currentModule.content.resources.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Resources & References</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          {currentModule.content.resources.map((resource: any, idx: number) => {
                            const isVideo = resource.type && resource.type.toLowerCase() === 'video';
                            const embedUrl = isVideo ? getYouTubeEmbedUrl(resource.url) : null;

                            return (
                              <Card key={idx}>
                                <CardContent className="p-4 space-y-3">
                                  {isVideo && embedUrl && (
                                    <div className="aspect-video w-full overflow-hidden rounded-lg border">
                                      <iframe
                                        src={embedUrl}
                                        title={resource.title || 'Lesson video'}
                                        className="h-full w-full"
                                        loading="lazy"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                      />
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-base">{resource.title}</h4>
                                    {resource.type && <Badge variant="outline">{resource.type}</Badge>}
                                  </div>
                                  {resource.description && (
                                    <p className="text-sm text-muted-foreground">{resource.description}</p>
                                  )}
                                  {(!isVideo || !embedUrl) && resource.url && (
                                    <a
                                      href={resource.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-sm font-medium text-primary hover:underline"
                                    >
                                      Open resource ↗
                                    </a>
                                  )}
                                  {isVideo && resource.url && (
                                    <p className="text-xs text-muted-foreground">
                                      Prefer to watch on YouTube?
                                      <a
                                        className="ml-1 text-primary hover:underline"
                                        href={resource.url}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        Open in new tab ↗
                                      </a>
                                    </p>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Practice Tasks */}
                    {currentModule.practice_tasks && currentModule.practice_tasks.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Practice Tasks</h3>
                        <div className="space-y-3">
                          {currentModule.practice_tasks.map((task, idx) => (
                            <Card key={idx}>
                              <CardContent className="p-4">
                                <h4 className="font-semibold mb-2">{task.title}</h4>
                                <p className="text-sm text-muted-foreground">{task.description}</p>
                                <Badge className="mt-2">{task.difficulty}</Badge>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between pt-6 border-t">
                      <Button
                        variant="outline"
                        onClick={() => setActiveModule(Math.max(1, activeModule - 1))}
                        disabled={activeModule === 1}
                      >
                        Previous Module
                      </Button>
                      <Button
                        onClick={() => {
                          if (activeModule < modules.length) {
                            setActiveModule(activeModule + 1);
                          } else {
                            handleModuleComplete(activeModule);
                          }
                        }}
                        disabled={activeModule === modules.length && completedModules.includes(activeModule)}
                      >
                        {activeModule < modules.length ? 'Next Module' : 'Complete Course'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">No modules available</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {showIdeTab && (
              <TabsContent value="ide" className="mt-6">
                {currentModule?.content?.ideSetup && (
                  <Card className="mb-4">
                    <CardHeader>
                      <CardTitle>Module IDE Setup</CardTitle>
                      <CardDescription>{currentModule.content.ideSetup.tool}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {currentModule.content.ideSetup.instructions}
                      </p>
                    </CardContent>
                  </Card>
                )}
                <IDE courseId={courseId!} moduleNumber={activeModule} />
              </TabsContent>
            )}

            <TabsContent value="discussion" className="mt-6">
              <DiscussionForum courseId={courseId!} courseTitle={course.title} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

