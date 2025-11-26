-- Fix RLS Policies for roadmaps table
-- Run this in your Supabase SQL Editor if you're getting RLS policy errors

-- First, drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Users can view their own roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Users can insert their own roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Users can update their own roadmaps" ON public.roadmaps;
DROP POLICY IF EXISTS "Users can delete their own roadmaps" ON public.roadmaps;

-- Recreate RLS Policies for roadmaps table
CREATE POLICY "Users can view their own roadmaps"
  ON public.roadmaps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roadmaps"
  ON public.roadmaps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own roadmaps"
  ON public.roadmaps FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own roadmaps"
  ON public.roadmaps FOR DELETE
  USING (auth.uid() = user_id);

-- Verify RLS is enabled
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;

