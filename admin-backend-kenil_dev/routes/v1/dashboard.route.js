const { decryption, validateJoi, checkToken, checkRolePermission, checkApiKey } = require('../../middleware');
const dashboardModel = require('../../models/v1/dashboard.model');
const express = require('express');
const Joi = require('joi');
const router = express.Router();

router.post("/total_orders", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional(),
    platform_type: Joi.string().valid("App", "Call Center").optional()
})), dashboardModel.total_orders);

router.post("/live_orders", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    platform_type: Joi.string().valid("App", "Call Center").optional()
})), dashboardModel.live_orders);

router.post("/scheduled_orders", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional()
})), dashboardModel.scheduled_orders);

router.post("/kitchen_bar_delayed_timings", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional()
})), dashboardModel.kitchen_bar_delayed_timings);

router.post("/top_cards_data", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional()
})), dashboardModel.top_cards_data);

router.post("/center_cards_data", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional()
})), dashboardModel.center_cards_data);

router.post("/total_available_riders", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional(),
    rider_type: Joi.string().valid("in_house", "3rd_party").optional()
})), dashboardModel.total_available_riders);

router.post("/reward_data", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional()
})), dashboardModel.reward_data);

router.post("/wallet_data", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional()
})), dashboardModel.wallet_data);

module.exports = router;