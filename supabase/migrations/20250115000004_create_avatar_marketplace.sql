/**
 * Avatar Marketplace System
 *
 * Enables users to buy, sell, and rent custom 3D avatars
 * Includes avatar customization, pricing, and transaction management
 */

-- =====================================================
-- AVATAR MARKETPLACE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.avatar_marketplace (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Owner information
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    avatar_id UUID REFERENCES public.avatars(id) ON DELETE CASCADE,

    -- Listing details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'realistic', 'cartoon', 'anime', 'fantasy', 'sci-fi', 'celebrity'
    tags TEXT[], -- ['professional', 'gaming', 'business', 'casual']

    -- Pricing
    listing_type VARCHAR(50) NOT NULL CHECK (listing_type IN ('sale', 'rent', 'both')),
    sale_price DECIMAL(10, 2), -- One-time purchase price
    rent_price_hourly DECIMAL(10, 2), -- Hourly rental rate
    rent_price_daily DECIMAL(10, 2), -- Daily rental rate
    rent_price_monthly DECIMAL(10, 2), -- Monthly rental rate

    -- Avatar assets
    avatar_url TEXT NOT NULL, -- Ready Player Me URL or custom model URL
    thumbnail_url TEXT,
    preview_images TEXT[], -- Array of preview image URLs

    -- Customization options (JSON)
    customization_options JSONB DEFAULT '{}', -- Colors, accessories, clothing, etc.

    -- Stats and visibility
    view_count INTEGER DEFAULT 0,
    purchase_count INTEGER DEFAULT 0,
    rental_count INTEGER DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0.00, -- Average rating 0.00 - 5.00
    review_count INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'rented', 'inactive', 'pending_review')),
    is_featured BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE, -- Verified by admin for quality

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- Constraints
    CONSTRAINT valid_pricing CHECK (
        (listing_type = 'sale' AND sale_price > 0) OR
        (listing_type = 'rent' AND (rent_price_hourly > 0 OR rent_price_daily > 0 OR rent_price_monthly > 0)) OR
        (listing_type = 'both' AND sale_price > 0 AND (rent_price_hourly > 0 OR rent_price_daily > 0 OR rent_price_monthly > 0))
    )
);

-- Indexes
CREATE INDEX idx_marketplace_creator ON public.avatar_marketplace(creator_id);
CREATE INDEX idx_marketplace_category ON public.avatar_marketplace(category);
CREATE INDEX idx_marketplace_status ON public.avatar_marketplace(status);
CREATE INDEX idx_marketplace_featured ON public.avatar_marketplace(is_featured);
CREATE INDEX idx_marketplace_price ON public.avatar_marketplace(sale_price);
CREATE INDEX idx_marketplace_rating ON public.avatar_marketplace(rating);
CREATE INDEX idx_marketplace_tags ON public.avatar_marketplace USING GIN(tags);

-- =====================================================
-- AVATAR TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.avatar_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Transaction parties
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES public.avatar_marketplace(id) ON DELETE CASCADE,

    -- Transaction details
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('purchase', 'rental')),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',

    -- Rental specific
    rental_duration_type VARCHAR(50), -- 'hourly', 'daily', 'monthly'
    rental_start_date TIMESTAMP WITH TIME ZONE,
    rental_end_date TIMESTAMP WITH TIME ZONE,
    rental_status VARCHAR(50) CHECK (rental_status IN ('active', 'expired', 'cancelled', 'returned')),

    -- Payment
    payment_method VARCHAR(100),
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_intent_id VARCHAR(255), -- Stripe payment intent ID

    -- Platform fee (10% default)
    platform_fee DECIMAL(10, 2),
    seller_earnings DECIMAL(10, 2),

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_rental_dates CHECK (
        transaction_type != 'rental' OR
        (rental_start_date IS NOT NULL AND rental_end_date IS NOT NULL AND rental_end_date > rental_start_date)
    )
);

-- Indexes
CREATE INDEX idx_transactions_buyer ON public.avatar_transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON public.avatar_transactions(seller_id);
CREATE INDEX idx_transactions_listing ON public.avatar_transactions(listing_id);
CREATE INDEX idx_transactions_status ON public.avatar_transactions(payment_status);
CREATE INDEX idx_transactions_type ON public.avatar_transactions(transaction_type);

