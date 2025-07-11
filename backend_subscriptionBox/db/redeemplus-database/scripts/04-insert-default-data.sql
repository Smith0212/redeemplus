-- Insert default business categories
INSERT INTO tbl_business_categories (category_name, sub_category_name) VALUES
('Automotive', 'Car For Sale'),
('Automotive', 'Auto Parts'),
('Automotive', 'Car Rental'),
('Automotive', 'Car Wash'),
('Food & Beverage', 'Restaurant'),
('Food & Beverage', 'Coffee Shop'),
('Food & Beverage', 'Fast Food'),
('Food & Beverage', 'Bakery'),
('Retail', 'Clothing'),
('Retail', 'Electronics'),
('Retail', 'Grocery'),
('Retail', 'Pharmacy'),
('Services', 'Beauty & Spa'),
('Services', 'Fitness'),
('Services', 'Education'),
('Services', 'Healthcare'),
('Entertainment', 'Cinema'),
('Entertainment', 'Gaming'),
('Entertainment', 'Sports'),
('Travel', 'Hotels'),
('Travel', 'Tours'),
('Travel', 'Transportation');

-- Insert default offer types
INSERT INTO tbl_offer_types (offer_name, sub_offer_name) VALUES
('Buy 1 Get 1 Free', 'Buy 1 Get 1 Free'),
('Buy 1 Get 2 Free', 'Buy 1 Get 2 Free'),
('Buy 1 Get 3 Free', 'Buy 1 Get 3 Free'),
('Buy 2 Get 1 Free', 'Buy 2 Get 1 Free'),
('Buy 2 Get 2 Free', 'Buy 2 Get 2 Free'),
('Buy 2 Get 3 Free', 'Buy 2 Get 3 Free'),
('Buy 3 Get 1 Free', 'Buy 3 Get 1 Free'),
('Buy 3 Get 2 Free', 'Buy 3 Get 2 Free'),
('Buy 3 Get 3 Free', 'Buy 3 Get 3 Free'),
('Discount Deal', 'Percentage Discount'),
('Package Deal', 'Bundle Offer'),
('24 Hours Deal', 'Limited Time Offer');

-- Insert default membership plans
INSERT INTO tbl_membership_plans (name, price, duration_days, offer_limit, visibility_days, has_free_listing_rplus, has_verified_badge, has_priority_support, has_exclusive_promo_access, has_unlimited_offers) VALUES
('Bronze', 0.00, 365, 20, 30, FALSE, FALSE, FALSE, FALSE, FALSE),
('Silver', 15.00, 365, 120, 30, FALSE, FALSE, TRUE, TRUE, FALSE),
('Gold', 30.00, 365, NULL, 90, TRUE, TRUE, TRUE, TRUE, TRUE);

-- Insert default ads
INSERT INTO tbl_ads (title, description, image_url, target_url, ad_type, position, start_date, end_date) VALUES
('Welcome to RedeemPlus', 'Discover amazing offers near you', '/images/welcome-ad.jpg', 'https://redeemplus.com', 'banner', 'home_top', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days'),
('Upgrade to Gold', 'Get unlimited offers and verified badge', '/images/gold-upgrade.jpg', '/subscription', 'banner', 'offers_top', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days');
