const { decryption, validateJoi, checkToken, checkRolePermission, checkApiKey } = require('../../middleware');
const { riderModel, inventoryModel, tutorialModel, incentivesModel } = require('../../models/v1/rider.model');
const express = require('express');
const Joi = require('joi');
const router = express.Router();

router.post('/add_rider', checkApiKey, checkToken, checkRolePermission("rider", "edit"), decryption, validateJoi(Joi.object({
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    username_email: Joi.string().required(),
    password: Joi.string().required(),
    rider_type: Joi.string().valid('in_house', '3rd_party').required(),
    phone: Joi.string().required(),
    alternate_phone: Joi.string().required(),
    country_name: Joi.string().required(),
    branch_id: Joi.number().required(),
    shift_start_time: Joi.string().required(),
    shift_end_time: Joi.string().required(),
    identity_proof: Joi.string().required(),
    license_number: Joi.string().required(),
    expiry_date: Joi.string().required(),
    reference_name: Joi.string().required(),
    reference_phone: Joi.string().required(),
    profile_image: Joi.string().optional()
})), riderModel.add_rider);

router.post('/edit_rider', checkApiKey, checkToken, checkRolePermission("rider", "edit"), decryption, validateJoi(Joi.object({
    rider_id: Joi.number().required(),
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    username_email: Joi.string().required(),
    password: Joi.string().required(),
    rider_type: Joi.string().valid('in_house', '3rd_party').required(),
    phone: Joi.string().required(),
    alternate_phone: Joi.string().required(),
    country_name: Joi.string().required(),
    branch_id: Joi.number().required(),
    shift_start_time: Joi.string().required(),
    shift_end_time: Joi.string().required(),
    identity_proof: Joi.string().required(),
    license_number: Joi.string().required(),
    expiry_date: Joi.string().required(),
    reference_name: Joi.string().required(),
    bike_number_plate: Joi.string().required(),
    blood_group: Joi.string().required(),
    reference_phone: Joi.string().required(),
    profile_image: Joi.string().optional()
})), riderModel.edit_rider);

router.post('/restaurant_menu_list', checkApiKey, checkToken, checkRolePermission("rider", "view"), riderModel.restaurant_menu_list);

router.post('/get_rider', checkApiKey, checkToken, checkRolePermission("rider", "view"), decryption, validateJoi(Joi.object({
    rider_id: Joi.number().required()
})), riderModel.get_rider);

router.post('/get_rider_map_track', checkApiKey, checkToken, checkRolePermission("rider", "view"), decryption, validateJoi(Joi.object({
    type: Joi.string().valid('current', 'history').required(),
    rider_id: Joi.number().required(),
})), riderModel.get_rider_map_track);

router.post('/general_order_activity', checkApiKey, checkToken, checkRolePermission("rider", "view"), decryption, validateJoi(Joi.object({
    rider_id: Joi.number().required(),
    date: Joi.string().optional()
})), riderModel.general_order_activity);

router.post('/rider_delayed_orders', checkApiKey, checkToken, checkRolePermission("rider", "view"), decryption, validateJoi(Joi.object({
    type: Joi.string().valid('return_delay', 'delivery_delay').optional(),
})), riderModel.rider_delayed_orders);

router.post('/live_map_status', checkApiKey, checkToken, checkRolePermission("rider", "view"), decryption, validateJoi(Joi.object({
    filter: Joi.string().valid('Available', 'Rider Returning', 'Out For Delivery').optional(),
    branch_id: Joi.number().optional(),
})), riderModel.live_map_status);

router.post('/live_status_list', checkApiKey, checkToken, checkRolePermission("rider", "view"), riderModel.live_status_list);

router.post('/feedback_comments', checkApiKey, checkToken, checkRolePermission("rider", "view"), decryption, validateJoi(Joi.object({
    rider_id: Joi.number().required(),
    date: Joi.string().optional()
})), riderModel.feedback_comments);

router.post('/leaderboard', checkApiKey, checkToken, checkRolePermission("rider", "view"), decryption, validateJoi(Joi.object({
    month: Joi.number().strict().optional(),
    branch_id: Joi.number().optional(),
    rider_type: Joi.string().valid('in_house', '3rd_party').optional(),
})), riderModel.leaderboard);

router.post('/list_riders', checkApiKey, checkToken, checkRolePermission("rider", "view"), decryption, validateJoi(Joi.object({
    branch_id: Joi.number().optional(),
    status: Joi.number().valid("not_available", "available", "out_for_delivery", "on_break", "returning_back").optional(),
})), riderModel.list_riders);

