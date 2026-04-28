-- Eternal Platform Database Schema
-- Supabase PostgreSQL Database Structure

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends Supabase auth.users)
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

-- User Profiles (for digital self personalization)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
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
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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

-- Personalities (Digital Legacies)
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

-- Recordings
CREATE TABLE IF NOT EXISTS public.recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personality_id UUID NOT NULL REFERENCES public.personalities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    duration INTEGER, -- in seconds
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

-- Digital Self Conversations (Training conversations with AI)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    learning_phase BOOLEAN DEFAULT false,
    conversation_context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Legacy Conversations (Family interactions with personalities)
CREATE TABLE IF NOT EXISTS public.personality_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personality_id UUID NOT NULL REFERENCES public.personalities(id) ON DELETE CASCADE,
    family_member_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    message_count INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'personality', 'system')),
    sender_id UUID,
    content TEXT NOT NULL,
    voice_url TEXT,
    emotion TEXT,
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Family Connections
CREATE TABLE IF NOT EXISTS public.family_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personality_id UUID NOT NULL REFERENCES public.personalities(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    member_email TEXT NOT NULL,
    member_name TEXT,
    relationship TEXT NOT NULL,
    access_level TEXT DEFAULT 'viewer' CHECK (access_level IN ('viewer', 'contributor', 'admin')),
    invitation_token TEXT UNIQUE,
    invitation_status TEXT DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'declined', 'expired')),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    accepted_at TIMESTAMP WITH TIME ZONE
);

-- Scheduled Messages (for special dates)
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personality_id UUID NOT NULL REFERENCES public.personalities(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_email TEXT,
    trigger_date DATE NOT NULL,
    trigger_time TIME,
    recurrence_pattern TEXT CHECK (recurrence_pattern IN ('once', 'yearly', 'monthly', 'weekly')),
    message_type TEXT NOT NULL CHECK (message_type IN ('birthday', 'anniversary', 'holiday', 'custom')),
    content TEXT NOT NULL,
    voice_message_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Voice Profiles (for voice cloning)
CREATE TABLE IF NOT EXISTS public.voice_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personality_id UUID NOT NULL REFERENCES public.personalities(id) ON DELETE CASCADE,
    elevenlabs_voice_id TEXT UNIQUE,
    voice_name TEXT,
    sample_urls TEXT[] DEFAULT '{}',
    voice_settings JSONB DEFAULT '{}',
    training_status TEXT DEFAULT 'pending' CHECK (training_status IN ('pending', 'training', 'ready', 'failed')),
    quality_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    trained_at TIMESTAMP WITH TIME ZONE
);

-- Subscription History
CREATE TABLE IF NOT EXISTS public.subscription_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT,
    plan_name TEXT NOT NULL,
    plan_tier TEXT NOT NULL,
    amount INTEGER NOT NULL, -- in cents
    currency TEXT DEFAULT 'usd',
    status TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Usage Tracking
CREATE TABLE IF NOT EXISTS public.usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    usage_count INTEGER DEFAULT 1,
    usage_date DATE DEFAULT CURRENT_DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id, feature, usage_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON public.user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_memory_type ON public.user_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_user_memories_created_at ON public.user_memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_learning_phase ON public.conversations(learning_phase);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON public.conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_personalities_user_id ON public.personalities(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_personality_id ON public.recordings(personality_id);
CREATE INDEX IF NOT EXISTS idx_recordings_processing_status ON public.recordings(processing_status);
CREATE INDEX IF NOT EXISTS idx_personality_conversations_personality_id ON public.personality_conversations(personality_id);
CREATE INDEX IF NOT EXISTS idx_personality_conversations_family_member_id ON public.personality_conversations(family_member_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_connections_personality_id ON public.family_connections(personality_id);
CREATE INDEX IF NOT EXISTS idx_family_connections_member_id ON public.family_connections(member_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_trigger_date ON public.scheduled_messages(trigger_date);
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON public.subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date ON public.usage_tracking(user_id, usage_date);

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personality_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for user_profiles table
CREATE POLICY "Users can view own user profile" ON public.user_profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own user profile" ON public.user_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own user profile" ON public.user_profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own user profile" ON public.user_profiles
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for user_memories table
CREATE POLICY "Users can view own memories" ON public.user_memories
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own memories" ON public.user_memories
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own memories" ON public.user_memories
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own memories" ON public.user_memories
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for conversations table (digital self conversations)
CREATE POLICY "Users can view own conversations" ON public.conversations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own conversations" ON public.conversations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own conversations" ON public.conversations
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own conversations" ON public.conversations
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for personalities table
CREATE POLICY "Users can view own personalities" ON public.personalities
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own personalities" ON public.personalities
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own personalities" ON public.personalities
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own personalities" ON public.personalities
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for recordings table
CREATE POLICY "Users can view own recordings" ON public.recordings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own recordings" ON public.recordings
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own recordings" ON public.recordings
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own recordings" ON public.recordings
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for conversations
CREATE POLICY "Users can view own conversations" ON public.conversations
    FOR SELECT USING (family_member_id = auth.uid());

CREATE POLICY "Users can create conversations" ON public.conversations
    FOR INSERT WITH CHECK (family_member_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.family_member_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.family_member_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_memories_updated_at BEFORE UPDATE ON public.user_memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personalities_updated_at BEFORE UPDATE ON public.personalities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment message count (for personality conversations)
CREATE OR REPLACE FUNCTION increment_message_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.personality_conversations
    SET message_count = message_count + 1,
        last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to increment message count
CREATE TRIGGER increment_conversation_message_count
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION increment_message_count();

-- Function to track usage
CREATE OR REPLACE FUNCTION track_usage(
    p_user_id UUID,
    p_feature TEXT,
    p_metadata JSONB DEFAULT '{}'
) RETURNS void AS $$
BEGIN
    INSERT INTO public.usage_tracking (user_id, feature, usage_count, metadata)
    VALUES (p_user_id, p_feature, 1, p_metadata)
    ON CONFLICT (user_id, feature, usage_date)
    DO UPDATE SET usage_count = usage_tracking.usage_count + 1,
                  metadata = usage_tracking.metadata || p_metadata;
END;
$$ LANGUAGE plpgsql;