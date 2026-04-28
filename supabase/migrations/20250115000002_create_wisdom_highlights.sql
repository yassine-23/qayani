/**
 * Wisdom Highlights System
 *
 * Extracts and stores meaningful quotes, insights, and life lessons
 * from memories, conversations, and recordings
 */

-- =====================================================
-- WISDOM HIGHLIGHTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.wisdom_highlights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Source reference
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('memory', 'conversation', 'recording')),
    source_id UUID NOT NULL,

    -- Content
    quote TEXT NOT NULL,
    context TEXT,

    -- Classification
    category VARCHAR(100) NOT NULL,
    importance INTEGER NOT NULL CHECK (importance >= 1 AND importance <= 10),
    topics TEXT[] DEFAULT '{}',
    emotional_tone VARCHAR(50) CHECK (emotional_tone IN ('inspiring', 'reflective', 'humorous', 'profound', 'practical')),

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- Unique constraint (prevent duplicates)
    UNIQUE(user_id, source_type, source_id, quote)
);

-- Create indexes
CREATE INDEX idx_wisdom_highlights_user ON public.wisdom_highlights(user_id, importance DESC);
CREATE INDEX idx_wisdom_highlights_category ON public.wisdom_highlights(category);
CREATE INDEX idx_wisdom_highlights_importance ON public.wisdom_highlights(importance DESC);
CREATE INDEX idx_wisdom_highlights_extracted_at ON public.wisdom_highlights(extracted_at DESC);
CREATE INDEX idx_wisdom_highlights_topics ON public.wisdom_highlights USING gin(topics);

-- Full-text search index for quotes
CREATE INDEX idx_wisdom_highlights_quote_search ON public.wisdom_highlights USING gin(to_tsvector('english', quote));
CREATE INDEX idx_wisdom_highlights_context_search ON public.wisdom_highlights USING gin(to_tsvector('english', context));

