-- Create indexes for better performance
CREATE INDEX idx_users_email ON tbl_users(email);
CREATE INDEX idx_users_username ON tbl_users(username);
CREATE INDEX idx_users_phone ON tbl_users(phone);
CREATE INDEX idx_users_account_type ON tbl_users(account_type);
CREATE INDEX idx_users_is_active ON tbl_users(is_active);

CREATE INDEX idx_offers_user_id ON tbl_offers(user_id);
CREATE INDEX idx_offers_category_id ON tbl_offers(business_category_id);
CREATE INDEX idx_offers_type_id ON tbl_offers(offer_type_id);
CREATE INDEX idx_offers_is_active ON tbl_offers(is_active);
CREATE INDEX idx_offers_start_date ON tbl_offers(start_date);
CREATE INDEX idx_offers_end_date ON tbl_offers(end_date);
CREATE INDEX idx_offers_location ON tbl_offers(offer_latitude, offer_longitude);

CREATE INDEX idx_redemptions_user_id ON tbl_redemptions(user_id);
CREATE INDEX idx_redemptions_offer_id ON tbl_redemptions(offer_id);
CREATE INDEX idx_redemptions_status ON tbl_redemptions(status);
CREATE INDEX idx_redemptions_created_at ON tbl_redemptions(created_at);

CREATE INDEX idx_reviews_business_id ON tbl_reviews(business_id);
CREATE INDEX idx_reviews_offer_id ON tbl_reviews(offer_id);
CREATE INDEX idx_reviews_rating ON tbl_reviews(rating);

CREATE INDEX idx_notifications_user_id ON tbl_notifications(user_id);
CREATE INDEX idx_notifications_is_read ON tbl_notifications(is_read);
CREATE INDEX idx_notifications_created_at ON tbl_notifications(created_at);

CREATE INDEX idx_subscriptions_subscriber_id ON tbl_user_subscriptions(subscriber_id);
CREATE INDEX idx_subscriptions_business_id ON tbl_user_subscriptions(business_id);

CREATE INDEX idx_search_history_user_id ON tbl_search_history(user_id);
CREATE INDEX idx_recently_viewed_user_id ON tbl_recently_viewed(user_id);
