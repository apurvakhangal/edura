-- Fix RLS Policy for User Registration
-- Run this SQL in your Supabase SQL Editor to fix the registration issue

-- Drop existing policies if they exist (optional, for clean reinstall)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Add INSERT policy for users table
-- This allows users to create their own profile during registration
CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Alternative: Use a database trigger to auto-create user profile
-- This is more secure and ensures profiles are always created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, xp, level, streak)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    0,
    1,
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires when a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

