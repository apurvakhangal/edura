# Course Module Database Migration Guide

## ⚠️ IMPORTANT: Run This First!

Before using the Courses module, you **MUST** run the migration SQL in your Supabase project.

## If You Get "column owner_id does not exist" Error:

**This means you have an existing `courses` table with the old structure.** Use the migration script instead:

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**

2. **Run the Migration Script**
   - Copy the entire contents of `migrate-courses-table.sql`
   - Paste it into the SQL Editor
   - Click **Run** or press `Ctrl+Enter`
   - This will safely migrate your existing table

3. **If You Don't Have an Existing Courses Table:**
   - Use `supabase-schema.sql` instead (for fresh installations)

## Steps to Migrate (Using migrate-courses-table.sql):

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**

2. **Run the Migration SQL**
   - Copy the entire contents of `migrate-courses-table.sql`
   - Paste it into the SQL Editor
   - Click **Run** or press `Ctrl+Enter`

3. **Verify Tables Created**
   - Go to **Database** → **Tables**
   - You should see these new/updated tables:
     - `courses` (updated structure with owner_id)
     - `modules` (new)
     - `user_course_progress` (new)
     - `ai_course_jobs` (new)

## If You Have Existing Courses Table:

If you already have a `courses` table with the old structure, run this migration:

```sql
-- Add new columns to existing courses table
ALTER TABLE public.courses 
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS primary_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS translated_languages JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Update existing user_id to owner_id if needed
UPDATE public.courses 
SET owner_id = user_id 
WHERE owner_id IS NULL AND user_id IS NOT NULL;

-- Change level values from 'Beginner'/'Intermediate'/'Advanced' to lowercase
UPDATE public.courses 
SET level = LOWER(level) 
WHERE level IN ('Beginner', 'Intermediate', 'Advanced');

-- Drop old user_id column if it exists and owner_id is set
-- (Only do this if you're sure all data is migrated)
-- ALTER TABLE public.courses DROP COLUMN IF EXISTS user_id;
```

## After Migration:

1. **Test the Courses Page**
   - Go to `http://localhost:8080/courses`
   - Try generating an AI course
   - Check browser console for any errors

2. **If You Still See 400/404 Errors:**
   - Check Supabase logs: **Logs** → **Postgres Logs**
   - Verify RLS policies are created
   - Check that your user is authenticated

## Troubleshooting:

### Error: "relation courses does not exist"
- Run the full `supabase-schema.sql` file

### Error: "column owner_id does not exist"
- Run the migration SQL above to add new columns

### Error: "permission denied"
- Check that RLS policies were created
- Verify you're logged in
- Check Supabase → Authentication → Policies

### Error: "No API key found"
- This is a Gemini API issue, not database
- Check that the API key is correct in `src/lib/gemini.ts`
- Verify the key is valid in Google AI Studio

