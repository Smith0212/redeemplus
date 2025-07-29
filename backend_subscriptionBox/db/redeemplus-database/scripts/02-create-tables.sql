-- Categories
CREATE TABLE tbl_business_categories (
    id BIGSERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    sub_category_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE tbl_users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(32) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password TEXT,
    phone VARCHAR(20),
    country_code VARCHAR(6),
    dob DATE,
    social_id VARCHAR(255),
    step INTEGER DEFAULT 1, -- 1: signup, 2: verify, 3: subsciption
    account_type VARCHAR(20) CHECK (account_type IN ('individual', 'business')),
    signup_type VARCHAR(20) CHECK (login_type IN ('s', 'g', 'a', 'f')),
    profile_image TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    business_category_id BIGINT,
    instagram_url TEXT,
    tiktok_url TEXT,
    whatsapp_url TEXT ,
    map_url TEXT,
    -- business-specific info
    business_address TEXT,
    street VARCHAR(16),
    postal_code VARCHAR(16),
    zone VARCHAR(16),
    latitude VARCHAR(16),
    longitude VARCHAR(16),
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    foreign key (business_category_id) REFERENCES tbl_business_categories(id) ON DELETE SET NULL
);

CREATE TABLE tbl_otp (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    action VARCHAR(10) CHECK (action IN ('signup', 'forgot')) DEFAULT 'signup',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tbl_users(id) ON DELETE CASCADE
);

-- Device information
CREATE TABLE tbl_device_info (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    device_type VARCHAR(1) CHECK (device_type IN ('A', 'I', 'W')) NOT NULL,
    device_name VARCHAR(64),
    os_version VARCHAR(8),
    app_version VARCHAR(8),
    ip VARCHAR(45),
    user_token TEXT,
    device_token TEXT,
    timezone VARCHAR(32),
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tbl_users(id) ON DELETE CASCADE
);

-- Membership plans
CREATE TABLE tbl_membership_plans (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_days INTEGER NOT NULL,
    offer_limit INTEGER,
    visibility_days INTEGER NOT NULL,
    has_free_listing_rplus BOOLEAN DEFAULT FALSE,
    has_verified_badge BOOLEAN DEFAULT FALSE,
    has_priority_support BOOLEAN DEFAULT FALSE,
    has_exclusive_promo_access BOOLEAN DEFAULT FALSE,
    has_unlimited_offers BOOLEAN DEFAULT FALSE,
    is_auto_renewal BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User memberships 
CREATE TABLE tbl_user_memberships (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    plan_id BIGINT NOT NULL,
    payment_id BIGINT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    offers_used INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tbl_users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES tbl_membership_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES tbl_payments(id) ON DELETE CASCADE
);

-- Offer types
CREATE TABLE tbl_offer_types (
    id BIGSERIAL PRIMARY KEY,
    offer_category_name VARCHAR(128) NOT NULL,
    offer_subcategory_name VARCHAR(128),
    offer_subcategory_image TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Offers
CREATE TABLE tbl_offers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    offer_type_id BIGINT,
    business_category_id BIGINT,
    image TEXT,
    title VARCHAR(100) NOT NULL,
    subtitle VARCHAR(255),
    description TEXT,
    terms_of_use TEXT,
    discount_percentage DECIMAL(5, 2),
    total_price DECIMAL(10, 2) NOT NULL CHECK (total_price > 0),
    old_price DECIMAL(10, 2),
    duration INTEGER NOT NULL,
    quantity_available INTEGER NOT NULL,
    quantity_per_user INTEGER DEFAULT 1,
    pin_code VARCHAR(10) NOT NULL,
    is_redeemable_in_store BOOLEAN DEFAULT TRUE,
    is_delivery_available BOOLEAN DEFAULT FALSE,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    estimated_delivery_time VARCHAR(50),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_days VARCHAR(7) DEFAULT '1111111', -- 7 digits representing Sun-Sat
    offer_latitude VARCHAR(16),
    offer_longitude VARCHAR(16),
    available_branches TEXT,
    is_listed_in_rplus BOOLEAN DEFAULT FALSE,
    user_acknowledgment BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    total_redemptions INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tbl_users(id) ON DELETE CASCADE,
    FOREIGN KEY (business_category_id) REFERENCES tbl_business_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (offer_type_id) REFERENCES tbl_offer_types(id) ON DELETE SET NULL
);

-- Offer valid times
CREATE TABLE tbl_offer_valid_times (
    id BIGSERIAL PRIMARY KEY,
    offer_id BIGINT NOT NULL,
    valid_time_start TIME NOT NULL,
    valid_time_end TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (offer_id) REFERENCES tbl_offers(id) ON DELETE CASCADE
);

-- Delivery addresses
CREATE TABLE tbl_delivery_addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    address TEXT NOT NULL,
    street VARCHAR(16),
    postal_code VARCHAR(16),
    zone VARCHAR(16),
    latitude VARCHAR(16),
    longitude VARCHAR(16),
    country_code VARCHAR(6),
    phone_number VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tbl_users(id) ON DELETE CASCADE
);

