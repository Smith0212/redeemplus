const { decryption, checkToken, checkApiKey, checkRolePermission, validateJoi } = require('../../middleware');
const { commonModel, deliveryModel, ticketModel } = require('../../models/v1/order.model');
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { SERVICE_TYPE, COUNTRY } = require('../../config/constants');

//////////////////////////////////////////////////////////////////////
//                              Common                              //
//////////////////////////////////////////////////////////////////////

router.post('/webhook', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    update_type: Joi.string().required(),
    update_data: Joi.object({}).required()
})), commonModel.webhook);

router.post('/new_orders_counts', checkApiKey, checkToken, commonModel.new_orders_counts);

router.post('/rider_tracking', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    order_id: Joi.number().required()
})), commonModel.rider_tracking);
    

// role based permission added in model
router.post('/order_details', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    order_id: Joi.number().required()
})), commonModel.order_details);

router.post('/order_update_address', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    order_id: Joi.number().required(),
    delivery_address_id: Joi.number().required(),
})), commonModel.order_update_address);

// role based permission added in model
router.post('/list_counts', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    service_type: Joi.string().valid(...SERVICE_TYPE).required()
})), commonModel.list_counts);

// role based permission added in model
router.post('/add_comment', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    order_id: Joi.number().required(),
    comment: Joi.string().required(),
    receiver_type: Joi.string().valid('rider', 'restaurant', 'rider_and_restaurant').required()
})), commonModel.add_comment);

router.post('/rider_list', checkApiKey, checkToken, commonModel.rider_list);

// role based permission added in model
router.post('/assign_rider', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    order_id: Joi.number().required(),
    rider_id: Joi.number().required()
})), commonModel.assign_rider);

// role based permission added in model
router.post('/order_list', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    page: Joi.number().default(1),
    limit: Joi.number().default(10),
    restaurant_branch_id: Joi.number().optional(),
    service_type: Joi.string().valid(...SERVICE_TYPE).required(),
    type: Joi.string().valid('all', 'new', 'scheduled', 'in_preparation', 'ready', 'picked_up', 'completed', 'replacements', 'cancelled').default('new')
})), commonModel.order_list);

// role based permission added in model
router.post('/order_live_status', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    service_type: Joi.string().valid(...SERVICE_TYPE).required()
})), commonModel.order_live_status);

// role based permission added in model
router.post('/near_by_restaurants', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    order_id: Joi.number().required()
})), commonModel.near_by_restaurants);

// role based permission added in model
router.post('/action_order', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    order_id: Joi.number().required(),
    action: Joi.string().valid('approve', 'reject').required(),
    restaurant_branch_id: Joi.when('action', { is: 'approve', then: Joi.number().required(), otherwise: Joi.optional() }),
    is_priority: Joi.when('action', { is: 'approve', then: Joi.number().valid(0, 1).required(), otherwise: Joi.optional() }),
    service_time: Joi.when('action', { is: 'approve', then: Joi.number().required(), otherwise: Joi.optional() }),
    reason: Joi.when('action', { is: 'reject', then: Joi.string().required(), otherwise: Joi.optional() }),
    is_edit: Joi.boolean().default(false)
})), commonModel.action_order);

// webhook for action order auto approve
router.post('/action_order_webhook', validateJoi(Joi.object({
    order_id: Joi.number().required(),
    country: Joi.string().valid(...COUNTRY).required(),
})), commonModel.action_order_webhook);

// role based permission added in model
router.post('/replace_or_refund_items', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    order_id: Joi.number().required(),
    type: Joi.string().valid('replace', 'refund').required(),
    items: Joi.array().items(Joi.object({
        order_item_id: Joi.number().required(),
        quantity: Joi.number().required(),
    })).required(),
    amount: Joi.number().required(),
    reason: Joi.string().required(),
    comment: Joi.string().required(),
    refund_payment_type: Joi.when('type', { is: 'refund', then: Joi.string().valid('wallet', 'card').required(), otherwise: Joi.optional() }),
    is_return_to_branch: Joi.when('type', { is: 'replace', then: Joi.boolean().required(), otherwise: Joi.optional() }),
    is_items_not_recovered: Joi.when('type', { is: 'replace', then: Joi.boolean().required(), otherwise: Joi.optional() }),
})), commonModel.replace_or_refund_items);

// role based permission added in model
router.post('/get_order_status', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    order_id: Joi.number().required()
})), commonModel.get_order_status);

// role based permission added in model
router.post('/edit_menu_items', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    order_id: Joi.number().required(),
    order_item_id: Joi.number().required(),
    quantity: Joi.number().min(1).required(),
})), commonModel.edit_menu_items);

// role based permission added in model
router.post('/remove_menu_item', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    order_id: Joi.number().required(),
    order_item_id: Joi.number().required(),
})), commonModel.remove_menu_item);

// role based permission added in model
router.post('/cancel_order', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    order_id: Joi.number().required()
})), commonModel.cancel_order);

//temporary
router.post('/check/mark_prepared', validateJoi(Joi.object({
    order_id: Joi.number().required()
})), commonModel.mark_prepared);
router.post('/check/mark_packaged', validateJoi(Joi.object({
    order_id: Joi.number().required()
})), commonModel.mark_packaged);
router.post('/check/mark_full_prepared', validateJoi(Joi.object({
    order_id: Joi.number().required()
})), commonModel.mark_full_prepared);
router.post('/check/mark_as_completed', validateJoi(Joi.object({
    order_id: Joi.number().required()
})), commonModel.mark_as_completed);

