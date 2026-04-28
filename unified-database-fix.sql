-- QAYANI UNIFIED DATABASE FIX
-- This resolves the schema conflicts and creates the correct tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- FIX 1: DROP AND RECREATE CONVERSATIONS TABLE
-- =============================================

-- Drop the problematic conversations table
DROP TABLE IF EXISTS public.conversations CASCADE;

-- Create the correct conversations table that matches our API expectations
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    personality_id UUID REFERENCES public.personalities(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    learning_phase BOOLEAN DEFAULT false,
    conversation_context JSONB DEFAULT '{}',
    title TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    message_count INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =============================================
-- FIX 2: ENSURE ALL REQUIRED TABLES EXIST
-- =============================================

-- Ensure users table exists (from first schema)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'family')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
    stripe_customer_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Ensure personalities table exists (from first schema)
CREATE TABLE IF NOT EXISTS public.personalities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date_of_birth DATE,
    date_of_passing DATE,
    relationship_to_creator TEXT,
    voice_profile JSONB DEFAULT '{}',
    voice_sample_urls TEXT[] DEFAULT '{}',
    personality_traits JSONB DEFAULT '{}',
    memories TEXT[] DEFAULT '{}',
    life_events JSONB[] DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    speech_patterns JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Ensure recordings table exists (from first schema)
CREATE TABLE IF NOT EXISTS public.recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personality_id UUID NOT NULL REFERENCES public.personalities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    duration INTEGER,
    transcript TEXT,
    processed_content JSONB DEFAULT '{}',
    extracted_memories TEXT[] DEFAULT '{}',
    emotion_analysis JSONB DEFAULT '{}',
    topics TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Keep user_profiles table (from second schema) - it's useful for chat
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    personality_traits JSONB DEFAULT '{}',
    speech_patterns JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    life_events JSONB[] DEFAULT '{}',
    life_story TEXT,
    avatar_url TEXT,
    learning_phase TEXT DEFAULT 'initial' CHECK (learning_phase IN ('initial', 'learning', 'trained')),
    last_training_update TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Keep user_memories table (from second schema) - it's useful for chat
CREATE TABLE IF NOT EXISTS public.user_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    title TEXT,
    memory_type TEXT DEFAULT 'general' CHECK (memory_type IN ('general', 'voice_recording', 'photo', 'journal', 'important_moment')),
    source_file_url TEXT,
    emotion_tags TEXT[] DEFAULT '{}',
    topics TEXT[] DEFAULT '{}',
    date_mentioned DATE,
    importance_score INTEGER DEFAULT 5 CHECK (importance_score BETWEEN 1 AND 10),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =============================================
-- FIX 3: CREATE PROPER INDEXES
-- =============================================

-- Core indexes for recording functionality
CREATE INDEX IF NOT EXISTS idx_personalities_user_id ON public.personalities(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_personality_id ON public.recordings(personality_id);
CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON public.recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON public.recordings(created_at DESC);

-- Chat functionality indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_personality_id ON public.conversations(personality_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON public.conversations(created_at DESC);

-- User profile indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON public.user_memories(user_id);

-- =============================================
-- FIX 4: ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FIX 5: CREATE CORRECT RLS POLICIES
-- =============================================

-- Users policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Personalities policies
DROP POLICY IF EXISTS "Users can manage own personalities" ON public.personalities;
CREATE POLICY "Users can manage own personalities" ON public.personalities
    FOR ALL USING (auth.uid() = user_id);

-- Recordings policies
DROP POLICY IF EXISTS "Users can manage own recordings" ON public.recordings;
CREATE POLICY "Users can manage own recordings" ON public.recordings
    FOR ALL USING (auth.uid() = user_id);

-- Conversations policies (FIXED)
DROP POLICY IF EXISTS "Users can access own conversations" ON public.conversations;
CREATE POLICY "Users can access own conversations" ON public.conversations
    FOR ALL USING (auth.uid() = user_id);

-- User profiles policies
DROP POLICY IF EXISTS "Users can manage own user profile" ON public.user_profiles;
CREATE POLICY "Users can manage own user profile" ON public.user_profiles
    FOR ALL USING (auth.uid() = user_id);

-- User memories policies
DROP POLICY IF EXISTS "Users can manage own memories" ON public.user_memories;
CREATE POLICY "Users can manage own memories" ON public.user_memories
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- FIX 6: CREATE UTILITY FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_personalities_updated_at ON public.personalities;
CREATE TRIGGER update_personalities_updated_at BEFORE UPDATE ON public.personalities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FIX 7: ENSURE STORAGE IS CONFIGURED
-- =============================================

-- Ensure recordings bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for recordings
DROP POLICY IF EXISTS "Users can upload own recordings" ON storage.objects;
CREATE POLICY "Users can upload own recordings" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'recordings' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can view own recordings" ON storage.objects;
CREATE POLICY "Users can view own recordings" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'recordings' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete own recordings" ON storage.objects;
CREATE POLICY "Users can delete own recordings" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'recordings' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '✅ QAYANI DATABASE SCHEMA UNIFIED AND FIXED!';
    RAISE NOTICE '🎤 Recording functionality: READY';
    RAISE NOTICE '💬 Chat functionality: READY (with personality_id)';
    RAISE NOTICE '👤 User profiles: READY';
    RAISE NOTICE '🗄️ Storage policies: READY';
    RAISE NOTICE '🔒 Row Level Security: ENABLED';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Next steps:';
    RAISE NOTICE '1. Test recording workflow';
    RAISE NOTICE '2. Test chat functionality';
    RAISE NOTICE '3. Verify dashboard displays recordings';
END
$$;