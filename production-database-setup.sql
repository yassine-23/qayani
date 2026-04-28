-- QAYANI PRODUCTION DATABASE SETUP
-- Run this script in Supabase SQL Editor

-- =============================================
-- STEP 1: ENABLE EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- STEP 2: CREATE CORE TABLES
-- =============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'family')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personalities table (core for capture page)
CREATE TABLE IF NOT EXISTS public.personalities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    date_of_birth DATE,
    date_of_passing DATE,
    relationship_to_creator TEXT DEFAULT 'Self',
    voice_profile JSONB DEFAULT '{}',
    voice_sample_urls TEXT[] DEFAULT '{}',
    personality_traits JSONB DEFAULT '{}',
    memories TEXT[] DEFAULT '{}',
    life_events JSONB[] DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    speech_patterns JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recordings table (essential for capture functionality)
CREATE TABLE IF NOT EXISTS public.recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personality_id UUID REFERENCES public.personalities(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    duration INTEGER,
    transcript TEXT,
    processed_content JSONB DEFAULT '{}',
    extracted_memories TEXT[] DEFAULT '{}',
    emotion_analysis JSONB DEFAULT '{}',
    topics TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Conversations table (for chat functionality)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personality_id UUID REFERENCES public.personalities(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    learning_phase BOOLEAN DEFAULT FALSE,
    title TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table (for chat functionality)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'personality', 'system')),
    sender_id UUID,
    content TEXT NOT NULL,
    voice_url TEXT,
    emotion TEXT,
    attachments JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_personalities_user_id ON public.personalities(user_id);
CREATE INDEX IF NOT EXISTS idx_personalities_active ON public.personalities(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recordings_personality_id ON public.recordings(personality_id);
CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON public.recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON public.recordings(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_personality_id ON public.conversations(personality_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);

-- =============================================
-- STEP 4: ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 5: CREATE RLS SECURITY POLICIES
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

-- Conversations policies
DROP POLICY IF EXISTS "Users can access own conversations" ON public.conversations;
CREATE POLICY "Users can access own conversations" ON public.conversations
    FOR ALL USING (auth.uid() = user_id);

-- Messages policies
DROP POLICY IF EXISTS "Users can access conversation messages" ON public.messages;
CREATE POLICY "Users can access conversation messages" ON public.messages
    FOR ALL USING (
        conversation_id IN (
            SELECT c.id FROM public.conversations c
            WHERE c.user_id = auth.uid()
        )
    );

-- =============================================
-- STEP 6: CREATE UTILITY FUNCTIONS
-- =============================================

-- Auto-update updated_at timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- =============================================
-- STEP 7: CREATE TRIGGERS FOR AUTO-UPDATES
-- =============================================
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_personalities_updated_at ON public.personalities;
CREATE TRIGGER update_personalities_updated_at
    BEFORE UPDATE ON public.personalities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- STEP 8: GRANT NECESSARY PERMISSIONS
-- =============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Grant permissions on tables
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.personalities TO authenticated;
GRANT ALL ON public.recordings TO authenticated;
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.messages TO authenticated;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '✅ QAYANI PRODUCTION DATABASE SETUP COMPLETE!';
    RAISE NOTICE '🎤 Capture page is now ready for full functionality';
    RAISE NOTICE '💬 Chat system ready for OpenAI integration';
    RAISE NOTICE '📊 All tables, policies, and triggers configured';
    RAISE NOTICE '🔒 Row Level Security enabled and configured';
    RAISE NOTICE '🗄️ Ready for user registrations and recordings';
END
$$;