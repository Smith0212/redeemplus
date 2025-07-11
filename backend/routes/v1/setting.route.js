const { SERVICE_TYPE, PAYMENT_MODES, COUNTRY, CURRENCY } = require('../../config/constants');
const { decryption, validateJoi, checkToken, checkRolePermission, checkApiKey, sendResponse } = require('../../middleware');
const settingModel = require('../../models/v1/setting.model');
const express = require('express');
const Joi = require('joi');
const router = express.Router();

router.get('/get/:type', checkApiKey, checkToken, checkRolePermission("setting", "view"), (req, res) => {
    if (req.params.type === 'service_type') settingModel.service_type(req, res);
    else if (req.params.type === 'payment_modes') settingModel.payment_modes(req, res);
    else if (req.params.type === 'region') settingModel.region(req, res);
    else if (req.params.type === 'welcome_screen') settingModel.welcome_screen(req, res);
    else if (req.params.type === 'gps_keys') settingModel.gps_keys(req, res);
    else if (req.params.type === 'schedule_orders') settingModel.schedule_orders(req, res);
    else if (req.params.type === 'social_media_logins') settingModel.social_media_logins(req, res);
    else if (req.params.type === 'cancle_order_time') settingModel.cancle_order_time(req, res);
    else if (req.params.type === 'order_approval') settingModel.order_approval(req, res);
    else if (req.params.type === 'max_min_amount_delivery') settingModel.max_min_amount_delivery(req, res);
    else if (req.params.type === 'quantity_of_single_item') settingModel.quantity_of_single_item(req, res);
    else if (req.params.type === 'cancellation_disclaimer') settingModel.cancellation_disclaimer(req, res);
    else if (req.params.type === 'word_limit_instructions') settingModel.word_limit_instructions(req, res);
    else if (req.params.type === 'clear_abandoned_cart') settingModel.clear_abandoned_cart(req, res);
    else if (req.params.type === 'third_party_apps') settingModel.third_party_apps(req, res);
    else if (req.params.type === 'grace_time') settingModel.grace_time(req, res);
    else if (req.params.type === 'user_order_condition') settingModel.user_order_condition.add_or_edit_or_list(req, res);
    else if (req.params.type === 'address_preferences') settingModel.address_preferences.add_or_edit_or_list(req, res);
    else if (req.params.type === 'advert_banners') settingModel.advert_banners.add_or_edit_or_list(req, res);
    else if (req.params.type === 'other_setting') settingModel.other_setting(req, res);
    else return sendResponse(req, res, 200, 0, { keyword: "invalid_key", components: { key: "type" } });
});

router.post('/save/service_type', checkApiKey, checkToken, checkRolePermission("setting", "edit"), decryption, validateJoi(Joi.object({
    service_type: Joi.string().valid(...SERVICE_TYPE).required(),
    enabled: Joi.boolean().strict().required(),
    image: Joi.string().required(),
    description: Joi.string().required()
})), settingModel.service_type);

router.post('/save/payment_modes', checkApiKey, checkToken, checkRolePermission("setting", "edit"), decryption, validateJoi(Joi.object({
    payment_mode: Joi.string().valid(...PAYMENT_MODES).required(),
    service_type: Joi.string().valid(...SERVICE_TYPE, 'gift_card', 'membership').allow('').required(),
    enabled: Joi.boolean().strict().required()
})), settingModel.payment_modes);

router.post('/save/region', checkApiKey, checkToken, checkRolePermission("setting", "edit"), decryption, validateJoi(Joi.object({
    country: Joi.string().valid(...COUNTRY).required(),
    image: Joi.string().required(),
    description: Joi.string().required(),
    enabled: Joi.boolean().required()
})), settingModel.region);

router.post('/save/welcome_screen', checkApiKey, checkToken, checkRolePermission("setting", "edit"), decryption, validateJoi(Joi.object({
    user_type: Joi.string().valid('new_users', 'existing_users', 'rider_app').required(),
    title: Joi.string().required(),
    sub_title: Joi.string().required(),
    file_format: Joi.string().required(),
    file_upload: Joi.string().required(),
    display_time_on_screen: Joi.number().required(),
})), settingModel.welcome_screen);