router.post('/action_rider', checkApiKey, checkToken, checkRolePermission("rider", "edit"), decryption, validateJoi(Joi.object({
    rider_id: Joi.number().required(),
    type: Joi.string().valid("block", "available", "delete", "restaurant", "monthly_earning", "edit_accident_count", "logged_out_device").required(),
    value: Joi.when('type', {
        switch: [
            { is: 'restaurant', then: Joi.number().min(1).required() },
            { is: 'block', then: Joi.number().valid(0, 1).required() },
            { is: 'available', then: Joi.number().valid(0, 1).required() },
            { is: 'delete', then: Joi.number().valid(0, 1).required() },
            { is: 'monthly_earning', then: Joi.number().required() },
            { is: 'edit_accident_count', then: Joi.number().required() },
            { is: 'logged_out_device', then: Joi.number().required() },
        ],
        otherwise: Joi.optional()
    })
})), riderModel.action_rider);

router.post('/logged_in_devices', checkApiKey, checkToken, checkRolePermission("rider", "view"), decryption, validateJoi(Joi.object({
    rider_id: Joi.number().required()
})), riderModel.logged_in_devices);

router.post('/crud_champ', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    rider_id: Joi.number().required(),
    type: Joi.string().valid("add", "delete", "list").required(),
    value: Joi.when('type', {
        switch: [{
            is: 'add', then: Joi.object({
                title: Joi.string().required(),
                date: Joi.string().required(),
            }).required()
        }, { is: 'delete', then: Joi.number().required() }],
        otherwise: Joi.optional()
    })
})), riderModel.crud_champ);

router.post('/add_comment', checkApiKey, checkToken, checkRolePermission("rider", "edit"), decryption, validateJoi(Joi.object({
    rider_id: Joi.number().required(),
    title: Joi.string().required(),
    comment: Joi.string().required()
})), riderModel.add_comment);

router.post('/mark_comment_resolved', checkApiKey, checkToken, checkRolePermission("rider", "edit"), decryption, validateJoi(Joi.object({
    comment_id: Joi.number().required()
})), riderModel.mark_comment_resolved);

router.post('/comments_list', checkApiKey, checkToken, checkRolePermission("rider", "view"), decryption, validateJoi(Joi.object({
    rider_id: Joi.number().required()
})), riderModel.comments_list);

router.post('/order_list', checkApiKey, checkToken, checkRolePermission("rider", "view"), decryption, validateJoi(Joi.object({
    rider_id: Joi.number().required()
})), riderModel.order_list);

//////////////////////////////////////////////////////////////////////
//                            Inventory                             //
//////////////////////////////////////////////////////////////////////

router.post('/inventory/main_listing', checkApiKey, checkToken, checkRolePermission("inventory", "view"), decryption, validateJoi(Joi.object({
    view_more: Joi.valid('new_items', 'recent_activity', 'damaged_items', 'old_items').optional(),
    date_filter_type: Joi.valid('new_items', 'recent_activity', 'damaged_items', 'old_items').optional(),
    start_date: Joi.when('date_filter_type', {
        is: Joi.exist(),
        then: Joi.string().required(),
        otherwise: Joi.optional()
    }),
    end_date: Joi.when('start_date', {
        is: Joi.exist(),
        then: Joi.string().required(),
        otherwise: Joi.optional()
    })
})), inventoryModel.main_listing);

router.post('/inventory/create_category', checkApiKey, checkToken, checkRolePermission("inventory", "edit"), decryption, validateJoi(Joi.object({
    name: Joi.string().required(),
    store_location: Joi.string().required()
})), inventoryModel.create_category);

router.post('/inventory/category_list', checkApiKey, checkToken, checkRolePermission("inventory", "view"), inventoryModel.category_list);

router.post('/inventory/create_sub_category', checkApiKey, checkToken, checkRolePermission("inventory", "edit"), decryption, validateJoi(Joi.object({
    category_id: Joi.number().required(),
    name: Joi.string().required()
})), inventoryModel.create_sub_category);

router.post('/inventory/sub_category_list', checkApiKey, checkToken, checkRolePermission("inventory", "view"), decryption, validateJoi(Joi.object({
    category_id: Joi.number().required()
})), inventoryModel.sub_category_list);

router.post('/inventory/create_item', checkApiKey, checkToken, checkRolePermission("inventory", "edit"), decryption, validateJoi(Joi.object({
    category_id: Joi.number().required(),
    sub_category_id: Joi.number().required(),
    name: Joi.string().required(),
    ex_item_id: Joi.string().required(),
    store_location: Joi.string().required(),
    quantity: Joi.number().required(),
    unit_price: Joi.number().required(),
    total_price: Joi.number().required(),
    size: Joi.valid('small', 'large', 'others').required(),
    supplier_name: Joi.string().required(),
    supplier_location: Joi.string().required(),
    average_life: Joi.number().required(),
    image: Joi.string().optional().default('default.png')
})), inventoryModel.create_item);

