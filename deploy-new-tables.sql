-- Deploy only the new tables needed for digital self functionality

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User Profiles (for digital self personalization)
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

-- User Memories (individual memories for training digital self)
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

-- Update conversations table to match the new schema expected by the API
DROP TABLE IF EXISTS public.conversations CASCADE;
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    learning_phase BOOLEAN DEFAULT false,
    conversation_context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON public.user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_memory_type ON public.user_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_user_memories_created_at ON public.user_memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_learning_phase ON public.conversations(learning_phase);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON public.conversations(created_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles table
DROP POLICY IF EXISTS "Users can view own user profile" ON public.user_profiles;
CREATE POLICY "Users can view own user profile" ON public.user_profiles
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own user profile" ON public.user_profiles;
CREATE POLICY "Users can create own user profile" ON public.user_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own user profile" ON public.user_profiles;
CREATE POLICY "Users can update own user profile" ON public.user_profiles
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own user profile" ON public.user_profiles;
CREATE POLICY "Users can delete own user profile" ON public.user_profiles
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for user_memories table
DROP POLICY IF EXISTS "Users can view own memories" ON public.user_memories;
CREATE POLICY "Users can view own memories" ON public.user_memories
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own memories" ON public.user_memories;
CREATE POLICY "Users can create own memories" ON public.user_memories
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own memories" ON public.user_memories;
CREATE POLICY "Users can update own memories" ON public.user_memories
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own memories" ON public.user_memories;
CREATE POLICY "Users can delete own memories" ON public.user_memories
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for conversations table (digital self conversations)
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations" ON public.conversations
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own conversations" ON public.conversations;
CREATE POLICY "Users can create own conversations" ON public.conversations
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations" ON public.conversations
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
CREATE POLICY "Users can delete own conversations" ON public.conversations
    FOR DELETE USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_memories_updated_at ON public.user_memories;
CREATE TRIGGER update_user_memories_updated_at BEFORE UPDATE ON public.user_memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();