-- Redemptions
-- CREATE TABLE tbl_redemptions (
--     id BIGSERIAL PRIMARY KEY,
--     offer_id BIGINT NOT NULL,
--     user_id BIGINT NOT NULL,
--     quantity INTEGER NOT NULL DEFAULT 1,
--     redemption_method enum('pin_code', 'delivery'),
--     pin_code VARCHAR(10),
--     delivery_address_id BIGINT,
--     delivery_fee DECIMAL(10, 2) DEFAULT 0,
--     estimated_delivery_time VARCHAR(50),
--     status enum('pending', 'approved', 'rejected', 'delivered', 'completed') DEFAULT 'pending',
--     special_requests_msg TEXT,
--     rejection_reason TEXT,
--     confirmation_number VARCHAR(20) UNIQUE,
--     accepted_at TIMESTAMP WITH TIME ZONE,
--     delivered_at TIMESTAMP WITH TIME ZONE,
--     is_active BOOLEAN DEFAULT TRUE,
--     is_deleted BOOLEAN DEFAULT FALSE,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (user_id) REFERENCES tbl_users(id) ON DELETE CASCADE,
--     FOREIGN KEY (offer_id) REFERENCES tbl_offers(id) ON DELETE CASCADE,
--     FOREIGN KEY (delivery_address_id) REFERENCES tbl_delivery_addresses(id) ON DELETE SET NULL
-- );
-- .
CREATE TABLE tbl_redemptions (
    id BIGSERIAL PRIMARY KEY,
    offer_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    redemption_method ENUM('pin_code', 'delivery') NOT NULL,
    pin_code VARCHAR(10),  -- Only used for 'pin_code' method
    confirmation_number VARCHAR(20) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tbl_users(id) ON DELETE CASCADE,
    FOREIGN KEY (offer_id) REFERENCES tbl_offers(id) ON DELETE CASCADE
);

CREATE TABLE tbl_redemption_deliveries (
    id BIGSERIAL PRIMARY KEY,
    redemption_id BIGINT PRIMARY KEY,
    delivery_address_id BIGINT NOT NULL,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    estimated_delivery_time VARCHAR(50),
    status ENUM('pending', 'approved', 'rejected', 'delivered') DEFAULT 'pending',
    message TEXT,
    rejection_reason TEXT,
    accepted_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (redemption_id) REFERENCES tbl_redemptions(id) ON DELETE CASCADE,
    FOREIGN KEY (delivery_address_id) REFERENCES tbl_delivery_addresses(id) ON DELETE SET NULL
);


-- Reviews
CREATE TABLE tbl_reviews (
    id BIGSERIAL PRIMARY KEY,
    -- redemption_id BIGINT,
    user_id BIGINT NOT NULL,
    business_id BIGINT NOT NULL,
    -- offer_id BIGINT,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tbl_users(id) ON DELETE CASCADE,
    FOREIGN KEY (business_id) REFERENCES tbl_users(id) ON DELETE CASCADE
);

-- User subscriptions (following businesses)
CREATE TABLE tbl_user_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    business_id BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (user_id) REFERENCES tbl_users(id) ON DELETE CASCADE,
    FOREIGN KEY (business_id) REFERENCES tbl_users(id) ON DELETE CASCADE
);

-- Saved offers (wishlist)
CREATE TABLE tbl_saved_offers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    offer_id BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tbl_users(id) ON DELETE CASCADE,
    FOREIGN KEY (offer_id) REFERENCES tbl_offers(id) ON DELETE CASCADE
);

-- Notifications
CREATE TABLE tbl_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    sender_id BIGINT,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tbl_users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES tbl_users(id) ON DELETE CASCADE
);


-- Recently viewed offers
CREATE TABLE tbl_recently_viewed (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    offer_id BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tbl_users(id) ON DELETE CASCADE,
    FOREIGN KEY (offer_id) REFERENCES tbl_offers(id) ON DELETE CASCADE
);

