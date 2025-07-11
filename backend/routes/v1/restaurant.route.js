const { decryption, validateJoi, checkToken, checkRolePermission, checkApiKey } = require('../../middleware');
const restaurantModel = require('../../models/v1/restaurant.model');
const express = require('express');
const Joi = require('joi');
const router = express.Router();

router.post('/list_restaurants', checkApiKey, checkToken, checkRolePermission("restaurant", "view"), restaurantModel.list_restaurants);

router.post('/live_orders', checkApiKey, checkToken, checkRolePermission("restaurant", "view"), decryption, validateJoi(Joi.object({
    restaurant_id: Joi.number().required()
})), restaurantModel.live_orders);

router.post('/view_restaurant', checkApiKey, checkToken, checkRolePermission("restaurant", "view"), decryption, validateJoi(Joi.object({
    restaurant_id: Joi.number().required()
})), restaurantModel.view_restaurant);

router.post('/feedback_and_comments', checkApiKey, checkToken, checkRolePermission("restaurant", "view"), decryption, validateJoi(Joi.object({
    restaurant_id: Joi.number().required()
})), restaurantModel.feedback_and_comments);

router.post('/view_live_orders_updates', checkApiKey, checkToken, checkRolePermission("restaurant", "view"), decryption, validateJoi(Joi.object({
    restaurant_id: Joi.number().required(),
    live_order_type: Joi.string().optional()
})), restaurantModel.view_live_orders_updates);

router.post('/action', checkApiKey, checkToken, checkRolePermission("restaurant", "edit"), decryption, validateJoi(Joi.object({
    restaurant_id: Joi.number().required(),
    type: Joi.string().valid('rider_daily_milestone', 'rider_daily_least_target').required(),
    value: Joi.number().required()
})), restaurantModel.action);

router.post('/add_restaurant', checkApiKey, checkToken, checkRolePermission("restaurant", "edit"), decryption, validateJoi(Joi.object({
    name: Joi.string().required(),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    address: Joi.string().required(),
    // country_code: Joi.string().required(),
    phone_number: Joi.string().max(15).required(),
    is_dine_in: Joi.number().valid(0, 1).optional(),
    is_pick_up: Joi.number().valid(0, 1).optional(),
    is_carhop: Joi.number().valid(0, 1).optional(),
    is_delivery: Joi.number().valid(0, 1).optional(),
    images: Joi.array().items(Joi.string()),
    ex_restaurant_id: Joi.string().alphanum().min(3).max(30).default(null),
    password: Joi.string().min(8).required()
})), restaurantModel.add_restaurant);

router.post('/edit_restaurant', checkApiKey, checkToken, checkRolePermission("restaurant", "edit"), decryption, validateJoi(Joi.object({
    restaurant_id: Joi.number().required(),
    name: Joi.string().required(),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    address: Joi.string().required(),
    // country_code: Joi.string().required(),
    phone_number: Joi.string().max(15).required(),
    is_dine_in: Joi.number().valid(0, 1).optional(),
    is_pick_up: Joi.number().valid(0, 1).optional(),
    is_carhop: Joi.number().valid(0, 1).optional(),
    is_delivery: Joi.number().valid(0, 1).optional(),
    images: Joi.array().items(Joi.string()),
    ex_restaurant_id: Joi.string().alphanum().min(3).max(30).default(null),
    password: Joi.string().min(8).required()
})), restaurantModel.edit_restaurant);

router.post('/delete_restaurant', checkApiKey, checkToken, checkRolePermission("restaurant", "delete"), decryption, validateJoi(Joi.object({
    restaurant_id: Joi.number().required()
})), restaurantModel.delete_restaurant);

router.post('/select_option_list', checkApiKey, checkToken, restaurantModel.select_option_list);

router.post('/set_delivery_distance', checkApiKey, checkToken, checkRolePermission("restaurant", "edit"), decryption, validateJoi(Joi.object({
    restaurant_id: Joi.number().required(),
    max_delivery_distance: Joi.number().required()
})), restaurantModel.set_delivery_distance);

//////////////////////////////////////////////////////////////////////
//                      weekly_rider_pay_range                      //
//////////////////////////////////////////////////////////////////////

