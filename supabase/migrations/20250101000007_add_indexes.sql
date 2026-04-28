-- =====================================================
-- QAYANI Database Indexes
-- Performance optimization for all major queries
-- =====================================================

-- User lookups (authentication and profile queries)
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON public.users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_subscription ON public.users(subscription_tier, subscription_status);

-- User profiles (frequently joined with users)
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_learning_phase ON public.user_profiles(learning_phase);

-- Personality queries (core entity)
CREATE INDEX IF NOT EXISTS idx_personalities_user_id ON public.personalities(user_id);
CREATE INDEX IF NOT EXISTS idx_personalities_active ON public.personalities(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_personalities_user_active ON public.personalities(user_id, is_active);

-- Recording queries (large table, needs optimization)
CREATE INDEX IF NOT EXISTS idx_recordings_personality ON public.recordings(personality_id);
CREATE INDEX IF NOT EXISTS idx_recordings_user ON public.recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON public.recordings(processing_status);
CREATE INDEX IF NOT EXISTS idx_recordings_created ON public.recordings(created_at DESC);
-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_recordings_user_status ON public.recordings(user_id, processing_status);
CREATE INDEX IF NOT EXISTS idx_recordings_personality_status ON public.recordings(personality_id, processing_status);

-- Conversation queries (potentially very large table)
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON public.conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_learning ON public.conversations(learning_phase) WHERE learning_phase = true;
-- Composite for pagination
CREATE INDEX IF NOT EXISTS idx_conversations_user_created ON public.conversations(user_id, created_at DESC);

-- User memory queries (knowledge base)
CREATE INDEX IF NOT EXISTS idx_user_memories_user ON public.user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_importance ON public.user_memories(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_memories_type ON public.user_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_user_memories_created ON public.user_memories(created_at DESC);
-- Composite for filtered queries
CREATE INDEX IF NOT EXISTS idx_user_memories_user_type ON public.user_memories(user_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_user_memories_user_importance ON public.user_memories(user_id, importance_score DESC);

-- Avatar queries (new layer 1)
CREATE INDEX IF NOT EXISTS idx_user_avatars_user ON public.user_avatars(user_id);
CREATE INDEX IF NOT EXISTS idx_user_avatars_status ON public.user_avatars(generation_status);
CREATE INDEX IF NOT EXISTS idx_user_avatars_created ON public.user_avatars(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_avatars_user_status ON public.user_avatars(user_id, generation_status);

-- Voice model queries (new layer 3)
CREATE INDEX IF NOT EXISTS idx_voice_models_user ON public.voice_models(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_models_status ON public.voice_models(training_status);
CREATE INDEX IF NOT EXISTS idx_voice_models_created ON public.voice_models(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_models_user_status ON public.voice_models(user_id, training_status);

-- Full-text search indexes (for memory and conversation search)
CREATE INDEX IF NOT EXISTS idx_user_memories_content_search ON public.user_memories USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_conversations_message_search ON public.conversations USING gin(to_tsvector('english', message));

-- Array column indexes (for tag searches)
_user_memories_topics ON public.user_memories USING gin(topics);
CREATE INDEX IF NOT EXISTS idx_user_memories_emotions ON public.user_memories USING gin(emotion_tags);

-- JSONB indexes (for metadata queries)
CREATE INDEX IF NOT EXISTS idx_personalities_traits ON public.personalities USING gin(personality_traits);
CREATE INDEX IF NOT EXISTS idx_recordings_metadata ON public.recordings USING gin(metadata);

-- Add comments for documentation
COMMENT ON INDEX idx_users_email IS 'Fast user lookup by email during authentication';
COMMENT ON INDEX idx_recordings_user_status IS 'Optimized for user recording list with status filter';
COMMENT ON INDEX idx_conversations_user_created IS 'Optimized for paginated conversation history';
COMMENT ON INDEX idx_user_memories_content_search IS 'Full-text search on memory content';

-- Performance statistics
ANALYZE public.users;
ANALYZE public.user_profiles;
ANALYZE public.personalities;
ANALYZE public.recordings;
ANALYZE public.conversations;
ANALYZE public.user_memories;
ANALYZE public.user_avatars;
ANALYZE public.voice_models;