router.post('/save/gps_keys', checkApiKey, checkToken, checkRolePermission("setting", "edit"), decryption, validateJoi(Joi.object({
    gps_key: Joi.string().required(),
    country: Joi.string().valid(...COUNTRY).required(),
    is_on: Joi.boolean().strict().required()
})), settingModel.gps_keys);

router.post('/save/schedule_orders', checkApiKey, checkToken, checkRolePermission("setting", "edit"), decryption, validateJoi(Joi.object({
    payment_mode_type: Joi.string().valid(...PAYMENT_MODES).allow('').required(),
    service_type: Joi.when('payment_mode_type', {
        is: '',
        then: Joi.optional(),
        otherwise: Joi.string().valid(...SERVICE_TYPE).allow('').required()
    }),
    enabled: Joi.when('payment_mode_type', {
        is: '',
        then: Joi.optional(),
        otherwise: Joi.boolean().strict().required()
    }),
    schedule_orders: Joi.when('payment_mode_type', {
        is: '',
        then: Joi.boolean().strict().required(),
        otherwise: Joi.optional()
    }),
    advance_days_of_scheduling: Joi.when('payment_mode_type', {
        is: '',
        then: Joi.number().min(0),
        otherwise: Joi.optional()
    }),
})), settingModel.schedule_orders);

router.post('/save/social_media_logins', checkApiKey, checkToken, checkRolePermission("setting", "edit"), decryption, validateJoi(Joi.object({
    social_media_name: Joi.string().valid('google', 'apple', 'facebook', 'whatsapp').required(),
    enabled: Joi.boolean().strict().required()
})), settingModel.social_media_logins);

router.post('/save/cancle_order_time', checkApiKey, checkToken, checkRolePermission("setting", "edit"), decryption, validateJoi(Joi.object({
    cancle_order_time: Joi.number().required()
})), settingModel.cancle_order_time);

router.post('/save/order_approval', checkApiKey, checkToken, checkRolePermission("setting", "edit"), decryption, validateJoi(Joi.object({
    type: Joi.string().valid("automatic_approval", "maximum_time_for_approving_the_order", "maximum_kitchen_preparation_time", "order_packaging_time", "rider_assigning_time", "carhop_order_delay_delivery", "pick_up_customer_didnt_show_up", "carhop_customer_didnt_show_up").required(),
    value: Joi.when('type', {
        is: 'automatic_approval',
        then: Joi.boolean().strict().required(),
        otherwise: Joi.number().required()
    })
})), settingModel.order_approval);

router.post('/save/max_min_amount_delivery', checkApiKey, checkToken, checkRolePermission("setting", "edit"), decryption, validateJoi(Joi.object({
    amount: Joi.number().integer().min(0).required(),
    currency: Joi.string().valid(...CURRENCY).required(),
    type: Joi.string().valid('max', 'min').required()
})), settingModel.max_min_amount_delivery);

router.post('/save/quantity_of_single_item', checkApiKey, checkToken, checkRolePermission("setting", "edit"), decryption, validateJoi(Joi.object({
    max_quantity: Joi.number().required()
})), settingModel.quantity_of_single_item);

router.post('/save/cancellation_disclaimer', checkApiKey, checkToken, checkRolePermission("setting", "edit"), decryption, validateJoi(Joi.object({
    title: Joi.string().optional(),
    description: Joi.string().optional()
})), settingModel.cancellation_disclaimer);

router.post('/save/word_limit_instructions', checkApiKey, checkToken, checkRolePermission("setting", "edit"), decryption, validateJoi(Joi.object({
    type: Joi.string().valid('cooking_instructions', 'delivery_instructions', 'gift_card_message').required(),
    value: Joi.number().integer().min(0).required()
})), settingModel.word_limit_instructions);

router.post('/save/clear_abandoned_cart', checkApiKey, checkToken, checkRolePermission("setting", "edit"), decryption, validateJoi(Joi.object({
    type: Joi.string().valid('clear_abandoned_cart_time', 'cart_checkout_push_notification', 'cart_checkout_push_notification_message').required(),
    value: Joi.when('type', {
        is: 'cart_checkout_push_notification_message',
        then: Joi.string().required(),
        otherwise: Joi.number().required()
    })
})), settingModel.clear_abandoned_cart);

