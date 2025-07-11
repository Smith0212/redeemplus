const { decryption, validateJoi, checkToken, checkRolePermission, checkApiKey } = require('../../middleware');
const serviceModel = require('../../models/v1/service.model');
const { PAYMENT_MODES } = require('../../config/constants');
const express = require('express');
const Joi = require('joi');
const router = express.Router();

//////////////////////////////////////////////////////////////////////
//                            Promo Code                            //
//////////////////////////////////////////////////////////////////////

router.post('/promo_code/create', checkApiKey, checkToken, checkRolePermission("promocodes", "edit"), decryption, validateJoi(Joi.object({
    promo_code: Joi.string().required(),
    amount: Joi.number().required(),
    start_datetime: Joi.string().required(),
    expiry_datetime: Joi.string().required(),
    notification_title: Joi.string().max(50).required(),
    notification_description: Joi.string().max(500).required()
})), serviceModel.promo_code.create);

router.post('/promo_code/delete', checkApiKey, checkToken, checkRolePermission("promocodes", "delete"), decryption, validateJoi(Joi.object({
    promo_code_id: Joi.number().required()
})), serviceModel.promo_code.delete);

router.post('/promo_code/list', checkApiKey, checkToken, checkRolePermission("promocodes", "view"), serviceModel.promo_code.list);

router.post('/promo_code/get_user_list', checkApiKey, checkToken, checkRolePermission("promocodes", "edit"), decryption, validateJoi(Joi.object({
    promo_code_id: Joi.number().required(),
    receiver_type: Joi.valid('All customers', 'Single users', 'Premium', 'Gold customer', 'Silver customer', 'Platinum customer', 'Female', 'Male', 'Birthday').required(),
    search_phone: Joi.when('receiver_type', {
        is: 'Single users',
        then: Joi.string().required(),
        otherwise: Joi.optional()
    }),
})), serviceModel.promo_code.get_user_list);

router.post('/promo_code/get_details', checkApiKey, checkToken, checkRolePermission("promocodes", "view"), decryption, validateJoi(Joi.object({
    promo_code_id: Joi.number().required()
})), serviceModel.promo_code.get_details);

router.post('/promo_code/send_to_users', checkApiKey, checkToken, checkRolePermission("promocodes", "edit"), decryption, validateJoi(Joi.object({
    promo_code_id: Joi.number().required(),
    receiver_type: Joi.valid('All customers', 'Single users', 'Premium', 'Gold customer', 'Silver customer', 'Platinum customer', 'Female', 'Male', 'Birthday').required(),
    single_receiver_id: Joi.when('receiver_type', {
        is: 'Single users',
        then: Joi.string().required(),
        otherwise: Joi.optional()
    })
})), serviceModel.promo_code.send_to_users);

router.post('/promo_code/get_counts', checkApiKey, checkToken, checkRolePermission("promocodes", "view"), serviceModel.promo_code.get_counts);

//////////////////////////////////////////////////////////////////////
//                             Feedback                             //
//////////////////////////////////////////////////////////////////////

router.post('/feedback/history_types', checkApiKey, checkToken, checkRolePermission("feedback", "view"), decryption, validateJoi(Joi.object({
    date: Joi.string().optional()
})), serviceModel.feedback.history_types);

router.post('/feedback/history', checkApiKey, checkToken, checkRolePermission("feedback", "view"), decryption, validateJoi(Joi.object({
    date: Joi.string().optional(),
    feedback_field_id: Joi.number().optional(),
    star: Joi.number().min(1).max(5).optional()
})), serviceModel.feedback.history);

router.post('/feedback/summary', checkApiKey, checkToken, checkRolePermission("feedback", "view"), decryption, validateJoi(Joi.object({
    restaurant_id: Joi.number().optional(),
})), serviceModel.feedback.summary);

router.post('/feedback/questions', checkApiKey, checkToken, checkRolePermission("feedback", "view"), serviceModel.feedback.questions);

// role permission in model
router.post('/feedback/crud_field', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    type: Joi.valid('add', 'edit', 'delete').required(),
    value: Joi.when('type', {
        switch: [
            { is: 'add', then: Joi.string().required() },
            {
                is: 'edit', then: Joi.object().keys({
                    field_id: Joi.number().required(),
                    name: Joi.string().required()
                }).required()
            },
            { is: 'delete', then: Joi.number().required() }
        ]
    })
})), serviceModel.feedback.crud_field);

