const { decryption, checkToken, checkApiKey, checkRolePermission, validateJoi } = require('../../middleware');
const userModel = require('../../models/v1/user.model');
const express = require('express');
const router = express.Router();
const Joi = require('joi');

//////////////////////////////////////////////////////////////////////
//                           Setting                                //
//////////////////////////////////////////////////////////////////////

router.post('/user_details', checkApiKey, checkToken, checkRolePermission("customers", "view"), decryption, validateJoi(Joi.object({ user_id: Joi.string().required() })), userModel.user_details);

router.post('/user_color_codes_list', checkApiKey, checkToken, checkRolePermission("customers", "view"), checkToken, userModel.user_color_codes_list)

router.post('/user_list', checkApiKey, checkToken, checkRolePermission("customers", "view"), decryption, validateJoi(Joi.object({
    user_color_code_id: Joi.number().optional(),
    start_date: Joi.string().optional(),
    end_date: Joi.when('start_date', {
        is: Joi.exist(),
        then: Joi.string().required()
    }),
})), userModel.user_list);

router.post('/order_list', checkApiKey, checkToken, checkRolePermission("customers", "view"), decryption, validateJoi(Joi.object({ user_id: Joi.number().required() })), userModel.order_list);

// role base access in model
router.post('/user_action', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    type: Joi.valid('language_update', 'soft_delete_user', 'delete_forever_user', 'tin_number', 'block', 'customer_type', 'loyalty_point_switch', 'payment_type', 'service_type', 'add_condition', 'add_red_flag', 'edit_user', 'add_comment', 'comment_status_update', 'address_delete', 'address_add', 'address_update', 'add_customer', 'remove_cancellation_dues').required(),
    value: Joi.when('type', {
        switch: [
            { is: 'language_update', then: Joi.string().required() },
            { is: 'soft_delete_user', then: Joi.number().optional() },
            { is: 'delete_forever_user', then: Joi.number().optional() },
            { is: 'tin_number', then: Joi.string().max(16).required() },
            { is: 'block', then: Joi.number().valid(0, 1).required() },
            { is: 'customer_type', then: Joi.number().required() },
            { is: 'loyalty_point_switch', then: Joi.number().valid(0, 1).required() },
            {
                is: 'payment_type', then: Joi.object().keys({
                    type: Joi.string().valid('credit_card', 'airtel_money', 'momo_pay', 'cash', 'wallet', 'm_pesa').required(),
                    value: Joi.number().valid(0, 1).required()
                }).required()
            },
            {
                is: 'service_type', then: Joi.object().keys({
                    type: Joi.string().valid('delivery', 'carhop', 'pick_up', 'dine_in').required(),
                    value: Joi.number().valid(0, 1).required()
                }).required()
            },
            { is: 'add_condition', then: Joi.array().items(Joi.number()).required() },
            { is: 'add_red_flag', then: Joi.string().required() },
            {
                is: 'edit_user', then: Joi.object().keys({
                    first_name: Joi.string().required(),
                    last_name: Joi.string().required(),
                    email: Joi.string().email().required(),
                    country_code: Joi.string().required(),
                    phone: Joi.string().required(),
                }).required()
            },
            {
                is: 'add_comment', then: Joi.object().keys({
                    alert_to: Joi.valid('admin', 'user', 'branch', 'rider').required(),
                    title: Joi.string().required(),
                    description: Joi.string().required(),
                }).required()
            },
            {
                is: 'comment_status_update', then: Joi.object().keys({
                    comment_id: Joi.number().required(),
                    status: Joi.valid('pending', 'resolved').required()
                }).required()
            },
            { is: 'address_delete', then: Joi.number().required() },
            { is: 'remove_cancellation_dues', then: Joi.number().required() },
            {
                is: 'address_add', then: Joi.object().keys({
                    delivery_type: Joi.string().valid('home', 'work', 'other').required(),
                    delivery_address: Joi.string().required(),
                    delivery_flat: Joi.string().required(),
                    delivery_area: Joi.string().required(),
                    delivery_landmark: Joi.string().optional(),
                    delivery_latitude: Joi.string().optional(),
                    delivery_longitude: Joi.string().optional(),
                    delivery_instruction: Joi.string().optional(),
                    delivery_city: Joi.string().optional(),
                    delivery_state: Joi.string().optional(),
                    delivery_country: Joi.string().optional()
                }).required()
            },
            {
                is: 'address_update', then: Joi.object().keys({
                    delivery_address_id: Joi.number().valid().required(),
                    delivery_type: Joi.string().valid('home', 'work', 'other').required(),
                    delivery_address: Joi.string().optional(),
                    delivery_flat: Joi.string().optional(),
                    delivery_area: Joi.string().optional(),
                    delivery_landmark: Joi.string().optional(),
                    delivery_latitude: Joi.string().optional(),
                    delivery_longitude: Joi.string().optional(),
                    delivery_instruction: Joi.string().optional(),
                    delivery_city: Joi.string().optional(),
                    delivery_state: Joi.string().optional(),
                    delivery_country: Joi.string().optional()
                }).required()
            },
            {
                is: 'add_customer', then: Joi.object().keys({
                    first_name: Joi.string().required(),
                    last_name: Joi.string().required(),
                    email: Joi.string().email().required(),
                    country_code: Joi.string().required(),
                    phone: Joi.string().required(),
                }).required()
            }
        ],
        otherwise: Joi.optional()
    }),
    user_id: Joi.number().required()
})), userModel.user_action);

router.post('/user_get_details', checkApiKey, checkToken, checkRolePermission("customers", "view"), decryption, validateJoi(Joi.object({
    type: Joi.valid('gift_card_history', 'reward_point_history', 'wallet_history', 'credit_history_pop_up', 'red_flag_history', 'get_address', 'address_book', 'order_preference', 'complaint_feedback', 'rating_review_history', 'comment_history', 'logged_in_devices', 'order_preferences', 'notification_list', 'cancellation_dues').required(),
    user_id: Joi.number().required()
})), userModel.user_get_details);

router.post('/deleted_users_list', checkApiKey, checkToken, checkRolePermission("customers", "view"), userModel.deleted_users_list);

router.post('/send_notification', checkApiKey, checkToken, checkRolePermission("customers", "edit"), decryption, validateJoi(Joi.object({
    mode: Joi.valid('WhatsApp', 'SMS', 'Email', 'Push Notification').required(),
    user_id: Joi.number().required(),
    send_date: Joi.string().required(),
    send_time: Joi.string().required(),
    send_utc_datetime: Joi.string().required(),
    media_name: Joi.string().optional(),
    title: Joi.string().required(),
    description: Joi.string().required(),
})), userModel.send_notification);

module.exports = router;