/**
 * Vector Embeddings System for Semantic Search
 *
 * Enables semantic search across memories, conversations, and recordings
 * Uses pgvector extension for efficient similarity search
 */

-- =====================================================
-- ENABLE PGVECTOR EXTENSION
-- =====================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- MEMORY EMBEDDINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.memory_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    memory_id UUID REFERENCES public.user_memories(id) ON DELETE CASCADE,

    -- Content reference
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('memory', 'conversation', 'recording', 'profile')),
    content_id UUID NOT NULL,
    content_snippet TEXT, -- First 500 chars for preview

    -- Vector embedding (OpenAI ada-002 produces 1536 dimensions)
    embedding vector(1536) NOT NULL,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- Unique constraint
    UNIQUE(content_type, content_id)
);

-- Create indexes for fast similarity search
CREATE INDEX idx_memory_embeddings_user ON public.memory_embeddings(user_id);
CREATE INDEX idx_memory_embeddings_type ON public.memory_embeddings(content_type);
CREATE INDEX idx_memory_embeddings_memory ON public.memory_embeddings(memory_id);

-- Vector similarity index (HNSW for fast approximate nearest neighbor search)
CREATE INDEX idx_memory_embeddings_vector ON public.memory_embeddings
USING hnsw (embedding vector_cosine_ops);

-- =====================================================
-- CONVERSATION EMBEDDINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.conversation_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    message_id UUID REFERENCES public.conversation_history(id) ON DELETE CASCADE,

    -- Content
    role VARCHAR(50) NOT NULL,
    content_snippet TEXT,

    -- Vector embedding
    embedding vector(1536) NOT NULL,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- Unique constraint
    UNIQUE(message_id)
);

-- Indexes
CREATE INDEX idx_conversation_embeddings_user ON public.conversation_embeddings(user_id);
CREATE INDEX idx_conversation_embeddings_session ON public.conversation_embeddings(session_id);
CREATE INDEX idx_conversation_embeddings_vector ON public.conversation_embeddings
USING hnsw (embedding vector_cosine_ops);

-- =====================================================
-- SEMANTIC SEARCH FUNCTION
-- =====================================================

/**
 * Search memories by semantic similarity
 */
