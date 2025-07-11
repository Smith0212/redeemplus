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

-- Function to generate confirmation numbers for redemptions
CREATE OR REPLACE FUNCTION generate_confirmation_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.confirmation_number IS NULL THEN
        NEW.confirmation_number := 'ADS' || LPAD(nextval('redemption_confirmation_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for confirmation numbers
CREATE SEQUENCE redemption_confirmation_seq START 1;

-- Apply trigger for confirmation number generation
CREATE TRIGGER generate_redemption_confirmation BEFORE INSERT ON tbl_redemptions FOR EACH ROW EXECUTE FUNCTION generate_confirmation_number();

-- Function to generate support ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_number IS NULL THEN
        NEW.ticket_number := 'TKT' || LPAD(nextval('support_ticket_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for ticket numbers
CREATE SEQUENCE support_ticket_seq START 1;

-- Apply trigger for ticket number generation
CREATE TRIGGER generate_support_ticket_number BEFORE INSERT ON tbl_support_tickets FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();