// role permission in model
router.post('/feedback/crud_question', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    type: Joi.valid('add', 'edit', 'delete').required(),
    value: Joi.when('type', {
        switch: [
            {
                is: 'add', then: Joi.object().keys({
                    feedback_field_id: Joi.number().required(),
                    question: Joi.string().required(),
                    description: Joi.string().required()
                }).required()
            },
            {
                is: 'edit', then: Joi.object().keys({
                    question_id: Joi.number().required(),
                    question: Joi.string().required(),
                    description: Joi.string().required()
                }).required()
            },
            { is: 'delete', then: Joi.number().required() }
        ]
    })
})), serviceModel.feedback.crud_question);

router.post('/feedback/get_details', checkApiKey, checkToken, checkRolePermission("feedback", "view"), decryption, validateJoi(Joi.object({
    feedback_id: Joi.number().required()
})), serviceModel.feedback.get_details);

router.post('/feedback/add_comment', checkApiKey, checkToken, checkRolePermission("feedback", "edit"), decryption, validateJoi(Joi.object({
    feedback_id: Joi.number().required(),
    comment: Joi.string().required()
})), serviceModel.feedback.add_comment);

router.post('/feedback/status_change', checkApiKey, checkToken, checkRolePermission("feedback", "edit"), decryption, validateJoi(Joi.object({
    feedback_id: Joi.number().required(),
    status: Joi.valid('pending', 'resolved').required()
})), serviceModel.feedback.status_change);

//////////////////////////////////////////////////////////////////////
//                              Career                              //
//////////////////////////////////////////////////////////////////////

router.post('/careers/list', checkApiKey, checkToken, checkRolePermission("services", "view"), serviceModel.careers.list);
router.post('/careers/delete', checkApiKey, checkToken, checkRolePermission("services", "delete"), decryption, validateJoi(Joi.object({
    career_id: Joi.number().required()
})), serviceModel.careers.delete);

//////////////////////////////////////////////////////////////////////
//                        Gift Card Occasion                        //
//////////////////////////////////////////////////////////////////////

router.post('/gift_card/occasion/create', checkApiKey, checkToken, checkRolePermission("gift_card", "edit"), decryption, validateJoi(Joi.object({
    name: Joi.string().required(),
    image: Joi.string().required()
})), serviceModel.gift_card_occasion.create);

router.post('/gift_card/occasion/update', checkApiKey, checkToken, checkRolePermission("gift_card", "edit"), decryption, validateJoi(Joi.object({
    occasion_id: Joi.number().required(),
    name: Joi.string().required(),
    image: Joi.string().required()
})), serviceModel.gift_card_occasion.update);

router.post('/gift_card/occasion/get', checkApiKey, checkToken, checkRolePermission("gift_card", "view"), decryption, validateJoi(Joi.object({
    occasion_id: Joi.number().required()
})), serviceModel.gift_card_occasion.get);

router.post('/gift_card/occasion/list', checkApiKey, checkToken, checkRolePermission("gift_card", "view"), serviceModel.gift_card_occasion.list);

router.post("/gift_card/occasion/action", checkApiKey, checkToken, checkRolePermission("gift_card", "edit"), decryption, validateJoi(Joi.object({
    is_active: Joi.number().valid(0, 1).required(),
    occasion_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required()
})), serviceModel.gift_card_occasion.action);

router.post('/gift_card/occasion/delete', checkApiKey, checkToken, checkRolePermission("gift_card", "delete"), decryption, validateJoi(Joi.object({
    occasion_id: Joi.number().required()
})), serviceModel.gift_card_occasion.delete);

//////////////////////////////////////////////////////////////////////
//                            Gift Card                             //
//////////////////////////////////////////////////////////////////////

router.post('/gift_card/change_setting', checkApiKey, checkToken, checkRolePermission("gift_card", "edit"), decryption, validateJoi(Joi.object({
    type: Joi.string().valid('expiry_days', 'usage_type', 'pre_defined_amounts', 'image', 'get_all').required(),
    value: Joi.when('type', {
        switch: [
            { is: 'expiry_days', then: Joi.number().required() },
            { is: 'usage_type', then: Joi.string().valid('single', 'multiple').required() },
            {
                is: 'pre_defined_amounts', then: Joi.object().keys({
                    amount: Joi.number().strict().required(),
                    action_type: Joi.string().valid('add', 'delete').required()
                }).required()
            },
            { is: 'image', then: Joi.string().required() },
            { is: 'get_all', then: Joi.optional() }
        ]
    })
})), serviceModel.gift_card.change_setting);

router.post('/gift_card/orders', checkApiKey, checkToken, checkRolePermission("gift_card", "view"), serviceModel.gift_card.orders);

router.post('/gift_card/total_purchase', checkApiKey, checkToken, checkRolePermission("gift_card", "view"), decryption, validateJoi(Joi.object({
    date: Joi.string().optional()
})), serviceModel.gift_card.total_purchase);