-- User settings
CREATE TABLE tbl_user_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    --notification settings
    notification_enabled BOOLEAN DEFAULT TRUE,
    sound_enabled BOOLEAN DEFAULT TRUE,
    vibrate_enabled BOOLEAN DEFAULT TRUE,
    app_updates_enabled BOOLEAN DEFAULT TRUE,
    delivery_status_enabled BOOLEAN DEFAULT TRUE,
    subscribers_notification_enabled BOOLEAN DEFAULT TRUE,
    redeemed_offers_notification_enabled BOOLEAN DEFAULT TRUE,
    delivery_request_notification_enabled BOOLEAN DEFAULT TRUE,
    new_service_notification_enabled BOOLEAN DEFAULT TRUE,
    new_tips_notification_enabled BOOLEAN DEFAULT TRUE,

    language VARCHAR(10) DEFAULT 'en',
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tbl_users(id) ON DELETE CASCADE
);

-- Payments
CREATE TABLE tbl_payments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(100) UNIQUE,
    status enum ('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    description TEXT,
    payment_type enum ('membership', 'other') DEFAULT 'other',
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tbl_users(id) ON DELETE CASCADE
);

-- Ads
CREATE TABLE tbl_ads (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    target_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reasons for reporting
CREATE TABLE tbl_report_reasons (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reports (for reporting users and offers)
CREATE TABLE tbl_reports (
    id BIGSERIAL PRIMARY KEY,
    reporter_id BIGINT NOT NULL,
    reported_user_id BIGINT,
    reported_offer_id BIGINT,
    report_type enum('user', 'offer', 'problem') NOT NULL,
    reason_id bigint NOT NULL,
    additional_details TEXT,
    status enum('pending', 'reviewed', 'resolved', 'dismissed') DEFAULT 'pending',
    admin_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES tbl_users(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_user_id) REFERENCES tbl_users(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_offer_id) REFERENCES tbl_offers(id) ON DELETE CASCADE
);

-- User statistics (for analytics)
CREATE TABLE tbl_user_statistics (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    total_offers_posted INTEGER DEFAULT 0,
    total_offers_redeemed INTEGER DEFAULT 0,
    total_subscribers INTEGER DEFAULT 0,
    total_savings DECIMAL(10, 2) DEFAULT 0,
    total_earnings DECIMAL(10, 2) DEFAULT 0,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tbl_users(id) ON DELETE CASCADE
);

CREATE TABLE tbl_credentials (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);






-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_tbl_users_updated_at BEFORE UPDATE ON tbl_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_business_profiles_updated_at BEFORE UPDATE ON tbl_business_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_device_info_updated_at BEFORE UPDATE ON tbl_device_info FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_membership_plans_updated_at BEFORE UPDATE ON tbl_membership_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_user_memberships_updated_at BEFORE UPDATE ON tbl_user_memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_offer_types_updated_at BEFORE UPDATE ON tbl_offer_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_offers_updated_at BEFORE UPDATE ON tbl_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_offer_valid_times_updated_at BEFORE UPDATE ON tbl_offer_valid_times FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_delivery_addresses_updated_at BEFORE UPDATE ON tbl_delivery_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_redemptions_updated_at BEFORE UPDATE ON tbl_redemptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_reviews_updated_at BEFORE UPDATE ON tbl_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_user_subscriptions_updated_at BEFORE UPDATE ON tbl_user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_saved_offers_updated_at BEFORE UPDATE ON tbl_saved_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_notifications_updated_at BEFORE UPDATE ON tbl_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_search_history_updated_at BEFORE UPDATE ON tbl_search_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_recently_viewed_updated_at BEFORE UPDATE ON tbl_recently_viewed FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_user_settings_updated_at BEFORE UPDATE ON tbl_user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_payments_updated_at BEFORE UPDATE ON tbl_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_subscription_payments_updated_at BEFORE UPDATE ON tbl_subscription_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_otp_codes_updated_at BEFORE UPDATE ON tbl_otp_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_social_accounts_updated_at BEFORE UPDATE ON tbl_social_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_ads_updated_at BEFORE UPDATE ON tbl_ads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_reports_updated_at BEFORE UPDATE ON tbl_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_support_tickets_updated_at BEFORE UPDATE ON tbl_support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_app_feedback_updated_at BEFORE UPDATE ON tbl_app_feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tbl_user_statistics_updated_at BEFORE UPDATE ON tbl_user_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
