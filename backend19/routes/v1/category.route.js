const { validateJoi, checkToken, checkApiKey } = require("../../middleware")
const categoryModel = require("../../models/v1/category.model")
const express = require("express")
const Joi = require("joi")
const router = express.Router()

// Get business categories
router.post(
  "/getBusinessCategories",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      include_subcategories: Joi.boolean().optional(),
    }),
  ),
  categoryModel.getBusinessCategories,
)

// Get offer categories
router.post(
  "/getOfferCategories",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      include_subcategories: Joi.boolean().optional(),
    }),
  ),
  categoryModel.getOfferCategories,
)

// Search categories
router.post(
  "/searchCategories",
  checkApiKey,
  validateJoi(
    Joi.object({
      query: Joi.string().min(2).required(),
      category_type: Joi.string().valid("business", "offer").optional(),
      limit: Joi.number().min(1).max(50).optional(),
    }),
  ),
  categoryModel.searchCategories,
)

module.exports = router