router.post('/save/third_party_apps', checkApiKey, checkToken, checkRolePermission("setting", "edit"), decryption, validateJoi(Joi.object({
    type: Joi.string().valid('sms', 'notifications', 'location', 'payment_gateway', 'chat_bot', 'call_masking', 'track_rider', 'facebook_login', 'google_login', 'apple_login', 'crash_report', 'analytics_reports').required(),
    value: Joi.boolean().strict().required()
})), settingModel.third_party_apps);

router.post('/save/grace_time', checkApiKey, checkToken, checkRolePermission("setting", "edit"), decryption, validateJoi(Joi.object({
    type: Joi.string().valid('order_acception', 'order_preparation', 'packaging', 'assigning', 'rider_delivery_time', 'rider_return_time', 'dine_order_accepting_time', 'carhop_delivery_time', 'rider_return_time').required(),
    value: Joi.number().required()
})), settingModel.grace_time);

router.post('/user_order_condition', checkApiKey, checkToken, checkRolePermission("setting", "view"), decryption, validateJoi(Joi.object({
    order_condition_id: Joi.number().optional(),
    name: Joi.string().optional()
})), settingModel.user_order_condition.add_or_edit_or_list);

// role base permission in model
router.post("/user_order_condition/is_active_or_delete", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    order_condition_id: Joi.number().required(),
    is_active: Joi.number().integer().valid(0, 1),
    is_delete: Joi.number().integer().valid(0, 1)
}).xor('is_active', 'is_delete')), settingModel.user_order_condition.is_active_or_delete);

// role base permission in model
router.post('/address_preferences', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    delivery_preference_id: Joi.number().optional(),
    name: Joi.string().required().optional()
})), settingModel.address_preferences.add_or_edit_or_list);

// role base permission in model
router.post("/address_preferences/is_active_or_delete", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    delivery_preference_id: Joi.number().required(),
    is_active: Joi.number().integer().valid(0, 1),
    is_delete: Joi.number().integer().valid(0, 1)
}).xor('is_active', 'is_delete')), settingModel.address_preferences.is_active_or_delete);

// role base permission in model
router.post('/advert_banners', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    banner_id: Joi.number().optional(),
    sub_category_id: Joi.number().optional(),
    banner_media: Joi.string().required()
})), settingModel.advert_banners.add_or_edit_or_list);

router.post('/advert_banners/delete', checkApiKey, checkToken, checkRolePermission("setting", "delete"), decryption, validateJoi(Joi.object({
    banner_id: Joi.number().optional()
})), settingModel.advert_banners.delete);

router.post('/advert_banners/show_category_or_sub_category', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    category_id: Joi.number().optional()
})), settingModel.advert_banners.show_category_or_sub_category);

router.post('/save/other_setting', checkApiKey, checkToken, checkRolePermission("setting", "edit"), decryption, validateJoi(Joi.object({
    type: Joi.string().valid('wallet', 'promocode', 'careers_page', 'chat_support', 'tip_facility', 'reward_programme', 'rider_automatic_allocation', 'all_3rd_parties_enable_disable', 'rider_tracking_on_customer_app', 'request_for_change_money_for_cash_delivery').required(),
    value: Joi.boolean().strict().required()
})), settingModel.other_setting);

// role base permission in model
router.post('/customer_color_codes', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    color_code_id: Joi.number().optional(),
    name: Joi.string().optional(),
    color_code: Joi.string().optional(),
})), settingModel.customer_color_codes.add_or_edit_or_list);

// role base permission in model
router.post('/customer_color_codes/is_active_or_delete', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    color_code_id: Joi.number().required(),
    is_active: Joi.number().integer().valid(0, 1),
    is_delete: Joi.number().integer().valid(0, 1)
})), settingModel.customer_color_codes.is_active_or_delete);

router.post('/manage_devices', checkApiKey, checkToken, checkRolePermission("setting", "edit"), decryption, validateJoi(Joi.object({
    user_type: Joi.string().valid('admin', 'sub_admin').required(),
})), settingModel.manage_devices);

router.post('/logout_device', checkApiKey, checkToken, checkRolePermission("setting", "edit"), decryption, validateJoi(Joi.object({
    admin_device_id: Joi.number().required()
})), settingModel.logout_device);

module.exports = router;