router.post('/inventory/add_stock', checkApiKey, checkToken, checkRolePermission("inventory", "edit"), decryption, validateJoi(Joi.object({
    inventory_item_id: Joi.number().required(),
    ex_item_id: Joi.string().required(),
    store_location: Joi.string().required(),
    quantity: Joi.number().required(),
    unit_price: Joi.number().required(),
    total_price: Joi.number().required(),
    size: Joi.valid('small', 'large', 'others').required(),
    supplier_name: Joi.string().required(),
    supplier_location: Joi.string().required(),
    average_life: Joi.number().required(),
})), inventoryModel.add_stock);

router.post('/inventory/items_allocations', checkApiKey, checkToken, checkRolePermission("inventory", "view"), decryption, validateJoi(Joi.object({
    inventory_item_id: Joi.number().required(),
    rider_id: Joi.number().required(),
    restaurant_id: Joi.number().required(),
    quantity: Joi.number().required().strict(),
    received_date: Joi.date().required(),
    status: Joi.valid('new', 'old', 'recovered', 'damaged').required()
})), inventoryModel.items_allocations);

router.post('/inventory/item_details', checkApiKey, checkToken, checkRolePermission("inventory", "view"), decryption, validateJoi(Joi.object({
    inventory_item_id: Joi.number().required(),
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional()
})), inventoryModel.item_details);

//////////////////////////////////////////////////////////////////////
//                             Tutorial                             //
//////////////////////////////////////////////////////////////////////

router.post('/tutorial/add', checkApiKey, checkToken, checkRolePermission("tutorials", "edit"), decryption, validateJoi(Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    visibility: Joi.number().valid('rider', 'customer', 'branch', 'call_center', 'sub_admin').required(),
    file_name: Joi.string().required(),
    is_draft: Joi.number().valid(0, 1).required()
})), tutorialModel.add);

router.post('/tutorial/edit', checkApiKey, checkToken, checkRolePermission("tutorials", "edit"), decryption, validateJoi(Joi.object({
    tutorial_id: Joi.number().required(),
    title: Joi.string().required(),
    description: Joi.string().required(),
    visibility: Joi.number().valid('rider', 'customer', 'branch', 'call_center', 'sub_admin').required(),
    file_name: Joi.string().required(),
    is_draft: Joi.number().valid(0, 1).required()
})), tutorialModel.edit);

router.post('/tutorial/delete', checkApiKey, checkToken, checkRolePermission("tutorials", "delete"), decryption, validateJoi(Joi.object({
    tutorial_id: Joi.number().required()
})), tutorialModel.delete);

router.post('/tutorial/get', checkApiKey, checkToken, checkRolePermission("tutorials", "view"), decryption, validateJoi(Joi.object({
    tutorial_id: Joi.number().required()
})), tutorialModel.get);

router.post('/tutorial/list', checkApiKey, checkToken, checkRolePermission("tutorials", "view"), decryption, validateJoi(Joi.object({
    type: Joi.number().valid('video', 'presentation', 'document').required(),
})), tutorialModel.list);

//////////////////////////////////////////////////////////////////////
//                            Incentives                            //
//////////////////////////////////////////////////////////////////////

router.post('/incentives/get_incentive_plans', checkApiKey, checkToken, checkRolePermission("rider", "view"), incentivesModel.get_incentive_plans);
router.post('/incentives/get_criteria', checkApiKey, checkToken, checkRolePermission("rider", "view"), incentivesModel.get_criteria);
router.post('/incentives/add_incentive_plan', checkApiKey, checkToken, checkRolePermission("rider", "edit"), decryption, validateJoi(Joi.object({
    amount: Joi.number().required(),
    criteria_ids: Joi.array().items(Joi.number()).required(),
})), incentivesModel.add_incentive_plan);
router.post('/incentives/edit_incentive_plan', checkApiKey, checkToken, checkRolePermission("rider", "edit"), decryption, validateJoi(Joi.object({
    plan_id: Joi.number().required(),
    amount: Joi.number().required(),
    criteria_ids: Joi.array().items(Joi.number()).required(),
})), incentivesModel.edit_incentive_plan);
router.post('/incentives/action', checkApiKey, checkToken, checkRolePermission("rider", "edit"), decryption, validateJoi(Joi.object({
    type: Joi.valid("incentive_plans", "incentive_criteria").required(),
    primary_id: Joi.number().required(),
    value: Joi.number().valid(0, 1).required()
})), incentivesModel.action);

module.exports = router;