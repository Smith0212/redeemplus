const { validateJoi, checkToken, checkApiKey } = require("../../middleware")
const iapModel = require("../../models/v1/iap.model")
const express = require("express")
const Joi = require("joi")
const router = express.Router()

// iOS Webhook (no authentication required for webhooks)
router.post("/ios-webhook", iapModel.handleiOSWebhook)

// Android Webhook (no authentication required for webhooks)
router.post("/android-webhook", iapModel.handleAndroidWebhook)

// Verify IAP Purchase
router.post(
  "/verify-purchase",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      platform: Joi.string().valid("ios", "android").required(),
      product_id: Joi.string().required(),
      transaction_id: Joi.string().required(),
      receipt_data: Joi.string().required(),
      original_transaction_id: Joi.string().optional(), // For iOS renewals
    }),
  ),
  iapModel.verifyPurchase,
)

module.exports = router