router.post('/weekly_rider_pay_range/add', checkApiKey, checkToken, checkRolePermission("restaurant", "edit"), decryption, validateJoi(Joi.object({
    restaurant_id: Joi.number().required(),
    from_milestone: Joi.number().required(),
    to_milestone: Joi.number().required(),
    amount: Joi.number().required()
})), restaurantModel.weekly_rider_pay_range.add);

router.post('/weekly_rider_pay_range/edit', checkApiKey, checkToken, checkRolePermission("restaurant", "edit"), decryption, validateJoi(Joi.object({
    milestone_range_id: Joi.number().required(),
    restaurant_id: Joi.number().required(),
    from_milestone: Joi.number().required(),
    to_milestone: Joi.number().required(),
    amount: Joi.number().required()
})), restaurantModel.weekly_rider_pay_range.edit);

router.post('/weekly_rider_pay_range/view', checkApiKey, checkToken, checkRolePermission("restaurant", "view"), decryption, validateJoi(Joi.object({
    restaurant_id: Joi.number().required(),
    milestone_range_id: Joi.number().optional()
})), restaurantModel.weekly_rider_pay_range.view);

router.post('/weekly_rider_pay_range/delete', checkApiKey, checkToken, checkRolePermission("restaurant", "delete"), decryption, validateJoi(Joi.object({
    milestone_range_id: Joi.number().required()
})), restaurantModel.weekly_rider_pay_range.delete);

//////////////////////////////////////////////////////////////////////
//                            time table                            //
//////////////////////////////////////////////////////////////////////

const timepattern = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
const timeerror = { 'string.pattern.base': '{{#label}} has an invalid time format. Please provide time in HH:mm:ss format.' };
const validationObj = Joi.object({
    restaurant_id: Joi.number().required(),
    day_name: Joi.array().items(Joi.string().valid('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')).required(),
    dine_in_start_time: Joi.string().pattern(timepattern).required().messages(timeerror),
    dine_in_end_time: Joi.string().pattern(timepattern).required().messages(timeerror),
    pick_up_start_time: Joi.string().pattern(timepattern).required().messages(timeerror),
    pick_up_end_time: Joi.string().pattern(timepattern).required().messages(timeerror),
    carhop_start_time: Joi.string().pattern(timepattern).required().messages(timeerror),
    carhop_end_time: Joi.string().pattern(timepattern).required().messages(timeerror),
    delivery_start_time: Joi.string().pattern(timepattern).required().messages(timeerror),
    delivery_end_time: Joi.string().pattern(timepattern).required().messages(timeerror)
});

const validationObjOld = Joi.object({
    restaurant_id: Joi.number().required(),
    day_name: Joi.string().valid('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday').required(),
    dine_in_start_time: Joi.string().pattern(timepattern).required().messages(timeerror),
    dine_in_end_time: Joi.string().pattern(timepattern).required().messages(timeerror),
    pick_up_start_time: Joi.string().pattern(timepattern).required().messages(timeerror),
    pick_up_end_time: Joi.string().pattern(timepattern).required().messages(timeerror),
    carhop_start_time: Joi.string().pattern(timepattern).required().messages(timeerror),
    carhop_end_time: Joi.string().pattern(timepattern).required().messages(timeerror),
    delivery_start_time: Joi.string().pattern(timepattern).required().messages(timeerror),
    delivery_end_time: Joi.string().pattern(timepattern).required().messages(timeerror)
})

router.post('/time_table/add_v2', checkApiKey, checkToken, checkRolePermission("time_table", "edit"), decryption, validateJoi(validationObj), restaurantModel.time_table.add_v2);

router.post('/time_table/add', checkApiKey, checkToken, checkRolePermission("time_table", "edit"), decryption, validateJoi(validationObjOld), restaurantModel.time_table.add);

router.post('/time_table/edit_v2', checkApiKey, checkToken, checkRolePermission("time_table", "edit"), decryption, validateJoi(validationObj), restaurantModel.time_table.edit_v2);

router.post('/time_table/edit', checkApiKey, checkToken, checkRolePermission("time_table", "edit"), decryption, validateJoi(validationObjOld), restaurantModel.time_table.edit);

router.post('/time_table/view', checkApiKey, checkToken, checkRolePermission("time_table", "view"), decryption, validateJoi(Joi.object({
    restaurant_id: Joi.number().required()
})), restaurantModel.time_table.view);

module.exports = router;