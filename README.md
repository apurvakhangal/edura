# Edura - AI-Powered Learning Platform

Edura is a comprehensive, AI-powered learning platform designed to make education accessible, engaging, and personalized. Built with modern web technologies, it combines AI assistance, gamification, community features, and multi-language support to create an inclusive learning experience.

## 🌟 Features

### Core Features
- **AI Study Assistant**: Interactive chatbot powered by Google Gemini AI for instant help and explanations
- **Smart Learning Roadmaps**: AI-generated personalized learning paths based on your goals, skill level, and timeline
- **Gamified Learning**: Earn XP, level up, maintain streaks, and compete on leaderboards
- **Focus Room**: Pomodoro-style focus sessions with ambient sounds and progress tracking
- **Study VR**: Immersive 3D virtual reality study environment powered by FrameVR for collaborative learning
- **Notes Management**: Create, organize, and enhance notes with AI-powered summaries, flashcards, and quizzes
- **Community Features**: Discussion forums, study groups, and mentor chat
- **Multi-language Support**: 30+ languages with real-time translation
- **Accessibility**: Dyslexia-friendly fonts, colorblind mode, and screen reader optimization

### Technical Features
- **Real-time Progress Tracking**: Track course progress, study sessions, and achievements
- **Analytics Dashboard**: Visualize your learning journey with charts and statistics
- **External Course Integration**: Browse courses from Udemy and Coursera
- **IDE Integration**: Built-in code editor for programming courses with test cases
- **File Upload Support**: Upload PDFs and text files for note-taking

## 🏗️ Architecture

### Technology Stack

#### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 7
- **Routing**: React Router DOM 6
- **State Management**: 
  - Zustand (global state)
  - TanStack Query (server state)
- **UI Components**: 
  - shadcn/ui (Radix UI primitives)
  - Tailwind CSS (styling)
  - Framer Motion (animations)
- **Form Handling**: React Hook Form with Zod validation
- **Charts**: Recharts

#### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **API**: Express.js server for external course fetching
- **AI Services**:
  - Google Gemini AI (chat, summaries, flashcards, quizzes, roadmaps)
  - RapidAPI Deep Translate (multi-language support)

### Project Structure

```
csgirlieshack/
├── public/                 # Static assets
│   ├── audio/             # Sound files for focus room
│   └── placeholder.svg
├── server/                # Backend Express server
│   └── index.js          # External course API
├── src/
│   ├── components/       # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── Navbar.tsx    # Navigation bar
│   │   ├── IDE.tsx       # Code editor component
│   │   ├── MentorChat.tsx # Mentor chat interface
│   │   ├── DiscussionForum.tsx # Forum component
│   │   ├── StudyGroupChat.tsx # Study group chat
│   │   ├── ThemeProvider.tsx # Theme context
│   │   └── TranslationProvider.tsx # Translation context
│   ├── hooks/            # Custom React hooks
│   │   ├── useTranslation.ts
│   │   └── useSoundPlayer.ts
│   ├── lib/              # Core libraries
│   │   ├── supabase.ts   # Supabase client
│   │   ├── gemini.ts     # Gemini AI service
│   │   ├── auth.ts       # Auth utilities
│   │   └── utils.ts      # Utility functions
│   ├── pages/            # Page components
│   │   ├── Landing.tsx   # Landing page
│   │   ├── Login.tsx     # Login page
│   │   ├── Register.tsx # Registration page
│   │   ├── Dashboard.tsx # User dashboard
│   │   ├── Courses.tsx   # Course browser
│   │   ├── CourseDetail.tsx # Course detail view
│   │   ├── AIBot.tsx     # AI chat interface
│   │   ├── Roadmap.tsx   # Learning roadmaps
│   │   ├── Notes.tsx     # Notes management
│   │   ├── FocusRoom.tsx # Focus session room
│   │   ├── StudyVR.tsx   # Virtual reality study environment
│   │   ├── Community.tsx # Community features
│   │   ├── Analytics.tsx # Analytics dashboard
│   │   └── Settings.tsx  # User settings
│   ├── services/         # Business logic services
│   │   ├── authService.ts      # Authentication
│   │   ├── userService.ts       # User management
│   │   ├── courseService.ts     # Course operations
│   │   ├── notesService.ts      # Notes operations
│   │   ├── roadmapService.ts    # Roadmap operations
│   │   ├── roadmapShService.ts  # Roadmap.sh integration
│   │   ├── communityService.ts  # Community features
│   │   ├── leaderboardService.ts # Leaderboard
│   │   └── translateService.ts  # Translation service
│   ├── store/            # Zustand stores
│   │   ├── userStore.ts  # User state
│   │   └── themeStore.ts # Theme preferences
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
├── supabase-schema.sql   # Database schema
├── vite.config.ts        # Vite configuration
├── tailwind.config.ts    # Tailwind configuration
└── package.json          # Dependencies
```