-- =====================================================
-- AVATAR REVIEWS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.avatar_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Review details
    listing_id UUID NOT NULL REFERENCES public.avatar_marketplace(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.avatar_transactions(id) ON DELETE SET NULL,

    -- Rating and review
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    review_text TEXT,

    -- Pros/Cons
    pros TEXT[],
    cons TEXT[],

    -- Images
    review_images TEXT[],

    -- Helpful votes
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'flagged', 'deleted')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- Constraints
    CONSTRAINT one_review_per_transaction UNIQUE (transaction_id, reviewer_id)
);

-- Indexes
CREATE INDEX idx_reviews_listing ON public.avatar_reviews(listing_id);
CREATE INDEX idx_reviews_reviewer ON public.avatar_reviews(reviewer_id);
CREATE INDEX idx_reviews_rating ON public.avatar_reviews(rating);

-- =====================================================
-- USER AVATAR INVENTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_avatar_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- User and avatar
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES public.avatar_marketplace(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.avatar_transactions(id) ON DELETE SET NULL,

    -- Ownership
    ownership_type VARCHAR(50) NOT NULL CHECK (ownership_type IN ('purchased', 'rented', 'created')),

    -- Rental details
    rental_expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Usage stats
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- Constraints
    CONSTRAINT unique_user_avatar UNIQUE (user_id, listing_id)
);

-- Indexes
CREATE INDEX idx_inventory_user ON public.user_avatar_inventory(user_id);
CREATE INDEX idx_inventory_listing ON public.user_avatar_inventory(listing_id);
CREATE INDEX idx_inventory_ownership ON public.user_avatar_inventory(ownership_type);
CREATE INDEX idx_inventory_active ON public.user_avatar_inventory(is_active);

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

/**
 * Get featured avatars for marketplace homepage
 */
