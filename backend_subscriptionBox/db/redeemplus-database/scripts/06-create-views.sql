-- View for active offers with business details
CREATE VIEW vw_active_offers AS
SELECT 
    o.*,
    u.username as business_name,
    u.profile_image_url as business_image,
    bp.business_address,
    bc.category_name,
    bc.sub_category_name,
    ot.offer_name as offer_type_name,
    COALESCE(AVG(r.rating), 0) as average_rating,
    COUNT(r.id) as review_count,
    COUNT(DISTINCT sub.subscriber_id) as subscriber_count
FROM tbl_offers o
LEFT JOIN tbl_users u ON o.user_id = u.id
LEFT JOIN tbl_business_profiles bp ON u.id = bp.user_id
LEFT JOIN tbl_business_categories bc ON o.business_category_id = bc.id
LEFT JOIN tbl_offer_types ot ON o.offer_type_id = ot.id
LEFT JOIN tbl_reviews r ON o.id = r.offer_id AND r.is_active = TRUE
LEFT JOIN tbl_user_subscriptions sub ON u.id = sub.business_id AND sub.is_active = TRUE
WHERE o.is_active = TRUE 
    AND o.is_deleted = FALSE 
    AND o.end_date > CURRENT_TIMESTAMP
    AND u.is_active = TRUE
GROUP BY o.id, u.username, u.profile_image_url, bp.business_address, bc.category_name, bc.sub_category_name, ot.offer_name;

-- View for user statistics
CREATE VIEW vw_user_stats AS
SELECT 
    u.id,
    u.username,
    u.account_type,
    COUNT(DISTINCT o.id) as total_offers_posted,
    COUNT(DISTINCT r.id) as total_redemptions,
    COUNT(DISTINCT sub.subscriber_id) as total_subscribers,
    COALESCE(AVG(rev.rating), 0) as average_rating,
    COUNT(DISTINCT rev.id) as total_reviews
FROM tbl_users u
LEFT JOIN tbl_offers o ON u.id = o.user_id AND o.is_active = TRUE
LEFT JOIN tbl_redemptions r ON o.id = r.offer_id
LEFT JOIN tbl_user_subscriptions sub ON u.id = sub.business_id AND sub.is_active = TRUE
LEFT JOIN tbl_reviews rev ON u.id = rev.business_id AND rev.is_active = TRUE
WHERE u.is_active = TRUE AND u.is_deleted = FALSE
GROUP BY u.id, u.username, u.account_type;

-- View for membership details
CREATE VIEW vw_user_memberships AS
SELECT 
    um.*,
    mp.name as plan_name,
    mp.price as plan_price,
    mp.offer_limit,
    mp.visibility_days,
    mp.has_verified_badge,
    mp.has_priority_support,
    (mp.offer_limit - um.offers_used) as remaining_offers
FROM tbl_user_memberships um
JOIN tbl_membership_plans mp ON um.plan_id = mp.id
WHERE um.is_active = TRUE AND um.end_date > CURRENT_TIMESTAMP;