### Database Schema

The application uses Supabase (PostgreSQL) with the following main tables:

#### Core Tables
- **users**: User profiles (extends Supabase auth.users)
  - XP, level, streak tracking
  - Linked to auth.users via UUID

- **courses**: Course metadata
  - Title, description, level, category
  - Multi-language support (JSONB)
  - Published status

- **modules**: Course modules
  - Content (JSONB) with text, video, code blocks
  - Flashcards, practice tasks, quizzes
  - IDE tasks for programming courses
  - Time estimates

- **user_course_progress**: Progress tracking
  - Completed modules count
  - Progress percentage
  - Quiz scores (JSONB)
  - Last accessed timestamp

- **notes**: User notes
  - Title, content, summary
  - File attachments (Supabase Storage)
  - AI-generated summaries

- **roadmaps**: Learning roadmaps
  - Goal description
  - Milestones (JSONB array)
  - Progress percentage

- **study_sessions**: Focus room sessions
  - Duration, XP earned
  - Mode (focus/break)

#### Security
- Row Level Security (RLS) enabled on all tables
- Policies ensure users can only access their own data
- Public courses are viewable by all authenticated users

### API Architecture

#### Frontend API Layer
- **Supabase Client**: Direct database access via Supabase JS SDK
- **Service Layer**: Business logic abstraction in `src/services/`
- **React Query**: Caching and state management for server data

#### Backend API (Express Server)
- **Port**: 3001
- **Endpoints**:
  - `GET /api/courses/external` - Fetch external courses (Udemy/Coursera)
  - `GET /health` - Health check

#### External APIs
- **Google Gemini AI**: 
  - Chat responses
  - Content summarization
  - Quiz/flashcard generation
  - Roadmap generation

- **RapidAPI Deep Translate**:
  - Text translation
  - Multi-language support
  - Translation caching

### State Management

#### Zustand Stores
- **userStore**: Authentication state, user profile
- **themeStore**: Theme preferences, accessibility settings, language

#### React Query
- Server state caching
- Automatic refetching
- Optimistic updates

### Routing

Protected routes require authentication:
- `/dashboard` - User dashboard
- `/courses` - Course browser
- `/courses/:courseId` - Course detail
- `/ai-bot` - AI chat
- `/roadmap` - Learning roadmaps
- `/notes` - Notes management
- `/focus` - Focus room
- `/study-vr` - Virtual reality study environment
- `/community` - Community features
- `/analytics` - Analytics
- `/settings` - Settings