-- =====================================================
-- WISDOM SHARING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.wisdom_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wisdom_id UUID NOT NULL REFERENCES public.wisdom_highlights(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = public/family

    -- Sharing options
    share_type VARCHAR(50) DEFAULT 'family' CHECK (share_type IN ('family', 'public', 'private', 'specific_user')),
    message TEXT, -- Optional message when sharing

    -- Tracking
    view_count INTEGER DEFAULT 0,

    -- Timestamps
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_wisdom_shares_wisdom ON public.wisdom_shares(wisdom_id);
CREATE INDEX idx_wisdom_shares_shared_by ON public.wisdom_shares(shared_by);
CREATE INDEX idx_wisdom_shares_shared_with ON public.wisdom_shares(shared_with);
CREATE INDEX idx_wisdom_shares_type ON public.wisdom_shares(share_type);

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

/**
 * Get wisdom statistics for a user
 */
CREATE OR REPLACE FUNCTION get_user_wisdom_stats(p_user_id UUID)
RETURNS TABLE (
    total_count BIGINT,
    high_importance_count BIGINT,
    average_importance NUMERIC,
    category_counts JSONB,
    tone_counts JSONB,
    most_recent_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_count,
        COUNT(*) FILTER (WHERE importance >= 8)::BIGINT AS high_importance_count,
        ROUND(AVG(importance), 2) AS average_importance,
        jsonb_object_agg(
            category,
            category_count
        ) FILTER (WHERE category IS NOT NULL) AS category_counts,
        jsonb_object_agg(
            emotional_tone,
            tone_count
        ) FILTER (WHERE emotional_tone IS NOT NULL) AS tone_counts,
        MAX(extracted_at) AS most_recent_date
    FROM (
        SELECT
            category,
            COUNT(*) AS category_count,
            NULL::VARCHAR AS emotional_tone,
            NULL::BIGINT AS tone_count,
            importance,
            extracted_at
        FROM wisdom_highlights
        WHERE user_id = p_user_id
        GROUP BY category, importance, extracted_at

        UNION ALL

        SELECT
            NULL::VARCHAR AS category,
            NULL::BIGINT AS category_count,
            emotional_tone,
            COUNT(*) AS tone_count,
            importance,
            extracted_at
        FROM wisdom_highlights
        WHERE user_id = p_user_id
        GROUP BY emotional_tone, importance, extracted_at
    ) subquery;
END;
$$;

/**
 * Search wisdom highlights by full-text search
 */
CREATE OR REPLACE FUNCTION search_wisdom_fulltext(
    p_user_id UUID,
    p_search_query TEXT,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    quote TEXT,
    context TEXT,
    category VARCHAR,
    importance INTEGER,
    relevance REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        wh.id,
        wh.quote,
        wh.context,
        wh.category,
        wh.importance,
        ts_rank(
            to_tsvector('english', wh.quote || ' ' || COALESCE(wh.context, '')),
            plainto_tsquery('english', p_search_query)
        ) AS relevance
    FROM wisdom_highlights wh
    WHERE wh.user_id = p_user_id
        AND (
            to_tsvector('english', wh.quote) @@ plainto_tsquery('english', p_search_query)
            OR to_tsvector('english', COALESCE(wh.context, '')) @@ plainto_tsquery('english', p_search_query)
        )
    ORDER BY relevance DESC, wh.importance DESC
    LIMIT p_limit;
END;
$$;

/**
 * Get random wisdom highlight (daily wisdom feature)
 */
CREATE OR REPLACE FUNCTION get_daily_wisdom(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    id UUID,
    quote TEXT,
    context TEXT,
    category VARCHAR,
    importance INTEGER,
    emotional_tone VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        wh.id,
        wh.quote,
        wh.context,
        wh.category,
        wh.importance,
        wh.emotional_tone
    FROM wisdom_highlights wh
    WHERE wh.user_id = p_user_id
        AND wh.importance >= 6
    ORDER BY
        -- Use date as seed for deterministic randomization
        md5(p_date::TEXT || wh.id::TEXT)
    LIMIT 1;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

/**
 * Increment view count when wisdom is shared
 */
CREATE OR REPLACE FUNCTION increment_wisdom_share_views()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- This would be called by application logic when a shared wisdom is viewed
    RETURN NEW;
END;
$$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.wisdom_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wisdom_shares ENABLE ROW LEVEL SECURITY;

-- Wisdom Highlights Policies
CREATE POLICY "Users can view their own wisdom highlights"
    ON public.wisdom_highlights
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wisdom highlights"
    ON public.wisdom_highlights
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wisdom highlights"
    ON public.wisdom_highlights
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wisdom highlights"
    ON public.wisdom_highlights
    FOR DELETE
    USING (auth.uid() = user_id);

-- Wisdom Shares Policies
CREATE POLICY "Users can view wisdom shared with them"
    ON public.wisdom_shares
    FOR SELECT
    USING (
        auth.uid() = shared_by
        OR auth.uid() = shared_with
        OR share_type IN ('family', 'public')
    );

CREATE POLICY "Users can create shares"
    ON public.wisdom_shares
    FOR INSERT
    WITH CHECK (auth.uid() = shared_by);

CREATE POLICY "Users can update their own shares"
    ON public.wisdom_shares
    FOR UPDATE
    USING (auth.uid() = shared_by);

CREATE POLICY "Users can delete their own shares"
    ON public.wisdom_shares
    FOR DELETE
    USING (auth.uid() = shared_by);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.wisdom_highlights IS 'Stores extracted wisdom, insights, and memorable quotes from user content';
COMMENT ON TABLE public.wisdom_shares IS 'Tracks sharing of wisdom highlights with family and friends';
COMMENT ON FUNCTION get_user_wisdom_stats IS 'Returns comprehensive statistics about a user''s wisdom highlights';
COMMENT ON FUNCTION search_wisdom_fulltext IS 'Full-text search across wisdom quotes and context';
COMMENT ON FUNCTION get_daily_wisdom IS 'Returns a deterministic "wisdom of the day" for a user';
