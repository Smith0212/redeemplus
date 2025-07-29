const { validateJoi, checkToken, checkApiKey } = require("../../middleware")
const categoryModel = require("../../models/v1/category.model")
const express = require("express")
const Joi = require("joi")
const router = express.Router()

// Get business categories
router.post(
  "/getbusinesscategories",
  checkApiKey,
  validateJoi(
    Joi.object({
      include_subcategories: Joi.boolean().optional(),
    }),
  ),
  categoryModel.getBusinessCategories,
)

// Get offer types
router.post(
  "/getoffertypes",
  checkApiKey,
  validateJoi(
    Joi.object({
      include_subcategories: Joi.boolean().optional(),
    }),
  ),
  categoryModel.getOfferTypes,
)

// Get category statistics
router.post(
  "/getcategorystats",
  checkApiKey,
  validateJoi(
    Joi.object({
      category_type: Joi.string().valid("business", "offer").optional(),
    }),
  ),
  categoryModel.getCategoryStats,
)

// Get popular categories
router.post(
  "/getpopularcategories",
  checkApiKey,
  validateJoi(
    Joi.object({
      limit: Joi.number().min(1).max(50).optional(),
      category_type: Joi.string().valid("business", "offer").optional(),
    }),
  ),
  categoryModel.getPopularCategories,
)

// Search categories
router.post(
  "/searchcategories",
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

// Get category details
router.post(
  "/getcategorydetails",
  checkApiKey,
  validateJoi(
    Joi.object({
      category_id: Joi.number().required(),
      category_type: Joi.string().valid("business", "offer").optional(),
    }),
  ),
  categoryModel.getCategoryDetails,
)

module.exports = router
