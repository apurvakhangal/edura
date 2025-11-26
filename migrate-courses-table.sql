-- Migration script to update existing courses table to new structure
-- Run this in Supabase SQL Editor if you get "column owner_id does not exist" error

-- Step 1: Add new columns if they don't exist
ALTER TABLE public.courses 
  ADD COLUMN IF NOT EXISTS owner_id UUID,
  ADD COLUMN IF NOT EXISTS primary_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS translated_languages JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Step 1b: Migrate difficulty to level if difficulty exists but level doesn't
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'courses' 
    AND column_name = 'difficulty'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'courses' 
    AND column_name = 'level'
  ) THEN
    -- Add level column first
    ALTER TABLE public.courses ADD COLUMN level TEXT DEFAULT 'beginner';
    
    -- Copy and convert difficulty to level
    UPDATE public.courses 
    SET level = LOWER(difficulty)
    WHERE difficulty IS NOT NULL;
  END IF;
END $$;

-- Step 2: Migrate data from user_id to owner_id (if user_id column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'courses' 
    AND column_name = 'user_id'
  ) THEN
    -- First, drop any NOT NULL constraint on user_id
    BEGIN
      ALTER TABLE public.courses ALTER COLUMN user_id DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      -- If it fails, the constraint might not exist, continue
      NULL;
    END;
    
    -- Copy user_id values to owner_id for existing rows
    UPDATE public.courses 
    SET owner_id = user_id 
    WHERE owner_id IS NULL AND user_id IS NOT NULL;
    
    -- Add foreign key constraint to owner_id (if not exists)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'courses_owner_id_fkey'
      AND table_name = 'courses'
    ) THEN
      ALTER TABLE public.courses
        ADD CONSTRAINT courses_owner_id_fkey 
        FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Step 3: Make owner_id NOT NULL (after data migration)
-- Only if owner_id has values and there are no NULL values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.courses WHERE owner_id IS NULL
  ) THEN
    -- Only set NOT NULL if all rows have owner_id
    ALTER TABLE public.courses 
      ALTER COLUMN owner_id SET NOT NULL;
  ELSE
    -- If there are NULL values, set a default for new rows
    ALTER TABLE public.courses 
      ALTER COLUMN owner_id SET DEFAULT NULL;
  END IF;
END $$;

-- Step 4: Update level values to lowercase if needed (only if level column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'courses' 
    AND column_name = 'level'
  ) THEN
    UPDATE public.courses 
    SET level = LOWER(level) 
    WHERE level IN ('Beginner', 'Intermediate', 'Advanced');
  END IF;
END $$;

-- Step 5: Drop old user_id column constraint and column (after migration is complete)
-- First drop any foreign key constraints on user_id
DO $$
BEGIN
  -- Drop foreign key constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'courses_user_id_fkey'
    AND table_name = 'courses'
  ) THEN
    ALTER TABLE public.courses DROP CONSTRAINT courses_user_id_fkey;
  END IF;
END $$;

-- Now we can safely drop the user_id column (uncomment if you want to remove it)
-- ALTER TABLE public.courses DROP COLUMN IF EXISTS user_id;

-- Step 6: Create the new tables (modules, user_course_progress, ai_course_jobs)
-- Modules table
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  content JSONB DEFAULT '{}'::jsonb,
  time_required INTEGER DEFAULT 0,
  flashcards JSONB DEFAULT '[]'::jsonb,
  practice_tasks JSONB DEFAULT '[]'::jsonb,
  quiz JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, module_number)
);

-- User course progress table
CREATE TABLE IF NOT EXISTS public.user_course_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  completed_modules INTEGER DEFAULT 0,
  progress_percentage NUMERIC(5, 2) DEFAULT 0,
  quiz_scores JSONB DEFAULT '{}'::jsonb,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, user_id)
);

-- AI course generation jobs table
CREATE TABLE IF NOT EXISTS public.ai_course_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'running', 'done', 'failed')) DEFAULT 'pending',
  inputs JSONB DEFAULT '{}'::jsonb,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE
);

-- Step 7: Create indexes
CREATE INDEX IF NOT EXISTS idx_courses_owner_id ON public.courses(owner_id);
CREATE INDEX IF NOT EXISTS idx_courses_published ON public.courses(published);
CREATE INDEX IF NOT EXISTS idx_courses_level ON public.courses(level);
CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses(category);
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON public.modules(course_id);
CREATE INDEX IF NOT EXISTS idx_user_course_progress_course_id ON public.user_course_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_user_course_progress_user_id ON public.user_course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_course_jobs_user_id ON public.ai_course_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_course_jobs_status ON public.ai_course_jobs(status);

-- Step 8: Update RLS policies for courses table
-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view their own courses" ON public.courses;
DROP POLICY IF EXISTS "Users can insert their own courses" ON public.courses;
DROP POLICY IF EXISTS "Users can update their own courses" ON public.courses;
DROP POLICY IF EXISTS "Users can delete their own courses" ON public.courses;

-- Create new policies
CREATE POLICY "Users can view published courses or their own courses"
  ON public.courses FOR SELECT
  USING (published = true OR auth.uid() = owner_id);

CREATE POLICY "Users can insert their own courses"
  ON public.courses FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own courses"
  ON public.courses FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own courses"
  ON public.courses FOR DELETE
  USING (auth.uid() = owner_id);

-- Step 9: Enable RLS on new tables
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_course_jobs ENABLE ROW LEVEL SECURITY;

-- Step 10: Create RLS policies for modules
CREATE POLICY "Users can view modules of accessible courses"
  ON public.modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = modules.course_id
      AND (courses.published = true OR courses.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert modules for their own courses"
  ON public.modules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = modules.course_id
      AND courses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update modules for their own courses"
  ON public.modules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = modules.course_id
      AND courses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete modules for their own courses"
  ON public.modules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = modules.course_id
      AND courses.owner_id = auth.uid()
    )
  );

-- Step 11: Create RLS policies for user_course_progress
CREATE POLICY "Users can view their own progress"
  ON public.user_course_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.user_course_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.user_course_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Step 12: Create RLS policies for ai_course_jobs
CREATE POLICY "Users can view their own AI jobs"
  ON public.ai_course_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI jobs"
  ON public.ai_course_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI jobs"
  ON public.ai_course_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Step 13: Create triggers for updated_at
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_course_progress_updated_at BEFORE UPDATE ON public.user_course_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Done! Your courses table should now be migrated.

