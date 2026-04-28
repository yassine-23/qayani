/**
 * Family Tree System
 *
 * Manages family relationships and multi-generational digital twin connections
 */

-- =====================================================
-- FAMILY MEMBERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Creator of the family tree
    personality_id UUID REFERENCES public.personalities(id) ON DELETE SET NULL,

    -- Member information
    name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    date_of_passing DATE,
    relationship_to_creator VARCHAR(100) NOT NULL, -- e.g., 'father', 'mother', 'son', 'daughter', 'spouse'
    generation INTEGER NOT NULL DEFAULT 0, -- 0 = creator, -1 = parents, 1 = children, -2 = grandparents, etc.

    -- Digital twin status
    has_digital_twin BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    notes TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- Constraints
    CONSTRAINT valid_dates CHECK (date_of_birth IS NULL OR date_of_passing IS NULL OR date_of_passing >= date_of_birth)
);

-- Indexes
CREATE INDEX idx_family_members_user ON public.family_members(user_id);
CREATE INDEX idx_family_members_personality ON public.family_members(personality_id);
CREATE INDEX idx_family_members_generation ON public.family_members(generation);
CREATE INDEX idx_family_members_relationship ON public.family_members(relationship_to_creator);

-- =====================================================
-- FAMILY RELATIONSHIPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.family_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Relationship definition
    member_a_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    member_b_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    relationship_type VARCHAR(100) NOT NULL, -- 'parent', 'child', 'spouse', 'sibling'

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- Constraints
    CONSTRAINT different_members CHECK (member_a_id != member_b_id),
    CONSTRAINT valid_relationship CHECK (relationship_type IN ('parent', 'child', 'spouse', 'sibling', 'grandparent', 'grandchild', 'aunt', 'uncle', 'cousin'))
);

-- Indexes
CREATE INDEX idx_family_relationships_user ON public.family_relationships(user_id);
CREATE INDEX idx_family_relationships_member_a ON public.family_relationships(member_a_id);
CREATE INDEX idx_family_relationships_member_b ON public.family_relationships(member_b_id);
CREATE INDEX idx_family_relationships_type ON public.family_relationships(relationship_type);

-- =====================================================
-- FAMILY TREE INVITATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.family_tree_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    family_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,

    -- Invitation details
    invited_email VARCHAR(255) NOT NULL,
    invitation_code VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),

    -- Optional message
    message TEXT,

    -- Timestamps
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) + INTERVAL '30 days',
    responded_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_family_invitations_invited_by ON public.family_tree_invitations(invited_by);
CREATE INDEX idx_family_invitations_email ON public.family_tree_invitations(invited_email);
CREATE INDEX idx_family_invitations_code ON public.family_tree_invitations(invitation_code);
CREATE INDEX idx_family_invitations_status ON public.family_tree_invitations(status);

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

/**
 * Get family tree for a user
 */
