-- Live Chat Mode Schema
-- Real-time voice conversation sessions with complete data persistence

-- Live Chat Sessions Table
CREATE TABLE IF NOT EXISTS public.live_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    personality_id UUID REFERENCES public.personalities(id) ON DELETE CASCADE,

    -- Session metadata
    title TEXT,
    session_type TEXT DEFAULT 'live_voice' CHECK (session_type IN ('live_voice', 'live_text', 'hybrid')),
    session_status TEXT DEFAULT 'active' CHECK (session_status IN ('active', 'paused', 'completed', 'interrupted')),

    -- Duration tracking
    started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    ended_at TIMESTAMP WITH TIME ZONE,
    total_duration_seconds INTEGER DEFAULT 0,
    active_talk_time_seconds INTEGER DEFAULT 0,

    -- Message counts
    message_count INTEGER DEFAULT 0,
    user_message_count INTEGER DEFAULT 0,
    ai_message_count INTEGER DEFAULT 0,

    -- Quality metrics
    average_latency_ms INTEGER,
    audio_quality_score DECIMAL(3,2),
    user_satisfaction_rating INTEGER CHECK (user_satisfaction_rating BETWEEN 1 AND 5),
    user_feedback TEXT,

    -- Technical details
    model_used TEXT DEFAULT 'gpt-4o-realtime-preview',
    voice_used TEXT DEFAULT 'shimmer',
    interruption_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,

    -- Context and state
    conversation_context JSONB DEFAULT '{}',
    session_metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Live Chat Messages Table
CREATE TABLE IF NOT EXISTS public.live_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.live_chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Message content
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'audio', 'both')),

    -- Audio metadata
    audio_url TEXT,
    audio_duration_ms INTEGER,
    audio_transcript TEXT,
    audio_confidence_score DECIMAL(3,2),

    -- Timing
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    latency_ms INTEGER,
    processing_time_ms INTEGER,

    -- Emotion and sentiment
    emotion_detected TEXT,
    sentiment_score DECIMAL(3,2),
    tone_analysis JSONB DEFAULT '{}',

    -- Message metadata
    is_interruption BOOLEAN DEFAULT false,
    interrupted_message_id UUID REFERENCES public.live_chat_messages(id),
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Live Chat Analytics Table
CREATE TABLE IF NOT EXISTS public.live_chat_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.live_chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Performance metrics
    avg_response_time_ms INTEGER,
    min_response_time_ms INTEGER,
    max_response_time_ms INTEGER,
    total_audio_duration_seconds INTEGER,

    -- Conversation quality
    conversation_flow_score DECIMAL(3,2),
    naturalness_score DECIMAL(3,2),
    engagement_score DECIMAL(3,2),

    -- Topic tracking
    topics_discussed TEXT[] DEFAULT '{}',
    main_topic TEXT,
    conversation_summary TEXT,

    -- User behavior
    user_interruptions INTEGER DEFAULT 0,
    user_pauses_count INTEGER DEFAULT 0,
    avg_user_response_time_ms INTEGER,

    -- Wisdom extraction
    wisdom_extracted TEXT[] DEFAULT '{}',
    important_moments TEXT[] DEFAULT '{}',

    -- RAG context used
    memories_referenced INTEGER DEFAULT 0,
    context_relevance_score DECIMAL(3,2),

    -- Metadata
    analysis_metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Live Chat Recordings Table (for storing full audio sessions)
CREATE TABLE IF NOT EXISTS public.live_chat_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.live_chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Recording details
    recording_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    duration_seconds INTEGER,
    format TEXT DEFAULT 'webm',

    -- Processing
    is_processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    transcript_url TEXT,

    -- Storage
    storage_bucket TEXT DEFAULT 'live-chat-recordings',
    storage_path TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_chat_sessions_user_id ON public.live_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_live_chat_sessions_status ON public.live_chat_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_live_chat_sessions_started_at ON public.live_chat_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_chat_sessions_personality_id ON public.live_chat_sessions(personality_id);