router.post('/gift_card/create', checkApiKey, checkToken, checkRolePermission("gift_card", "edit"), decryption, validateJoi(Joi.object({
    occasion_id: Joi.number().required(),
    name: Joi.string().required(),
    image: Joi.string().required()
})), serviceModel.gift_card.create);

router.post('/gift_card/update', checkApiKey, checkToken, checkRolePermission("gift_card", "edit"), decryption, validateJoi(Joi.object({
    gift_card_id: Joi.number().required(),
    occasion_id: Joi.number().required(),
    name: Joi.string().required(),
    image: Joi.string().required()
})), serviceModel.gift_card.update);

router.post('/gift_card/get', checkApiKey, checkToken, checkRolePermission("gift_card", "view"), decryption, validateJoi(Joi.object({
    gift_card_id: Joi.number().required()
})), serviceModel.gift_card.get);

router.post('/gift_card/list', checkApiKey, checkToken, checkRolePermission("gift_card", "view"), decryption, validateJoi(Joi.object({
    occasion_id: Joi.number().optional()
})), serviceModel.gift_card.list);

router.post('/gift_card/purchase_history', checkApiKey, checkToken, checkRolePermission("gift_card", "view"), decryption, validateJoi(Joi.object({
    date: Joi.string().optional(),
    occasion_id: Joi.number().optional()
})), serviceModel.gift_card.purchase_history);

router.post('/gift_card/purchase_details', checkApiKey, checkToken, checkRolePermission("gift_card", "view"), decryption, validateJoi(Joi.object({
    gift_card_purchase_id: Joi.number().required()
})), serviceModel.gift_card.purchase_details);

router.post('/gift_card/user_gift_card_action', checkApiKey, checkToken, checkRolePermission("gift_card", "edit"), decryption, validateJoi(Joi.object({
    gift_card_purchase_id: Joi.number().required(),
    type: Joi.string().valid('is_active', 'is_delete').required(),
    value: Joi.number().valid(0, 1).required()
})), serviceModel.gift_card.user_gift_card_action);

router.post('/gift_card/action', checkApiKey, checkToken, checkRolePermission("gift_card", "edit"), decryption, validateJoi(Joi.object({
    is_active: Joi.number().valid(0, 1).required(),
    gift_card_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required()
})), serviceModel.gift_card.action);

router.post('/gift_card/delete', checkApiKey, checkToken, checkRolePermission("gift_card", "delete"), decryption, validateJoi(Joi.object({
    gift_card_id: Joi.number().required()
})), serviceModel.gift_card.delete);

router.post('/gift_card/resend', checkApiKey, checkToken, checkRolePermission("gift_card", "edit"), decryption, validateJoi(Joi.object({
    gift_card_purchase_id: Joi.number().required()
})), serviceModel.gift_card.resend);

//////////////////////////////////////////////////////////////////////
//                            campaigns                             //
//////////////////////////////////////////////////////////////////////

router.post('/campaigns/add_event', checkApiKey, checkToken, checkRolePermission("campaigns", "edit"), decryption, validateJoi(Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    start_date: Joi.string().required(),
    start_time: Joi.string().required(),
    end_date: Joi.string().required(),
    end_time: Joi.string().required(),
    media_file: Joi.string().required(),
    pop_up_display_times: Joi.number().required(),
})), serviceModel.campaigns.add_event);

router.post('/campaigns/edit_event', checkApiKey, checkToken, checkRolePermission("campaigns", "edit"), decryption, validateJoi(Joi.object({
    event_id: Joi.number().required(),
    name: Joi.string().required(),
    description: Joi.string().required(),
    start_date: Joi.string().required(),
    start_time: Joi.string().required(),
    end_date: Joi.string().required(),
    end_time: Joi.string().required(),
    media_file: Joi.string().required(),
    pop_up_display_times: Joi.number().required(),
})), serviceModel.campaigns.edit_event);

router.post('/campaigns/list_events', checkApiKey, checkToken, checkRolePermission("campaigns", "view"), serviceModel.campaigns.list_events);

router.post('/campaigns/get_event', checkApiKey, checkToken, checkRolePermission("campaigns", "view"), decryption, validateJoi(Joi.object({
    event_id: Joi.number().required()
})), serviceModel.campaigns.get_event);

// role permission in model
router.post('/campaigns/action', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    event_id: Joi.number().required(),
    type: Joi.string().valid('is_active', 'is_delete').required(),
    value: Joi.number().valid(0, 1).required()
})), serviceModel.campaigns.action);

//////////////////////////////////////////////////////////////////////
//                           Notification                           //
//////////////////////////////////////////////////////////////////////

