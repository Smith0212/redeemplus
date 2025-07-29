const { validateJoi, checkToken, checkApiKey } = require("../../middleware")
const redemptionModel = require("../../models/v1/redemption.model")
const express = require("express")
const Joi = require("joi")
const router = express.Router()

// Redeem with PIN code
router.post(
  "/redeemwithpin",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().required(),
      pin_code: Joi.string().required(),
      quantity: Joi.number().min(1).optional(),
    }),
  ),
  redemptionModel.redeemWithPinCode,
)

// Request delivery
router.post(
  "/requestdelivery",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().required(),
      delivery_address_id: Joi.number().required(),
      quantity: Joi.number().min(1).optional(),
      special_request: Joi.string().optional(),
    }),
  ),
  redemptionModel.requestDelivery,
)

// Get delivery requests (for business owners)
router.post(
  "/getdeliveryrequests",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      status: Joi.string().valid("all", "pending", "approved", "rejected", "delivered").optional(),
    }),
  ),
  redemptionModel.getDeliveryRequests,
)

// Approve delivery request
router.post(
  "/approvedelivery",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      redemption_id: Joi.number().required(),
    }),
  ),
  redemptionModel.approveDeliveryRequest,
)

// Reject delivery request
router.post(
  "/rejectdelivery",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      redemption_id: Joi.number().required(),
      rejection_reason: Joi.string().required(),
    }),
  ),
  redemptionModel.rejectDeliveryRequest,
)

// Mark as delivered
router.post(
  "/markdelivered",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      redemption_id: Joi.number().required(),
    }),
  ),
  redemptionModel.markAsDelivered,
)

// Get my redemptions
router.post(
  "/getmyredemptions",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      type: Joi.string().valid("all", "pin_code", "delivery").optional(),
    }),
  ),
  redemptionModel.getMyRedemptions,
)

// Get redemption details
router.post(
  "/getredemptiondetails",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      redemption_id: Joi.number().required(),
    }),
  ),
  redemptionModel.getRedemptionDetails,
)

module.exports = router
