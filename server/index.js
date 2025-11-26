import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { load } from 'cheerio';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Helper function to fetch and parse HTML
async function fetchHTML(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    throw error;
  }
}

// Parse Udemy free courses
async function parseUdemyCourses(html) {
  const $ = load(html);
  const courses = [];

  try {
    // Udemy uses JSON-LD structured data
    const jsonLdScripts = $('script[type="application/ld+json"]');
    
    jsonLdScripts.each((i, elem) => {
      try {
        const jsonData = JSON.parse($(elem).html());
        if (jsonData['@type'] === 'Course' || (Array.isArray(jsonData) && jsonData[0]?.['@type'] === 'Course')) {
          const courseData = Array.isArray(jsonData) ? jsonData[0] : jsonData;
          courses.push({
            title: courseData.name || courseData.headline,
            description: courseData.description || '',
            provider: 'Udemy',
            url: courseData.url || courseData['@id'],
            rating: courseData.aggregateRating?.ratingValue || 0,
            students: courseData.aggregateRating?.reviewCount || 0,
            image: courseData.image || '',
            instructor: courseData.provider?.name || courseData.author?.name || 'Unknown',
          });
        }
      } catch (e) {
        // Skip invalid JSON
      }
    });

    // Fallback: Try to parse from HTML structure
    if (courses.length === 0) {
      $('[data-purpose="course-card"]').each((i, elem) => {
        const $elem = $(elem);
        const title = $elem.find('[data-purpose="course-title-url"]').text().trim() || 
                     $elem.find('h3, h4').first().text().trim();
        const description = $elem.find('[data-purpose="course-headline"]').text().trim() || '';
        const rating = parseFloat($elem.find('[data-purpose="rating-number"]').text().trim() || '0');
        const students = $elem.find('[data-purpose="rating-text"]').text().trim() || '';
        const url = $elem.find('a').first().attr('href') || '';
        const image = $elem.find('img').first().attr('src') || '';

        if (title) {
          courses.push({
            title,
            description,
            provider: 'Udemy',
            url: url.startsWith('http') ? url : `https://www.udemy.com${url}`,
            rating,
            students,
            image,
            instructor: 'Unknown',
          });
        }
      });
    }
  } catch (error) {
    console.error('Error parsing Udemy courses:', error);
  }

  return courses;
}

// Parse Coursera free courses
async function parseCourseraCourses(html) {
  const $ = load(html);
  const courses = [];

  try {
    // Coursera uses JSON-LD and also has data in script tags
    const jsonLdScripts = $('script[type="application/ld+json"]');
    
    jsonLdScripts.each((i, elem) => {
      try {
        const jsonData = JSON.parse($(elem).html());
        if (jsonData['@type'] === 'Course' || (Array.isArray(jsonData) && jsonData.some(item => item['@type'] === 'Course'))) {
          const courseList = Array.isArray(jsonData) ? jsonData : [jsonData];
          courseList.forEach(courseData => {
            if (courseData['@type'] === 'Course') {
              courses.push({
                title: courseData.name || courseData.headline,
                description: courseData.description || '',
                provider: 'Coursera',
                url: courseData.url || courseData['@id'],
                rating: courseData.aggregateRating?.ratingValue || 0,
                students: courseData.aggregateRating?.reviewCount || 0,
                image: courseData.image || '',
                instructor: courseData.provider?.name || courseData.author?.name || 'Unknown',
              });
            }
          });
        }
      } catch (e) {
        // Skip invalid JSON
      }
    });

    // Fallback: Try to parse from HTML structure
    if (courses.length === 0) {
      $('[data-testid="course-card"], .rc-CourseCard, [class*="CourseCard"]').each((i, elem) => {
        const $elem = $(elem);
        const title = $elem.find('h2, h3, [class*="title"], [class*="name"]').first().text().trim();
        const description = $elem.find('[class*="description"], [class*="headline"]').first().text().trim() || '';
        const rating = parseFloat($elem.find('[class*="rating"]').first().text().trim() || '0');
        const url = $elem.find('a').first().attr('href') || '';
        const image = $elem.find('img').first().attr('src') || '';

        if (title) {
          courses.push({
            title,
            description,
            provider: 'Coursera',
            url: url.startsWith('http') ? url : `https://www.coursera.org${url}`,
            rating,
            students: '',
            image,
            instructor: 'Unknown',
          });
        }
      });
    }
  } catch (error) {
    console.error('Error parsing Coursera courses:', error);
  }

  return courses;
}

