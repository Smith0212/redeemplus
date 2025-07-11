-- Database creation
CREATE DATABASE redeemplus;

-- Categories
CREATE TABLE tbl_business_categories (
    id bigint(20) primary key auto_increment,
    category_name VARCHAR(100),
    sub_category_name VARCHAR(100),
    is_active bool default 1,
    is_deleted bool default 0,
    created_at timestamp with time zone default current_timestamp,
    updated_at timestamp with time zone default current_timestamp on update current_timestamp
);

-- User-related tables
-- Users table (individuals and general users)
CREATE TABLE tbl_users (
    id bigint(20) primary key auto_increment,
    username VARCHAR(32),
    email VARCHAR(255),
    phone VARCHAR(20),
    country_code varchar(6),
    social_id VARCHAR(255),
    otp VARCHAR(6),
    password text,
    account_type enum ('individual', 'business'),
    profile_image_url text,
    date_of_birth DATE,
    language VARCHAR(10) DEFAULT 'en',
    is_verified BOOLEAN DEFAULT FALSE,
    is_subscribe BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at timestamp with time zone default current_timestamp,
    updated_at timestamp with time zone default current_timestamp on update current_timestamp
);

-- Business table (business-specific info)
CREATE TABLE tbl_business_profiles (
    id bigint(20) primary key auto_increment,
    user_id bigint(20) NOT NULL,
    category_id bigint(20),
    instagram_url VARCHAR(255),
    tiktok_url VARCHAR(255),
    whatsapp_url VARCHAR(255),
    business_address TEXT,
    street varchar(16),
    postal_code varchar(16),
    zone varchar(16),
    latitude varchar(16),
    longitude varchar(16),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at timestamp with time zone default current_timestamp,
    updated_at timestamp with time zone default current_timestamp on update current_timestamp,
    foreign key (user_id) references tbl_users(id) on delete cascade,
    foreign key (category_id) references tbl_business_categories(id) on delete set null
);

create table tbl_device_info (
    id bigint(20) primary key auto_increment,
    user_id bigint(20),
    device_type ENUM('android', 'ios') NOT NULL,
    device_name varchar(64),
    os_version varchar(8),
    app_version varchar(8),
    user_token text,
    device_token text,
    timezone varchar(32),
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp,
    foreign key (user_id) references tbl_users(id) on delete cascade
);

-- Membership plans
CREATE TABLE membership_plans (
    id bigint(20) primary key auto_increment,
    name VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_days INTEGER NOT NULL,
    offer_limit INTEGER,
    visibility_days INTEGER NOT NULL,
    has_free_listing_Rplus BOOLEAN DEFAULT FALSE,
    has_verified_badge BOOLEAN DEFAULT FALSE,
    has_priority_support BOOLEAN DEFAULT FALSE,
    has_exclusive_promo_access BOOLEAN DEFAULT FALSE,
    is_auto_renewal BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone default current_timestamp on update current_timestamp
);

CREATE TABLE user_memberships (
    id bigint(20) primary key auto_increment,
    user_id bigint(20),
    plan_id bigint(20),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    offers_used INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone default current_timestamp on update current_timestamp
    foreign key (user_id) references tbl_users(id) on delete cascade,
    foreign key (plan_id) references membership_plans(id) on delete cascade
);

-- Offers
CREATE TABLE offer_types (
    id bigint(20) primary key auto_increment,
    offer_name VARCHAR(128) NOT NULL,
    offer_image text,
    sub_offer_name VARCHAR(128),
    sub_offer_image text,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at timestamp with time zone default current_timestamp,
    updated_at timestamp with time zone default current_timestamp on update current_timestamp
);

CREATE TABLE offers (
    id bigint(20) primary key auto_increment,
    offer_type_id bigint(20),
    business_category_id bigint(20),
    image text,
    title VARCHAR(100) NOT NULL,
    subtitle VARCHAR(255),
    description TEXT,
    terms_of_use TEXT,
    discount_percentage DECIMAL(5, 2),
    total_price DECIMAL(10, 2) NOT NULL,
    old_price DECIMAL(10, 2),
    duration INTEGER NOT NULL, -- in days
    quantity_available INTEGER NOT NULL,
    quantity_per_user INTEGER DEFAULT 1,
    is_redeemable_in_store BOOLEAN DEFAULT TRUE,
    is_delivery_available BOOLEAN DEFAULT FALSE,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    estimated_delivery_time VARCHAR(50),
    pin_code VARCHAR(10),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_days VARCHAR(20) DEFAULT '1111111', -- 7 digits representing Sun-Sat
    -- valid_time VARCHAR(100), -- e.g., "10:00-13:00"
    offer_latitude varchar(16),
    offer_longitude varchar(16),
    is_sponsored BOOLEAN DEFAULT FALSE,
    is_listed_in_rplus BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone default current_timestamp on update current_timestamp
    foreign key (business_category_id) references tbl_business_categories(id) on delete set null,
    foreign key (offer_type_id) references offer_types(id) on delete set null
);

