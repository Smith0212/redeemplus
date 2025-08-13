const { validateJoi, checkToken, checkApiKey } = require("../../middleware")
const subscriptionModel = require("../../models/v1/subscription.model")
const express = require("express")
const Joi = require("joi")
const router = express.Router()

// Subscribe to business
router.post(
  "/subscribe",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      business_id: Joi.number().required(),
    }),
  ),
  subscriptionModel.subscribeToBusiness,
)

// Unsubscribe from business
router.post(
  "/unsubscribe",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      business_id: Joi.number().required(),
    }),
  ),
  subscriptionModel.unsubscribeFromBusiness,
)

// Get my subscriptions
router.post(
  "/getmysubscriptions",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
    }),
  ),
  subscriptionModel.getMySubscriptions,
)

// Get my subscribers
router.post(
  "/getmysubscribers",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
    }),
  ),
  subscriptionModel.getMySubscribers,
)

// Get subscription status
router.post(
  "/getsubscriptionstatus",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      business_id: Joi.number().required(),
    }),
  ),
  subscriptionModel.getSubscriptionStatus,
)

// Get offers from subscribed businesses
router.post(
  "/getsubscribedoffers",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      offer_type_id: Joi.number().optional(),
      business_category_id: Joi.number().optional(),
      sort_by: Joi.string().valid("created_at", "price_low", "price_high", "rating").optional(),
    }),
  ),
  subscriptionModel.getSubscribedOffers,
)

// Get subscription statistics
router.post("/getsubscriptionstats", checkApiKey, checkToken, subscriptionModel.getSubscriptionStats)

module.exports = router
