const { validateJoi, checkToken, checkApiKey } = require("../../middleware")
const membershipModel = require("../../models/v1/membership.model")
const express = require("express")
const Joi = require("joi")
const router = express.Router()

router.post("/getMembershipInfo", checkApiKey, checkToken,
  validateJoi(
    Joi.object({
      type: Joi.string().valid("plan", "current").required(),
    }),
  ), 
  membershipModel.getMembershipInfo)

// Purchase membership
router.post(
  "/purchaseMembership",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      plan_id: Joi.number().required(),
      payment_method: Joi.string().optional(),
      transaction_id: Joi.string().optional(),
    }),
  ),
  membershipModel.purchaseMembership,
)

// Get membership history
router.post(
  "/getHistory",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
    }),
  ),
  membershipModel.getMembershipHistory,
)

module.exports = router