Public routes:
- `/` - Landing page
- `/login` - Login
- `/register` - Registration

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works)
- Google Gemini API key
- RapidAPI account (for translation features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd csgirlieshack
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

   # Google Gemini AI Configuration
   VITE_GEMINI_API_KEY=your-gemini-api-key
   VITE_GEMINI_MODEL=gemini-2.5-flash

  # Google Classroom OAuth
  VITE_GOOGLE_CLIENT_ID=your-oauth-client-id.apps.googleusercontent.com
  # Optional: Supabase Edge proxy that fetches Classroom data server-side
  VITE_CLASSROOM_PROXY_URL=https://<your-project>.functions.supabase.co/classroom-sync

   # RapidAPI Configuration (for Translation)
   VITE_RAPIDAPI_KEY=your-rapidapi-key

   # Backend API Configuration (optional)
   VITE_API_URL=http://localhost:3001

  # Judge0 Sandbox (required for IDE)
  VITE_JUDGE0_URL=http://localhost:2358
  # Optional: Needed when using RapidAPI or hosted Judge0 that requires auth headers
  VITE_JUDGE0_HOST=judge0-ce.p.rapidapi.com
  VITE_JUDGE0_KEY=your-judge0-api-key
   ```

4. **Set up Supabase**
   
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to SQL Editor and run `supabase-schema.sql`
   - Get your credentials from Project Settings → API
   - Update `.env` with your Supabase URL and anon key

5. **Get API Keys**
   
   - **Gemini API**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - **RapidAPI**: Get from [RapidAPI Hub](https://rapidapi.com/hub) (subscribe to Deep Translate API)

6. **Configure Google Classroom OAuth**
  - Enable the Google Classroom API in [Google Cloud Console](https://console.cloud.google.com/)
  - Create an OAuth 2.0 Web Client with origin `http://localhost:8080` (or your deployed domain)
  - Add the scopes used by this app (courses.readonly, coursework.me, userinfo.email/profile)
  - Paste the generated client ID into `VITE_GOOGLE_CLIENT_ID`
  - (Optional) Deploy a Supabase Edge Function and set `VITE_CLASSROOM_PROXY_URL` if you prefer proxying Classroom requests through your backend

7. **Run the development servers**
   
   ```bash
   # Run both frontend and backend
   npm run dev:all
   
   # Or run separately:
   npm run dev          # Frontend (port 8080)
   npm run dev:server   # Backend (port 3001)
   ```

8. **Open the application**
   
   Navigate to `http://localhost:8080`

## 📚 Key Features Explained

### Learning Roadmaps
- Two types:
  1. **Simple Roadmaps**: Quick goal-based roadmaps
  2. **Detailed Roadmaps**: Comprehensive plans with questionnaires
- AI generates personalized milestones based on:
  - Skill level (beginner/intermediate/advanced)
  - Timeline (days/weeks/months)
  - Time commitment
  - Learning goals

### Focus Room
- Pomodoro timer with customizable durations
- Ambient sound player
- XP rewards for completed sessions
- Streak tracking
- Break reminders

### Study VR
- Immersive 3D virtual reality study environment powered by [FrameVR](https://framevr.io)
- Collaborative learning space where students can study together in real-time
- Voice and video chat capabilities for seamless communication
- Interactive avatars and movement controls (WASD/arrow keys)
- Shareable link for inviting friends to join the virtual study room
- One-click copy link functionality for easy sharing
- Responsive iframe integration with fullscreen support

### Notes Management
- Create and organize notes
- Upload PDF/text files
- AI-powered features:
  - Automatic summaries
  - Flashcard generation
  - Quiz creation
- File storage via Supabase Storage

### Community Features
- Discussion forums by topic
- Study groups with chat
- Mentor chat (AI-powered)
- Leaderboard rankings

### AI Study Planner + Classroom Sync
- OAuth with Google Identity Services to pull Google Classroom courses and assignments
- Dedicated panel showing Pending, Upcoming, and Completed assignments with rich metadata
- One-click "Add to Planner" pre-fills the AI planner form with due date, hours, and priority
- "Generate Schedule from Classroom Tasks" instantly maps pending assignments into the AI-generated daily plan
- Optional Supabase Edge proxy support for Classroom API calls if you prefer server-side token exchange

## 🔒 Security

- **Environment Variables**: All API keys stored in `.env` (not committed)
- **Row Level Security**: Database-level security via Supabase RLS
- **Authentication**: Supabase Auth with JWT tokens
- **Protected Routes**: Client-side route protection
- **API Key Validation**: Server-side validation for external APIs

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start frontend dev server
- `npm run dev:server` - Start backend server
- `npm run dev:all` - Run both servers concurrently
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier (via ESLint) for formatting
- Component-based architecture

## 📦 Dependencies

### Core Dependencies
- `react` & `react-dom` - UI framework
- `react-router-dom` - Routing
- `@supabase/supabase-js` - Database & auth
- `@google/genai` - Gemini AI
- `zustand` - State management
- `@tanstack/react-query` - Server state
- `framer-motion` - Animations
- `tailwindcss` - Styling

### UI Components
- `@radix-ui/*` - Accessible UI primitives
- `shadcn/ui` - Component library
- `lucide-react` - Icons
- `recharts` - Charts

## 🌐 Deployment

### Frontend (Vite)
- Build: `npm run build`
- Output: `dist/` directory
- Deploy to: Vercel, Netlify, or any static host

### Backend (Express)
- Deploy to: Railway, Render, or any Node.js host
- Set environment variables in hosting platform

### Environment Variables
Ensure all environment variables are set in your hosting platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEY`
- `VITE_RAPIDAPI_KEY`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_CLASSROOM_PROXY_URL` (if using Supabase Edge proxy)
- `VITE_JUDGE0_URL`
- `VITE_JUDGE0_HOST` (if required)
- `VITE_JUDGE0_KEY` (if required)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the browser console for errors
2. Verify environment variables are set correctly
3. Check Supabase logs (Dashboard → Logs)
4. Review the [SETUP.md](./SETUP.md) guide

## 🎯 Roadmap

- [ ] Real-time collaboration features
- [ ] Mobile app (React Native)
- [ ] Advanced analytics and insights
- [ ] Video course support
- [ ] Peer review system
- [ ] Certificate generation
- [ ] Integration with more learning platforms

## 🙏 Acknowledgments

- Built with [Vite](https://vitejs.dev/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database powered by [Supabase](https://supabase.com/)
- AI powered by [Google Gemini](https://deepmind.google/technologies/gemini/)
- Virtual reality environment powered by [FrameVR](https://framevr.io)

---

**Note**: Make sure to never commit your `.env` file. The `.env` file is already in `.gitignore` for security.