CREATE INDEX IF NOT EXISTS idx_live_chat_messages_session_id ON public.live_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_user_id ON public.live_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_timestamp ON public.live_chat_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_role ON public.live_chat_messages(role);

CREATE INDEX IF NOT EXISTS idx_live_chat_analytics_session_id ON public.live_chat_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_live_chat_analytics_user_id ON public.live_chat_analytics(user_id);

CREATE INDEX IF NOT EXISTS idx_live_chat_recordings_session_id ON public.live_chat_recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_live_chat_recordings_user_id ON public.live_chat_recordings(user_id);

-- Row Level Security (RLS) Policies

ALTER TABLE public.live_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_recordings ENABLE ROW LEVEL SECURITY;

-- Live chat sessions policies
CREATE POLICY "Users can view own live chat sessions" ON public.live_chat_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own live chat sessions" ON public.live_chat_sessions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own live chat sessions" ON public.live_chat_sessions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own live chat sessions" ON public.live_chat_sessions
    FOR DELETE USING (user_id = auth.uid());

-- Live chat messages policies
CREATE POLICY "Users can view own live chat messages" ON public.live_chat_messages
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own live chat messages" ON public.live_chat_messages
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Live chat analytics policies
CREATE POLICY "Users can view own live chat analytics" ON public.live_chat_analytics
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own live chat analytics" ON public.live_chat_analytics
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own live chat analytics" ON public.live_chat_analytics
    FOR UPDATE USING (user_id = auth.uid());

-- Live chat recordings policies
CREATE POLICY "Users can view own live chat recordings" ON public.live_chat_recordings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own live chat recordings" ON public.live_chat_recordings
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own live chat recordings" ON public.live_chat_recordings
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own live chat recordings" ON public.live_chat_recordings
    FOR DELETE USING (user_id = auth.uid());

-- Functions for analytics and aggregation

-- Function to update session duration
CREATE OR REPLACE FUNCTION update_live_chat_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
        NEW.total_duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
    END IF;
    NEW.updated_at := TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_live_chat_session_duration
    BEFORE UPDATE ON public.live_chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_live_chat_session_duration();

-- Function to increment message count
CREATE OR REPLACE FUNCTION increment_live_chat_message_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.live_chat_sessions
    SET
        message_count = message_count + 1,
        user_message_count = CASE WHEN NEW.role = 'user' THEN user_message_count + 1 ELSE user_message_count END,
        ai_message_count = CASE WHEN NEW.role = 'assistant' THEN ai_message_count + 1 ELSE ai_message_count END,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_live_chat_message_count
    AFTER INSERT ON public.live_chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION increment_live_chat_message_count();

-- View for session summaries
CREATE OR REPLACE VIEW live_chat_session_summaries AS
SELECT
    s.id,
    s.user_id,
    s.personality_id,
    s.title,
    s.session_status,
    s.started_at,
    s.ended_at,
    s.total_duration_seconds,
    s.message_count,
    s.user_satisfaction_rating,
    s.model_used,
    s.voice_used,
    a.conversation_summary,
    a.main_topic,
    a.engagement_score,
    COUNT(DISTINCT m.id) as actual_message_count,
    MAX(m.timestamp) as last_message_at
FROM public.live_chat_sessions s
LEFT JOIN public.live_chat_analytics a ON s.id = a.session_id
LEFT JOIN public.live_chat_messages m ON s.id = m.session_id
GROUP BY s.id, s.user_id, s.personality_id, s.title, s.session_status,
         s.started_at, s.ended_at, s.total_duration_seconds, s.message_count,
         s.user_satisfaction_rating, s.model_used, s.voice_used,
         a.conversation_summary, a.main_topic, a.engagement_score;

-- Grant permissions to authenticated users
GRANT SELECT ON live_chat_session_summaries TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.live_chat_sessions IS 'Stores metadata for live voice chat sessions';
COMMENT ON TABLE public.live_chat_messages IS 'Individual messages within live chat sessions';
COMMENT ON TABLE public.live_chat_analytics IS 'Analytics and quality metrics for live chat sessions';
COMMENT ON TABLE public.live_chat_recordings IS 'Full audio recordings of live chat sessions';