// Handler function for external courses endpoint
async function handleExternalCourses(req, res) {
  try {
    console.log('Fetching external courses...');
    // Return static courses (no scraping needed)
    const courses = [
      {
        id: 'ext-1',
        title: 'Python Programming for Beginners',
        description: 'Learn Python from scratch. Master variables, loops, functions, and object-oriented programming. Build real-world projects and applications.',
        provider: 'Udemy',
        url: '#',
        rating: 4.7,
        students: '125K students',
        image: '',
        instructor: 'John Smith',
        category: 'coding',
        level: 'beginner',
        is_tech: true,
      },
      {
        id: 'ext-2',
        title: 'JavaScript Mastery: From Zero to Hero',
        description: 'Complete JavaScript course covering ES6+, async/await, DOM manipulation, and modern frameworks. Build interactive web applications.',
        provider: 'Udemy',
        url: '#',
        rating: 4.8,
        students: '98K students',
        image: '',
        instructor: 'Sarah Johnson',
        category: 'coding',
        level: 'intermediate',
        is_tech: true,
      },
      {
        id: 'ext-3',
        title: 'React.js Complete Guide',
        description: 'Master React.js with hooks, context API, routing, and state management. Build scalable single-page applications.',
        provider: 'Udemy',
        url: '#',
        rating: 4.9,
        students: '87K students',
        image: '',
        instructor: 'Mike Chen',
        category: 'coding',
        level: 'intermediate',
        is_tech: true,
      },
      {
        id: 'ext-4',
        title: 'Data Structures and Algorithms',
        description: 'Learn fundamental data structures and algorithms. Master problem-solving techniques for technical interviews.',
        provider: 'Udemy',
        url: '#',
        rating: 4.6,
        students: '76K students',
        image: '',
        instructor: 'Dr. Emily Davis',
        category: 'coding',
        level: 'advanced',
        is_tech: true,
      },
      {
        id: 'ext-5',
        title: 'Machine Learning Fundamentals',
        description: 'Introduction to machine learning concepts, algorithms, and practical applications. Build your first ML models.',
        provider: 'Udemy',
        url: '#',
        rating: 4.7,
        students: '65K students',
        image: '',
        instructor: 'Prof. Robert Wilson',
        category: 'tech',
        level: 'intermediate',
        is_tech: true,
      },
      {
        id: 'ext-6',
        title: 'Web Development Bootcamp',
        description: 'Full-stack web development course covering HTML, CSS, JavaScript, Node.js, and databases. Build complete web applications.',
        provider: 'Udemy',
        url: '#',
        rating: 4.8,
        students: '142K students',
        image: '',
        instructor: 'Alex Thompson',
        category: 'coding',
        level: 'beginner',
        is_tech: true,
      },
      {
        id: 'ext-7',
        title: 'English for Career Development',
        description: 'Improve your English language skills for professional success. Learn business writing, communication, and interview techniques.',
        provider: 'Udemy',
        url: '#',
        rating: 4.8,
        students: '54K students',
        image: '',
        instructor: 'University of Pennsylvania',
        category: 'language',
        level: 'beginner',
        is_tech: false,
      },
      {
        id: 'ext-8',
        title: 'Spanish Language Complete Course',
        description: 'Learn Spanish from basics to advanced. Master grammar, vocabulary, conversation, and cultural nuances.',
        provider: 'Udemy',
        url: '#',
        rating: 4.6,
        students: '43K students',
        image: '',
        instructor: 'Maria Garcia',
        category: 'language',
        level: 'beginner',
        is_tech: false,
      },
      {
        id: 'ext-9',
        title: 'Digital Marketing Mastery',
        description: 'Learn SEO, social media marketing, content marketing, and analytics. Build effective digital marketing campaigns.',
        provider: 'Udemy',
        url: '#',
        rating: 4.7,
        students: '89K students',
        image: '',
        instructor: 'David Lee',
        category: 'tech',
        level: 'intermediate',
        is_tech: false,
      },
      {
        id: 'ext-10',
        title: 'UI/UX Design Fundamentals',
        description: 'Master user interface and user experience design. Learn design principles, prototyping, and user research methods.',
        provider: 'Udemy',
        url: '#',
        rating: 4.8,
        students: '67K students',
        image: '',
        instructor: 'Lisa Anderson',
        category: 'tech',
        level: 'beginner',
        is_tech: false,
      },
      {
        id: 'ext-11',
        title: 'Cloud Computing with AWS',
        description: 'Learn Amazon Web Services (AWS) from basics. Master EC2, S3, Lambda, and cloud architecture patterns.',
        provider: 'Udemy',
        url: '#',
        rating: 4.7,
        students: '58K students',
        image: '',
        instructor: 'James Brown',
        category: 'tech',
        level: 'intermediate',
        is_tech: true,
      },
      {
        id: 'ext-12',
        title: 'Mobile App Development with Flutter',
        description: 'Build cross-platform mobile apps with Flutter and Dart. Create beautiful, performant apps for iOS and Android.',
        provider: 'Udemy',
        url: '#',
        rating: 4.8,
        students: '72K students',
        image: '',
        instructor: 'Chris Taylor',
        category: 'coding',
        level: 'intermediate',
        is_tech: true,
      },
    ];

    console.log(`Returning ${courses.length} courses`);
    res.json({ courses, count: courses.length });
  } catch (error) {
    console.error('Error in external courses endpoint:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch external courses', 
      message: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// API endpoint to get external courses
// Handle both /api/courses/external (direct) and /courses/external (proxied)
app.get('/api/courses/external', handleExternalCourses);
app.get('/courses/external', handleExternalCourses);

// Health check endpoint

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler (must be after all routes)
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', message: `Route ${req.path} not found` });
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({ 
    error: 'Internal server error', 
    message: err.message || 'An unexpected error occurred' 
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Courses API: http://localhost:${PORT}/api/courses/external`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please stop the other server or change the PORT.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

