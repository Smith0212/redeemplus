const { validateJoi, checkToken, checkApiKey } = require("../../middleware")
const searchModel = require("../../models/v1/search.model")
const express = require("express")
const Joi = require("joi")
const router = express.Router()

// Search offers and users
router.post(
  "/search",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      query: Joi.string().min(2).required(),
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      type: Joi.string().valid("all", "offers", "users").optional(),
      business_category_ids: Joi.array().items(Joi.number()).optional(),
      offer_type_ids: Joi.array().items(Joi.number()).optional(),
      profile_types: Joi.array()
        .items(Joi.string().valid("bronze", "silver", "gold"))
        .optional(),
      redeem_methods: Joi.array().items(Joi.string().valid("store", "delivery")).optional(),
      listed_in_rplus: Joi.boolean().optional(),
      min_rating: Joi.number().min(1).max(5).optional(),
      max_rating: Joi.number().min(1).max(5).optional(),
      latitude: Joi.number().optional(),
      longitude: Joi.number().optional(),
      sort_by: Joi.string().valid("relevance", "rating", "distance", "price_low", "price_high").optional(),
    }),
  ),
  searchModel.search,
)

// Get recent searches
// router.post("/getrecentsearches", checkApiKey, checkToken, searchModel.getRecentSearches)

// Get recently viewed offers
router.post(
  "/getrecentlyviewed",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
    }),
  ),
  searchModel.getRecentlyViewed,
)

// Clear recent searches
// router.post("/clearrecentsearches", checkApiKey, checkToken, searchModel.clearRecentSearches)

module.exports = router