CREATE OR REPLACE FUNCTION get_featured_avatars(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    description TEXT,
    category VARCHAR,
    tags TEXT[],
    sale_price DECIMAL,
    rent_price_daily DECIMAL,
    thumbnail_url TEXT,
    rating DECIMAL,
    review_count INTEGER,
    creator_name VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        am.id,
        am.title,
        am.description,
        am.category,
        am.tags,
        am.sale_price,
        am.rent_price_daily,
        am.thumbnail_url,
        am.rating,
        am.review_count,
        COALESCE(up.full_name, u.email) as creator_name
    FROM avatar_marketplace am
    LEFT JOIN auth.users u ON am.creator_id = u.id
    LEFT JOIN user_profiles up ON am.creator_id = up.user_id
    WHERE am.status = 'active' AND am.is_featured = TRUE
    ORDER BY am.rating DESC, am.purchase_count DESC
    LIMIT p_limit;
END;
$$;

/**
 * Search avatars in marketplace
 */
CREATE OR REPLACE FUNCTION search_avatars(
    p_search_query TEXT DEFAULT '',
    p_category VARCHAR DEFAULT NULL,
    p_min_price DECIMAL DEFAULT 0,
    p_max_price DECIMAL DEFAULT 9999999,
    p_sort_by VARCHAR DEFAULT 'popular', -- 'popular', 'newest', 'price_low', 'price_high', 'rating'
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    description TEXT,
    category VARCHAR,
    tags TEXT[],
    sale_price DECIMAL,
    rent_price_daily DECIMAL,
    thumbnail_url TEXT,
    rating DECIMAL,
    review_count INTEGER,
    purchase_count INTEGER,
    creator_name VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        am.id,
        am.title,
        am.description,
        am.category,
        am.tags,
        am.sale_price,
        am.rent_price_daily,
        am.thumbnail_url,
        am.rating,
        am.review_count,
        am.purchase_count,
        COALESCE(up.full_name, u.email) as creator_name
    FROM avatar_marketplace am
    LEFT JOIN auth.users u ON am.creator_id = u.id
    LEFT JOIN user_profiles up ON am.creator_id = up.user_id
    WHERE am.status = 'active'
        AND (p_search_query = '' OR am.title ILIKE '%' || p_search_query || '%' OR am.description ILIKE '%' || p_search_query || '%')
        AND (p_category IS NULL OR am.category = p_category)
        AND (am.sale_price IS NULL OR am.sale_price BETWEEN p_min_price AND p_max_price)
    ORDER BY
        CASE WHEN p_sort_by = 'popular' THEN am.purchase_count END DESC,
        CASE WHEN p_sort_by = 'newest' THEN am.created_at END DESC,
        CASE WHEN p_sort_by = 'price_low' THEN am.sale_price END ASC,
        CASE WHEN p_sort_by = 'price_high' THEN am.sale_price END DESC,
        CASE WHEN p_sort_by = 'rating' THEN am.rating END DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

/**
 * Get user's avatar inventory
 */
CREATE OR REPLACE FUNCTION get_user_inventory(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    listing_id UUID,
    title VARCHAR,
    thumbnail_url TEXT,
    ownership_type VARCHAR,
    rental_expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN,
    times_used INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        inv.id,
        inv.listing_id,
        am.title,
        am.thumbnail_url,
        inv.ownership_type,
        inv.rental_expires_at,
        inv.is_active,
        inv.times_used
    FROM user_avatar_inventory inv
    JOIN avatar_marketplace am ON inv.listing_id = am.id
    WHERE inv.user_id = p_user_id
    ORDER BY inv.acquired_at DESC;
END;
$$;

/**
 * Process avatar purchase
 */
CREATE OR REPLACE FUNCTION process_avatar_purchase(
    p_buyer_id UUID,
    p_listing_id UUID,
    p_amount DECIMAL,
    p_payment_intent_id VARCHAR
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seller_id UUID;
    v_transaction_id UUID;
    v_platform_fee DECIMAL;
    v_seller_earnings DECIMAL;
BEGIN
    -- Get seller ID
    SELECT creator_id INTO v_seller_id
    FROM avatar_marketplace
    WHERE id = p_listing_id;

    -- Calculate fees (10% platform fee)
    v_platform_fee := p_amount * 0.10;
    v_seller_earnings := p_amount - v_platform_fee;

    -- Create transaction
    INSERT INTO avatar_transactions (
        buyer_id,
        seller_id,
        listing_id,
        transaction_type,
        amount,
        platform_fee,
        seller_earnings,
        payment_intent_id,
        payment_status,
        completed_at
    ) VALUES (
        p_buyer_id,
        v_seller_id,
        p_listing_id,
        'purchase',
        p_amount,
        v_platform_fee,
        v_seller_earnings,
        p_payment_intent_id,
        'completed',
        TIMEZONE('utc', NOW())
    )
    RETURNING id INTO v_transaction_id;

    -- Add to buyer's inventory
    INSERT INTO user_avatar_inventory (
        user_id,
        listing_id,
        transaction_id,
        ownership_type,
        is_active
    ) VALUES (
        p_buyer_id,
        p_listing_id,
        v_transaction_id,
        'purchased',
        TRUE
    );

    -- Update marketplace stats
    UPDATE avatar_marketplace
    SET purchase_count = purchase_count + 1,
        status = 'sold'
    WHERE id = p_listing_id;

    RETURN v_transaction_id;
END;
$$;

/**
 * Process avatar rental
 */
CREATE OR REPLACE FUNCTION process_avatar_rental(
    p_buyer_id UUID,
    p_listing_id UUID,
    p_amount DECIMAL,
    p_rental_duration_type VARCHAR,
    p_rental_days INTEGER,
    p_payment_intent_id VARCHAR
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seller_id UUID;
    v_transaction_id UUID;
    v_platform_fee DECIMAL;
    v_seller_earnings DECIMAL;
    v_rental_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get seller ID
    SELECT creator_id INTO v_seller_id
    FROM avatar_marketplace
    WHERE id = p_listing_id;

    -- Calculate rental end date
    v_rental_end_date := TIMEZONE('utc', NOW()) + (p_rental_days || ' days')::INTERVAL;

    -- Calculate fees (10% platform fee)
    v_platform_fee := p_amount * 0.10;
    v_seller_earnings := p_amount - v_platform_fee;

    -- Create transaction
    INSERT INTO avatar_transactions (
        buyer_id,
        seller_id,
        listing_id,
        transaction_type,
        amount,
        platform_fee,
        seller_earnings,
        rental_duration_type,
        rental_start_date,
        rental_end_date,
        rental_status,
        payment_intent_id,
        payment_status,
        completed_at
    ) VALUES (
        p_buyer_id,
        v_seller_id,
        p_listing_id,
        'rental',
        p_amount,
        v_platform_fee,
        v_seller_earnings,
        p_rental_duration_type,
        TIMEZONE('utc', NOW()),
        v_rental_end_date,
        'active',
        p_payment_intent_id,
        'completed',
        TIMEZONE('utc', NOW())
    )
    RETURNING id INTO v_transaction_id;

    -- Add to buyer's inventory
    INSERT INTO user_avatar_inventory (
        user_id,
        listing_id,
        transaction_id,
        ownership_type,
        rental_expires_at,
        is_active
    ) VALUES (
        p_buyer_id,
        p_listing_id,
        v_transaction_id,
        'rented',
        v_rental_end_date,
        TRUE
    );

    -- Update marketplace stats
    UPDATE avatar_marketplace
    SET rental_count = rental_count + 1
    WHERE id = p_listing_id;

    RETURN v_transaction_id;
END;
$$;

/**
 * Update avatar listing rating
 */
CREATE OR REPLACE FUNCTION update_avatar_rating(p_listing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_avg_rating DECIMAL;
    v_review_count INTEGER;
BEGIN
    SELECT AVG(rating), COUNT(*)
    INTO v_avg_rating, v_review_count
    FROM avatar_reviews
    WHERE listing_id = p_listing_id AND status = 'active';

    UPDATE avatar_marketplace
    SET rating = COALESCE(v_avg_rating, 0),
        review_count = v_review_count
    WHERE id = p_listing_id;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

/**
 * Update timestamp on marketplace listing update
 */
CREATE OR REPLACE FUNCTION update_marketplace_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_marketplace_timestamp
    BEFORE UPDATE ON avatar_marketplace
    FOR EACH ROW
    EXECUTE FUNCTION update_marketplace_timestamp();

/**
 * Update avatar rating when review is added/updated
 */
CREATE OR REPLACE FUNCTION trigger_update_avatar_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM update_avatar_rating(NEW.listing_id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_review_rating_update
    AFTER INSERT OR UPDATE ON avatar_reviews
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_avatar_rating();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.avatar_marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatar_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatar_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_avatar_inventory ENABLE ROW LEVEL SECURITY;

-- Marketplace Policies
CREATE POLICY "Anyone can view active listings"
    ON public.avatar_marketplace
    FOR SELECT
    USING (status = 'active');

CREATE POLICY "Users can create their own listings"
    ON public.avatar_marketplace
    FOR INSERT
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own listings"
    ON public.avatar_marketplace
    FOR UPDATE
    USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own listings"
    ON public.avatar_marketplace
    FOR DELETE
    USING (auth.uid() = creator_id);

-- Transaction Policies
CREATE POLICY "Users can view their own transactions"
    ON public.avatar_transactions
    FOR SELECT
    USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Review Policies
CREATE POLICY "Anyone can view active reviews"
    ON public.avatar_reviews
    FOR SELECT
    USING (status = 'active');

CREATE POLICY "Users can create reviews for their purchases"
    ON public.avatar_reviews
    FOR INSERT
    WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their own reviews"
    ON public.avatar_reviews
    FOR UPDATE
    USING (auth.uid() = reviewer_id);

-- Inventory Policies
CREATE POLICY "Users can view their own inventory"
    ON public.user_avatar_inventory
    FOR SELECT
    USING (auth.uid() = user_id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.avatar_marketplace IS 'Marketplace for buying, selling, and renting custom 3D avatars';
COMMENT ON TABLE public.avatar_transactions IS 'Transaction history for avatar purchases and rentals';
COMMENT ON TABLE public.avatar_reviews IS 'User reviews and ratings for avatars';
COMMENT ON TABLE public.user_avatar_inventory IS 'User-owned and rented avatars inventory';