//////////////////////////////////////////////////////////////////////
//                             Delivery                             //
//////////////////////////////////////////////////////////////////////

router.post('/delivery/complimentary_item_list', checkApiKey, checkToken, checkRolePermission("delivery", "view"), decryption, validateJoi(Joi.object({
    order_id: Joi.number().required()
})), deliveryModel.complimentary_item_list);

router.post('/delivery/complimentary_item_add', checkApiKey, checkToken, checkRolePermission("delivery", "edit"), decryption, validateJoi(Joi.object({
    order_id: Joi.number().required(),
    complimentary_id: Joi.number().required()
})), deliveryModel.complimentary_item_add);

//////////////////////////////////////////////////////////////////////
//                              Report                              //
//////////////////////////////////////////////////////////////////////

// Create a new ticket
router.post('/report/create_ticket', checkApiKey, checkToken, checkRolePermission("report_order", "edit"), decryption, validateJoi(Joi.object({
        order_id: Joi.number().allow(null),
        issue_title: Joi.string().required(),
        description: Joi.string().allow('', null),
        priority: Joi.string().valid('Low', 'Medium', 'High', 'Urgent').required(),
        members: Joi.array().items(Joi.number()).required(),
        media: Joi.array().items(Joi.string()).optional(),
        is_other_issue: Joi.number().valid(0, 1).required(),
})), ticketModel.create_ticket);

// Get report order dashboard data
router.post('/report/dashboard', checkApiKey, checkToken, checkRolePermission("report_order", "view"), decryption, validateJoi(Joi.object({
    date_from: Joi.date().iso().optional(),
    date_to: Joi.date().iso().optional()
})), ticketModel.dashboard);

// Get ticket list
router.post('/report/ticket_list', checkApiKey, checkToken, checkRolePermission("report_order", "view"), decryption, validateJoi(Joi.object({
    status: Joi.string().valid('Pending', 'In Progress', 'Resolved').optional(),
    priority: Joi.string().valid('Low', 'Medium', 'High', 'Urgent').optional(),
    date_from: Joi.date().iso().optional(),
    date_to: Joi.date().iso().optional(),
    branch_id: Joi.number().optional(),
    issue_type: Joi.string().optional()
})), ticketModel.ticket_list);

// Get ticket details
router.post('/report/ticket_details', checkApiKey, checkToken, checkRolePermission("report_order", "view"), decryption, validateJoi(Joi.object({
    ticket_id: Joi.number().required()
})), ticketModel.ticket_details);

// Update ticket
router.post('/report/update_ticket', checkApiKey, checkToken, checkRolePermission("report_order", "edit"), decryption, validateJoi(Joi.object({
    ticket_id: Joi.number().required(),
    issue_title: Joi.string().optional(),
    description: Joi.string().optional(),
    issue_date: Joi.string().optional(),
    priority: Joi.string().valid('Low', 'Medium', 'High', 'Urgent').optional(),
    status: Joi.string().valid('Pending', 'In Progress', 'Resolved').optional()
})), ticketModel.update_ticket);

// Add comment to ticket
router.post('/report/add_comment', checkApiKey, checkToken, checkRolePermission("report_order", "edit"), decryption, validateJoi(Joi.object({
    ticket_id: Joi.number().required(),
    comment: Joi.string().required(),
    media: Joi.array().items(Joi.string()).optional()
})), ticketModel.add_comment);

// Add attachment to ticket
router.post('/report/add_attachment', checkApiKey, checkToken, checkRolePermission("report_order", "edit"), decryption, validateJoi(Joi.object({
    ticket_id: Joi.number().required(),
    media: Joi.array().items(Joi.string()).required()
})), ticketModel.add_attachment);

// Assign ticket to admin user
router.post('/report/assign_ticket', checkApiKey, checkToken, checkRolePermission("report_order", "edit"), decryption, validateJoi(Joi.object({
    ticket_id: Joi.number().required(),
    admin_id: Joi.number().required()
})), ticketModel.assign_ticket);

// Mark ticket as resolved
router.post('/report/resolve_ticket', checkApiKey, checkToken, checkRolePermission("report_order", "edit"), decryption, validateJoi(Joi.object({
    ticket_id: Joi.number().required()
})), ticketModel.resolve_ticket);

// Delete ticket
router.post('/report/delete_ticket', checkApiKey, checkToken, checkRolePermission("report_order", "delete"), decryption, validateJoi(Joi.object({
    ticket_id: Joi.number().required()
})), ticketModel.delete_ticket);

// SubAdmin Users List
router.post('/report/sub_admin_list', checkApiKey, checkToken, checkRolePermission("report_order", "edit"), ticketModel.sub_admin_list);

// order list
router.post('/report/order_list', checkApiKey, checkToken, checkRolePermission("report_order", "edit"), decryption, validateJoi(Joi.object({
    user_id: Joi.number().required()
})), ticketModel.order_list);

router.post('/report/user_fetch', checkApiKey, checkToken, checkRolePermission("report_order", "edit"), decryption, validateJoi(Joi.object({
    country_code: Joi.string().required(),
    phone: Joi.string().required()
})), ticketModel.user_fetch);

module.exports = router;