CREATE TABLE offer_valid_times (
    id bigint(20) primary key auto_increment,
    offer_id bigint(20) NOT NULL,
    -- day_of_week INT NOT NULL,  -- 0 = Sunday, 6 = Saturday
    valid_time_start TIME NOT NULL,
    valid_time_end TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone default current_timestamp on update current_timestamp
    FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
);

CREATE TABLE tbl_delivery_address (
    id bigint(20) primary key auto_increment,
    user_id bigint(20) NOT NULL REFERENCES tbl_users(id) ON DELETE CASCADE,
    address text NOT NULL,
    street varchar(16),
    postal_code varchar(16),
    zone varchar(16),
    latitude varchar(16),
    longitude varchar(16),
    country_code varchar(6),
    phone_number VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone default current_timestamp on update current_timestamp
)

-- Redemption and delivery
CREATE TABLE redemptions (
    id bigint(20) primary key auto_increment,
    offer_id bigint(20),
    user_id bigint(20),
    quantity INTEGER NOT NULL DEFAULT 1,
    redemption_method enum('pin_code', 'delivery'),
    pin_code VARCHAR(10),
    delivery_address_id bigint(20),
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    estimated_delivery_time VARCHAR(50), -- !!! should i take it varchar or time? !!!
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'delivered', 'completed')),
    special_requests_msg TEXT,
    rejection_reason TEXT,
    accepted_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone default current_timestamp on update current_timestamp,
    foreign key (user_id) references tbl_users(id) on delete cascade,
    foreign key (offer_id) references offers(id) on delete cascade,
    foreign key (delivery_address_id) references tbl_delivery_address(id) on delete set null
);


CREATE TABLE reviews (
    id bigint(20) primary key auto_increment,
    redemption_id bigint(20), -- again here come user id as busuness and user both are users
    user_id bigint(20),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone default current_timestamp on update current_timestamp
    foreign key (user_id) references tbl_users(id) on delete cascade,
    foreign key (redemption_id) references redemptions(id) on delete cascade
);

-- Subscriptions and saved items
-- CREATE TABLE user_subscriptions (
--     subscription_id SERIAL PRIMARY KEY,
--     user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
--     business_id INTEGER NOT NULL REFERENCES business_profiles(business_id) ON DELETE CASCADE,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     UNIQUE (user_id, business_id)
-- );

CREATE TABLE saved_offers (
    id bigint(20) primary key auto_increment,
    user_id bigint(20)
    offer_id bigint(20)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
);

create table tbl_user_subscriptions     (
	id bigint(20) primary key auto_increment,
	user_id_1 bigint(20),
	user_id_2 bigint(20),
	status enum('pending','accept','reject'),
	is_active tinyint(1) default 1,
	is_deleted tinyint(1) default 0,
	created_at timestamp default current_timestamp,
	updated_at timestamp default current_timestamp on update current_timestamp,
	deleted_at timestamp null,
	foreign key (user_id_1) references tbl_user(id) on delete cascade,
	foreign key (user_id_2) references tbl_user(id) on delete cascade
);


-- generate all these tables according to my above tables format.
-- Notifications
...

-- Reports
...

-- Search history
...

-- Recently viewed
...

-- change all these tables according to my above tables format.
-- Settings
CREATE TABLE user_settings (
    setting_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment and transactions
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(100),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subscriptions_payments (
    subscription_payment_id SERIAL PRIMARY KEY,
    membership_id INTEGER NOT NULL REFERENCES user_memberships(membership_id) ON DELETE CASCADE,
    payment_id INTEGER NOT NULL REFERENCES payments(payment_id) ON DELETE CASCADE,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- OTP and authentication
CREATE TABLE otp_codes (
    otp_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('email_verification', 'password_reset', 'phone_verification')),
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Social authentication
CREATE TABLE social_accounts (
    social_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'apple', 'facebook')),
    provider_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (provider, provider_id)
);

-- Ads
CREATE TABLE ads (
    ad_id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    target_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
