const { validateJoi, checkToken, checkApiKey } = require("../../middleware")
const notificationModel = require("../../models/v1/notification.model")
const express = require("express")
const Joi = require("joi")
const router = express.Router()

// Get notifications
router.post(
  "/getnotifications",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      type: Joi.string().valid("all", "offer_redeemed", "new_subscribers", "delivery_request").optional(),
    }),
  ),
  notificationModel.getNotifications,
)

// Mark notification as read
router.post(
  "/markasread",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      notification_id: Joi.number().required(),
    }),
  ),
  notificationModel.markAsRead,
)

// Mark all notifications as read
router.post("/markallasread", checkApiKey, checkToken, notificationModel.markAllAsRead)

// Delete notification
router.post(
  "/deletenotification",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      notification_id: Joi.number().required(),
    }),
  ),
  notificationModel.deleteNotification,
)

// Get notification stats (for notification page header)
router.post("/getstats", checkApiKey, checkToken, notificationModel.getNotificationStats)

module.exports = router
