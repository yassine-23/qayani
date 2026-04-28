-- =====================================================
-- QAYANI Row Level Security (RLS) Policies
-- Ensures users can only access their own data
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_models ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Users can read their own user record
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own user record
CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- USER PROFILES TABLE POLICIES
-- =====================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- USER MEMORIES TABLE POLICIES
-- =====================================================

-- Users can manage all their memories
CREATE POLICY "Users can manage own memories"
  ON public.user_memories
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- PERSONALITIES TABLE POLICIES
-- =====================================================

-- Users can manage their own personalities
CREATE POLICY "Users can manage own personalities"
  ON public.personalities
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- RECORDINGS TABLE POLICIES
-- =====================================================

-- Users can manage their own recordings
CREATE POLICY "Users can manage own recordings"
  ON public.recordings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- CONVERSATIONS TABLE POLICIES
-- =====================================================

-- Users can manage their own conversations
CREATE POLICY "Users can manage own conversations"
  ON public.conversations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- USER AVATARS TABLE POLICIES
-- =====================================================

-- Users can read their own avatars
CREATE POLICY "Users can read own avatars"
  ON public.user_avatars
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own avatars
CREATE POLICY "Users can insert own avatars"
  ON public.user_avatars
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own avatars
CREATE POLICY "Users can update own avatars"
  ON public.user_avatars
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own avatars
CREATE POLICY "Users can delete own avatars"
  ON public.user_avatars
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- VOICE MODELS TABLE POLICIES
-- =====================================================

-- Users can read their own voice models
CREATE POLICY "Users can read own voice models"
  ON public.voice_models
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own voice models
CREATE POLICY "Users can insert own voice models"
  ON public.voice_models
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own voice models
CREATE POLICY "Users can update own voice models"
  ON public.voice_models
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own voice models
CREATE POLICY "Users can delete own voice models"
  ON public.voice_models
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- SERVICE ROLE POLICIES (for backend operations)
-- =====================================================

-- Allow service role to bypass RLS for all tables
-- This is used by backend API routes with service_role key

-- Add comments for documentation
COMMENT ON POLICY "Users can read own data" ON public.users IS 'Users can only read their own user record';
COMMENT ON POLICY "Users can manage own memories" ON public.user_memories IS 'Users have full control over their memories';
COMMENT ON POLICY "Users can manage own personalities" ON public.personalities IS 'Users have full control over their digital personalities';
COMMENT ON POLICY "Users can manage own recordings" ON public.recordings IS 'Users have full control over their recordings';
COMMENT ON POLICY "Users can manage own conversations" ON public.conversations IS 'Users have full control over their conversation history';
COMMENT ON POLICY "Users can read own avatars" ON public.user_avatars IS 'Users can only access their own avatars';
COMMENT ON POLICY "Users can read own voice models" ON public.voice_models IS 'Users can only access their own voice models';

-- =====================================================
-- VERIFY RLS IS ACTIVE
-- =====================================================

-- Query to verify RLS is enabled on all tables
-- Run this after applying migration:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public' AND rowsecurity = true;