CREATE OR REPLACE FUNCTION search_memories_by_similarity(
    p_user_id UUID,
    p_query_embedding vector(1536),
    p_match_threshold FLOAT DEFAULT 0.7,
    p_match_count INTEGER DEFAULT 10,
    p_content_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content_type VARCHAR,
    content_id UUID,
    content_snippet TEXT,
    similarity FLOAT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        me.id,
        me.content_type,
        me.content_id,
        me.content_snippet,
        1 - (me.embedding <=> p_query_embedding) AS similarity,
        me.metadata,
        me.created_at
    FROM memory_embeddings me
    WHERE me.user_id = p_user_id
        AND (p_content_type IS NULL OR me.content_type = p_content_type)
        AND (1 - (me.embedding <=> p_query_embedding)) > p_match_threshold
    ORDER BY me.embedding <=> p_query_embedding
    LIMIT p_match_count;
END;
$$;

/**
 * Search conversations by semantic similarity
 */
CREATE OR REPLACE FUNCTION search_conversations_by_similarity(
    p_user_id UUID,
    p_query_embedding vector(1536),
    p_match_threshold FLOAT DEFAULT 0.7,
    p_match_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    session_id UUID,
    message_id UUID,
    role VARCHAR,
    content_snippet TEXT,
    similarity FLOAT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.id,
        ce.session_id,
        ce.message_id,
        ce.role,
        ce.content_snippet,
        1 - (ce.embedding <=> p_query_embedding) AS similarity,
        ce.created_at
    FROM conversation_embeddings ce
    WHERE ce.user_id = p_user_id
        AND (1 - (ce.embedding <=> p_query_embedding)) > p_match_threshold
    ORDER BY ce.embedding <=> p_query_embedding
    LIMIT p_match_count;
END;
$$;

/**
 * Hybrid search: Search both memories and conversations
 */
CREATE OR REPLACE FUNCTION search_all_content_by_similarity(
    p_user_id UUID,
    p_query_embedding vector(1536),
    p_match_threshold FLOAT DEFAULT 0.7,
    p_match_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    source_type VARCHAR,
    content_id UUID,
    content_snippet TEXT,
    similarity FLOAT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH combined_results AS (
        -- Memory embeddings
        SELECT
            me.id,
            'memory' AS source_type,
            me.content_id,
            me.content_snippet,
            1 - (me.embedding <=> p_query_embedding) AS similarity,
            me.metadata,
            me.created_at
        FROM memory_embeddings me
        WHERE me.user_id = p_user_id
            AND (1 - (me.embedding <=> p_query_embedding)) > p_match_threshold

        UNION ALL

        -- Conversation embeddings
        SELECT
            ce.id,
            'conversation' AS source_type,
            ce.message_id AS content_id,
            ce.content_snippet,
            1 - (ce.embedding <=> p_query_embedding) AS similarity,
            jsonb_build_object('session_id', ce.session_id, 'role', ce.role) AS metadata,
            ce.created_at
        FROM conversation_embeddings ce
        WHERE ce.user_id = p_user_id
            AND (1 - (ce.embedding <=> p_query_embedding)) > p_match_threshold
    )
    SELECT *
    FROM combined_results
    ORDER BY similarity DESC
    LIMIT p_match_count;
END;
$$;

-- =====================================================
-- AUTOMATIC EMBEDDING TRIGGER FUNCTIONS
-- =====================================================

/**
 * Function to mark content as needing embedding generation
 * (Actual embedding generation happens via API/background job)
 */
CREATE TABLE IF NOT EXISTS public.embedding_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL,
    content_id UUID NOT NULL,
    content_text TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    processed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(content_type, content_id)
);

CREATE INDEX idx_embedding_queue_status ON public.embedding_queue(status, created_at);
CREATE INDEX idx_embedding_queue_user ON public.embedding_queue(user_id);

/**
 * Trigger: Add new memories to embedding queue
 */
CREATE OR REPLACE FUNCTION queue_memory_for_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO embedding_queue (user_id, content_type, content_id, content_text)
    VALUES (NEW.user_id, 'memory', NEW.id, NEW.content)
    ON CONFLICT (content_type, content_id)
    DO UPDATE SET
        content_text = EXCLUDED.content_text,
        status = 'pending',
        created_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_queue_memory_embedding
    AFTER INSERT OR UPDATE OF content ON user_memories
    FOR EACH ROW
    EXECUTE FUNCTION queue_memory_for_embedding();

/**
 * Trigger: Add new conversation messages to embedding queue
 */
CREATE OR REPLACE FUNCTION queue_conversation_for_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only embed user messages (not system or assistant messages for now)
    IF NEW.role IN ('user', 'human') THEN
        INSERT INTO embedding_queue (user_id, content_type, content_id, content_text)
        VALUES (NEW.user_id, 'conversation', NEW.id, NEW.content)
        ON CONFLICT (content_type, content_id)
        DO UPDATE SET
            content_text = EXCLUDED.content_text,
            status = 'pending',
            created_at = TIMEZONE('utc', NOW());
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_queue_conversation_embedding
    AFTER INSERT ON conversation_history
    FOR EACH ROW
    EXECUTE FUNCTION queue_conversation_for_embedding();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.memory_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embedding_queue ENABLE ROW LEVEL SECURITY;

-- Memory Embeddings Policies
CREATE POLICY "Users can view their own memory embeddings"
    ON public.memory_embeddings
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memory embeddings"
    ON public.memory_embeddings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memory embeddings"
    ON public.memory_embeddings
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memory embeddings"
    ON public.memory_embeddings
    FOR DELETE
    USING (auth.uid() = user_id);

-- Conversation Embeddings Policies
CREATE POLICY "Users can view their own conversation embeddings"
    ON public.conversation_embeddings
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversation embeddings"
    ON public.conversation_embeddings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Embedding Queue Policies
CREATE POLICY "Users can view their own embedding queue"
    ON public.embedding_queue
    FOR SELECT
    USING (auth.uid() = user_id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.memory_embeddings IS 'Stores vector embeddings for semantic search across memories';
COMMENT ON TABLE public.conversation_embeddings IS 'Stores vector embeddings for semantic search across conversations';
COMMENT ON TABLE public.embedding_queue IS 'Queue for content needing embedding generation';
COMMENT ON FUNCTION search_memories_by_similarity IS 'Semantic similarity search for memories';
COMMENT ON FUNCTION search_conversations_by_similarity IS 'Semantic similarity search for conversations';
COMMENT ON FUNCTION search_all_content_by_similarity IS 'Hybrid semantic search across all content types';
