-- Production Schema Deployment Script
-- Run this against your Supabase production database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for recordings
CREATE POLICY "Users can upload own recordings" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'recordings' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own recordings" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'recordings' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own recordings" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'recordings' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Create the main schema
\i supabase/schema.sql

-- Create additional functions for production

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
    UPDATE public.family_connections
    SET invitation_status = 'expired'
    WHERE invitation_status = 'pending'
    AND invited_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to get user dashboard data
CREATE OR REPLACE FUNCTION get_user_dashboard_data(user_uuid UUID)
RETURNS TABLE (
    personality_count BIGINT,
    recording_count BIGINT,
    conversation_count BIGINT,
    family_member_count BIGINT,
    recent_personalities JSON,
    recent_recordings JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.personalities WHERE user_id = user_uuid AND is_active = true),
        (SELECT COUNT(*) FROM public.recordings WHERE user_id = user_uuid),
        (SELECT COUNT(*) FROM public.conversations c
         JOIN public.personalities p ON c.personality_id = p.id
         WHERE p.user_id = user_uuid),
        (SELECT COUNT(*) FROM public.family_connections fc
         JOIN public.personalities p ON fc.personality_id = p.id
         WHERE p.user_id = user_uuid AND fc.invitation_status = 'accepted'),
        (SELECT JSON_AGG(row_to_json(t)) FROM (
            SELECT id, name, relationship_to_creator, created_at
            FROM public.personalities
            WHERE user_id = user_uuid AND is_active = true
            ORDER BY created_at DESC
            LIMIT 5
        ) t),
        (SELECT JSON_AGG(row_to_json(t)) FROM (
            SELECT r.id, r.duration, r.transcript, r.created_at, p.name as personality_name
            FROM public.recordings r
            JOIN public.personalities p ON r.personality_id = p.id
            WHERE r.user_id = user_uuid
            ORDER BY r.created_at DESC
            LIMIT 10
        ) t);
END;
$$ LANGUAGE plpgsql;

-- Create cron job for cleanup (if pg_cron is available)
-- SELECT cron.schedule('cleanup-invitations', '0 2 * * *', 'SELECT cleanup_expired_invitations();');

-- Insert default subscription tiers data
INSERT INTO public.users (id, email, full_name, subscription_tier, created_at, updated_at)
SELECT id, email, raw_user_meta_data->>'full_name', 'free', created_at, updated_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

COMMIT;