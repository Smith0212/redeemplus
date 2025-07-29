const { validateJoi, checkToken, checkApiKey } = require("../../middleware")
const membershipModel = require("../../models/v1/membership.model")
const express = require("express")
const Joi = require("joi")
const router = express.Router()

// Get all membership plans
router.post("/getplans", checkApiKey, checkToken, membershipModel.getMembershipPlans)

// Get current membership
router.post("/getcurrentmembership", checkApiKey, checkToken, membershipModel.getCurrentMembership)

// Purchase membership
router.post(
  "/purchasemembership",
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
  "/gethistory",
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