CREATE OR REPLACE FUNCTION get_family_tree(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    date_of_birth DATE,
    date_of_passing DATE,
    relationship_to_creator VARCHAR,
    generation INTEGER,
    has_digital_twin BOOLEAN,
    avatar_url TEXT,
    personality_id UUID,
    notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fm.id,
        fm.name,
        fm.date_of_birth,
        fm.date_of_passing,
        fm.relationship_to_creator,
        fm.generation,
        fm.has_digital_twin,
        fm.avatar_url,
        fm.personality_id,
        fm.notes
    FROM family_members fm
    WHERE fm.user_id = p_user_id
    ORDER BY fm.generation ASC, fm.created_at ASC;
END;
$$;

/**
 * Get family member with relationships
 */
CREATE OR REPLACE FUNCTION get_family_member_details(
    p_member_id UUID,
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'member', row_to_json(fm),
        'relationships', (
            SELECT json_agg(
                json_build_object(
                    'id', fr.id,
                    'type', fr.relationship_type,
                    'relatedMember', row_to_json(fm2)
                )
            )
            FROM family_relationships fr
            LEFT JOIN family_members fm2 ON (
                CASE
                    WHEN fr.member_a_id = p_member_id THEN fr.member_b_id
                    ELSE fr.member_a_id
                END = fm2.id
            )
            WHERE (fr.member_a_id = p_member_id OR fr.member_b_id = p_member_id)
                AND fr.user_id = p_user_id
        ),
        'digitalTwin', (
            SELECT row_to_json(p)
            FROM personalities p
            WHERE p.id = fm.personality_id
        )
    )
    INTO result
    FROM family_members fm
    WHERE fm.id = p_member_id AND fm.user_id = p_user_id;

    RETURN result;
END;
$$;

/**
 * Get family statistics
 */
CREATE OR REPLACE FUNCTION get_family_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'totalMembers', COUNT(*),
        'livingMembers', COUNT(*) FILTER (WHERE date_of_passing IS NULL),
        'deceasedMembers', COUNT(*) FILTER (WHERE date_of_passing IS NOT NULL),
        'digitalTwins', COUNT(*) FILTER (WHERE has_digital_twin = TRUE),
        'byGeneration', (
            SELECT json_object_agg(generation, count)
            FROM (
                SELECT generation, COUNT(*) as count
                FROM family_members
                WHERE user_id = p_user_id
                GROUP BY generation
            ) gen_counts
        ),
        'byRelationship', (
            SELECT json_object_agg(relationship_to_creator, count)
            FROM (
                SELECT relationship_to_creator, COUNT(*) as count
                FROM family_members
                WHERE user_id = p_user_id
                GROUP BY relationship_to_creator
            ) rel_counts
        )
    )
    INTO result
    FROM family_members
    WHERE user_id = p_user_id;

    RETURN result;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

/**
 * Update timestamp on family member update
 */
CREATE OR REPLACE FUNCTION update_family_member_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_family_member_timestamp
    BEFORE UPDATE ON family_members
    FOR EACH ROW
    EXECUTE FUNCTION update_family_member_timestamp();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_tree_invitations ENABLE ROW LEVEL SECURITY;

-- Family Members Policies
CREATE POLICY "Users can view their own family members"
    ON public.family_members
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own family members"
    ON public.family_members
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own family members"
    ON public.family_members
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own family members"
    ON public.family_members
    FOR DELETE
    USING (auth.uid() = user_id);

-- Family Relationships Policies
CREATE POLICY "Users can view their own family relationships"
    ON public.family_relationships
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own family relationships"
    ON public.family_relationships
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own family relationships"
    ON public.family_relationships
    FOR DELETE
    USING (auth.uid() = user_id);

-- Family Tree Invitations Policies
CREATE POLICY "Users can view invitations they sent"
    ON public.family_tree_invitations
    FOR SELECT
    USING (auth.uid() = invited_by);

CREATE POLICY "Users can view invitations sent to their email"
    ON public.family_tree_invitations
    FOR SELECT
    USING (auth.email() = invited_email);

CREATE POLICY "Users can create invitations"
    ON public.family_tree_invitations
    FOR INSERT
    WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Users can update their own invitations"
    ON public.family_tree_invitations
    FOR UPDATE
    USING (auth.uid() = invited_by OR auth.email() = invited_email);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.family_members IS 'Stores family tree members with their relationships and digital twin status';
COMMENT ON TABLE public.family_relationships IS 'Defines relationships between family members';
COMMENT ON TABLE public.family_tree_invitations IS 'Manages invitations for family members to join and create their digital twins';
COMMENT ON FUNCTION get_family_tree IS 'Returns the complete family tree for a user';
COMMENT ON FUNCTION get_family_member_details IS 'Returns detailed information about a specific family member including relationships';
COMMENT ON FUNCTION get_family_stats IS 'Returns statistics about a user''s family tree';
