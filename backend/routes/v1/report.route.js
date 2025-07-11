const { decryption, validateJoi, checkToken, checkRolePermission, checkApiKey } = require('../../middleware');
const reportModel = require('../../models/v1/report.model');
const express = require('express');
const Joi = require('joi');
const router = express.Router();

// Daily Order Count Report
router.post("/daily_order_count", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    year: Joi.string().optional(),
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional(),
    start_time: Joi.string().optional(),
    end_time: Joi.string().optional(),
    platform_type: Joi.string().valid("app", "call_center").optional()
})), reportModel.daily_order_count);

// Branch Wise Service Report
router.post("/branch_wise_service", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    year: Joi.string().optional(),
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional(),
    start_time: Joi.string().optional(),
    end_time: Joi.string().optional(),
    platform_type: Joi.string().valid("app", "call_center").optional()
})), reportModel.branch_wise_service);

// Service wise Branch Report
router.post("/service_wise_branch", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    year: Joi.string().optional(),
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional(),
    start_time: Joi.string().optional(),
    end_time: Joi.string().optional(),
    platform_type: Joi.string().valid("app", "call_center").optional()
})), reportModel.service_wise_branch);

// Order Delay Report
router.post("/order_delay", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    year: Joi.string().optional(),
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional(),
    start_time: Joi.string().optional(),
    end_time: Joi.string().optional(),
    platform_type: Joi.string().valid("app", "call_center").optional()
})), reportModel.order_delay);

// Cancellation Report
router.post("/cancellation_branch_list", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    type: Joi.string().valid("Prepared orders", "Non Prepared orders").optional(),
})), reportModel.cancellation_branch_list);

// Cancellation Report
router.post("/cancellation_order_list", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    year: Joi.string().optional(),
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional(),
    start_time: Joi.string().optional(),
    end_time: Joi.string().optional(),
    platform_type: Joi.string().valid("app", "call_center").optional()
})), reportModel.cancellation_order_list);

// Customer Loyalty Points Credit Report
router.post("/loyalty_points_credit", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    year: Joi.string().optional(),
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional(),
    start_time: Joi.string().optional(),
    end_time: Joi.string().optional(),
    platform_type: Joi.string().valid("app", "call_center").optional()
})), reportModel.loyalty_points_credit);

// Rider-wise delivery count Report
router.post("/rider_wise", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    year: Joi.string().optional(),
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional(),
    start_time: Joi.string().optional(),
    end_time: Joi.string().optional(),
    platform_type: Joi.string().valid("app", "call_center").optional()
})), reportModel.rider_wise);

// Customer Feedback Report
router.post("/customer_feedback", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    year: Joi.string().optional(),
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional(),
    start_time: Joi.string().optional(),
    end_time: Joi.string().optional(),
    platform_type: Joi.string().valid("app", "call_center").optional()
})), reportModel.customer_feedback);

// Rider Inventory Report
router.post("/rider_inventory", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    year: Joi.string().optional(),
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional(),
    start_time: Joi.string().optional(),
    end_time: Joi.string().optional(),
    platform_type: Joi.string().valid("app", "call_center").optional()
})), reportModel.rider_inventory);

// Delivery Charges Revenue Report
router.post("/delivery_charges", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    year: Joi.string().optional(),
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional(),
    start_time: Joi.string().optional(),
    end_time: Joi.string().optional(),
    platform_type: Joi.string().valid("app", "call_center").optional()
})), reportModel.delivery_charges);

// Rider-wise productivity Report
router.post("/rider_productivity", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    year: Joi.string().optional(),
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional(),
    start_time: Joi.string().optional(),
    end_time: Joi.string().optional(),
    platform_type: Joi.string().valid("app", "call_center").optional()
})), reportModel.rider_productivity);

// Refund Report
router.post("/refund_orders", checkApiKey, checkToken, checkRolePermission("dashboards", "view"), decryption, validateJoi(Joi.object({
    year: Joi.string().optional(),
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional(),
    start_time: Joi.string().optional(),
    end_time: Joi.string().optional(),
    platform_type: Joi.string().valid("app", "call_center").optional()
})), reportModel.refund_orders);

module.exports = router;