router.post('/notification/send', checkApiKey, checkToken, checkRolePermission("send_notification", "edit"), decryption, validateJoi(Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    send_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).message('Date format should be YYYY-MM-DD').required(),
    send_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).message('Time format should be HH:MM:SS').required(),
    mode: Joi.valid('WhatsApp', 'SMS', 'Email', 'Push Notification').required(),
    user_type: Joi.valid('Customer', 'Rider', 'Single Device', 'Branch', 'Call Centre', 'Excel Upload').required(),
    notif_filter_name: Joi.when('user_type', {
        switch: [
            { is: 'Customer', then: Joi.string().required() },
            { is: 'Rider', then: Joi.string().required() },
            { is: 'Branch', then: Joi.string().required() },
            { is: 'Call Centre', then: Joi.string().required() }
        ],
        otherwise: Joi.optional()
    }),
    notif_sub_filter_name: Joi.string().optional(),
    send_utc_datetime: Joi.string().required(),
    notif_filter_value: Joi.when('user_type', { is: 'Single Device', then: Joi.string().required(), otherwise: Joi.optional() }),
    excel_sheet_name: Joi.when('user_type', { is: 'Excel Upload', then: Joi.string().required(), otherwise: Joi.optional() }),
    media_name: Joi.string().pattern(/\.(mp4|gif|png|jpg|jpeg)$/i).message('Only mp4, gif, png, jpg, jpeg files are allowed').optional()
})), serviceModel.notification.send);

router.post('/notification/filter_listing', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    user_type: Joi.string().valid('Customer', 'Rider', 'Branch', 'Call Centre').required(),
    filter_type: Joi.string().valid('main_filter', 'sub_filter').required(),
    main_filter: Joi.when('filter_type', { is: 'sub_filter', then: Joi.string().required(), otherwise: Joi.optional() }),
})), serviceModel.notification.filter_listing);

router.post('/notification/list_count', checkApiKey, checkToken, checkRolePermission("send_notification", "view"), serviceModel.notification.list_count);

router.post('/notification/list', checkApiKey, checkToken, checkRolePermission("send_notification", "view"), serviceModel.notification.list);

router.post('/notification/history', checkApiKey, checkToken, checkRolePermission("send_notification", "view"), decryption, validateJoi(Joi.object({
    notification_id: Joi.number().required()
})), serviceModel.notification.history);

router.post('/notification/retry', checkApiKey, checkToken, checkRolePermission("send_notification", "edit"), decryption, validateJoi(Joi.object({
    notif_sent_id: Joi.number().required(),
})), serviceModel.notification.retry);

router.post('/notification/get_log_details', checkApiKey, checkToken, checkRolePermission("send_notification", "view"), decryption, validateJoi(Joi.object({
    notif_sent_id: Joi.number().required(),
})), serviceModel.notification.get_log_details);

router.post('/notification/delete_log', checkApiKey, checkToken, checkRolePermission("send_notification", "delete"), decryption, validateJoi(Joi.object({
    notif_sent_id: Joi.number().required(),
})), serviceModel.notification.delete_log);

router.post('/notification/search_user', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    search_phone: Joi.string().required()
})), serviceModel.notification.search_user);

router.post('/notification/sub_category_list', checkApiKey, checkToken, serviceModel.notification.sub_category_list);

//////////////////////////////////////////////////////////////////////
//                              Wallet                              //
//////////////////////////////////////////////////////////////////////

router.post('/wallet/dashboard', checkApiKey, checkToken, checkRolePermission("setting", "view"), decryption, validateJoi(Joi.object({
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional(),
})), serviceModel.wallet.dashboard);

router.post('/wallet/history', checkApiKey, checkToken, checkRolePermission("setting", "view"), serviceModel.wallet.history);

router.post('/wallet/user_list', checkApiKey, checkToken, checkRolePermission("setting", "view"), decryption, validateJoi(Joi.object({
    year: Joi.string().optional(),
    date: Joi.string().optional(),
})), serviceModel.wallet.user_list);

router.post('/wallet/user_details', checkApiKey, checkToken, checkRolePermission("setting", "view"), decryption, validateJoi(Joi.object({
    user_id: Joi.number().required()
})), serviceModel.wallet.user_details);

router.post('/wallet/edit_wallet', checkApiKey, checkToken, checkRolePermission("setting", "view"), decryption, validateJoi(Joi.object({
    user_id: Joi.number().required(),
    wallet_amount: Joi.number().required(),
    transaction_type: Joi.string().valid('credit', 'debit').required(),
    admin_comment: Joi.string().optional()
})), serviceModel.wallet.edit_wallet);

router.post('/wallet/edit_payment_mode', checkApiKey, checkToken, checkRolePermission("setting", "view"), decryption, validateJoi(Joi.object({
    mode: Joi.string().valid(...PAYMENT_MODES).required(),
    status: Joi.string().valid('active', 'in_active').required()
})), serviceModel.wallet.edit_payment_mode);

module.exports = router;