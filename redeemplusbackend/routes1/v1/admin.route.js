const { validateJoi, checkToken } = require("../../middleware")
const adminModel = require("../../models/v1/admin.model")
const express = require("express")
const Joi = require("joi")
const router = express.Router()

// Admin Login (no token required)
router.post(
  "/login",
  validateJoi(
    Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    }),
  ),
  adminModel.login,
)

// Dashboard Stats
router.post("/dashboard/stats", checkToken, adminModel.getDashboardStats)

// User Management
router.post(
  "/users",
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      search: Joi.string().optional(),
      account_type: Joi.string().valid("individual", "business").optional(),
      status: Joi.string().valid("active", "inactive").optional(),
    }),
  ),
  adminModel.getUsers,
)

router.post(
  "/users/details",
  checkToken,
  validateJoi(
    Joi.object({
      user_id: Joi.number().integer().required(),
    }),
  ),
  adminModel.getUserDetails,
)

router.post(
  "/users/status",
  checkToken,
  validateJoi(
    Joi.object({
      user_id: Joi.number().integer().required(),
      status: Joi.string().valid("active", "inactive", "suspended").required(),
    }),
  ),
  adminModel.updateUserStatus,
)

router.post(
  "/users/delete",
  checkToken,
  validateJoi(
    Joi.object({
      user_id: Joi.number().integer().required(),
    }),
  ),
  adminModel.deleteUser,
)

// Offer Management
router.post(
  "/offers",
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      search: Joi.string().optional(),
      status: Joi.string().valid("active", "inactive").optional(),
      user_id: Joi.number().integer().optional(),
    }),
  ),
  adminModel.getOffers,
)

router.post(
  "/offers/details",
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().integer().required(),
    }),
  ),
  adminModel.getOfferDetails,
)

router.post(
  "/offers/status",
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().integer().required(),
      status: Joi.string().valid("active", "inactive").required(),
    }),
  ),
  adminModel.updateOfferStatus,
)

// Report Management
router.post(
  "/reports",
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      search: Joi.string().optional(),
      status: Joi.string().valid("pending", "reviewed", "resolved", "dismissed").optional(),
      report_type: Joi.string().valid("user", "offer", "problem").optional(),
    }),
  ),
  adminModel.getReports,
)

router.post(
  "/reports/details",
  checkToken,
  validateJoi(
    Joi.object({
      report_id: Joi.number().integer().required(),
    }),
  ),
  adminModel.getReportDetails,
)

router.post(
  "/reports/status",
  checkToken,
  validateJoi(
    Joi.object({
      report_id: Joi.number().integer().required(),
      status: Joi.string().valid("pending", "reviewed", "resolved", "dismissed").required(),
      admin_notes: Joi.string().optional(),
    }),
  ),
  adminModel.updateReportStatus,
)

// Notifications
router.post(
  "/notifications/send",
  checkToken,
  validateJoi(
    Joi.object({
      recipient_type: Joi.string().valid("all", "businesses", "individuals", "specific").required(),
      recipient_ids: Joi.array().items(Joi.number().integer()).optional(),
      title: Joi.string().required(),
      message: Joi.string().required(),
      type: Joi.string().optional(),
    }),
  ),
  adminModel.sendNotification,
)

// Analytics & Memberships
router.post("/memberships", checkToken, adminModel.getMembershipPlans)

router.post(
  "/analytics",
  checkToken,
  validateJoi(
    Joi.object({
      period: Joi.string().optional(), // days
    }),
  ),
  adminModel.getAnalytics,
)

module.exports = router
