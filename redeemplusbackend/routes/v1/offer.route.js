const { validateJoi, checkToken, checkApiKey } = require("../../middleware")
const offerModel = require("../../models/v1/offer.model")
const express = require("express")
const Joi = require("joi")
const router = express.Router()

// Create offer
router.post(
  "/createOffer",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_subcategory_id: Joi.number().required(),
      business_subcategory_id: Joi.number().optional(),
      image: Joi.string().required(),
      title: Joi.string().max(100).required(),
      subtitle: Joi.string().max(255).optional(),
      description: Joi.string().optional(),
      terms_of_use: Joi.string().optional(),
      discount_percentage: Joi.number().min(0).max(100).optional(),
      total_price: Joi.number().min(0.01).required(),
      old_price: Joi.number().min(0).optional(),
      duration: Joi.number().min(1).max(365).required(),
      quantity_available: Joi.number().min(1).required(),
      quantity_per_user: Joi.number().min(1).optional(),
      pin_code: Joi.string().min(4).max(10).required(),
      is_redeemable_in_store: Joi.boolean().optional(),
      is_delivery_available: Joi.boolean().optional(),
      delivery_fee: Joi.number().min(0).optional(),
      estimated_delivery_time: Joi.string().optional(),
      valid_days: Joi.string()
        .length(7)
        .pattern(/^[01]{7}$/)
        .optional(),
      offer_latitude: Joi.string().optional(),
      offer_longitude: Joi.string().optional(),
      available_branches: Joi.string().optional(),
      valid_times: Joi.array()
        .items(
          Joi.object({
            start_time: Joi.string()
              .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
              .required(),
            end_time: Joi.string()
              .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
              .required(),
          }),
        )
        .optional(),
      user_acknowledgment: Joi.boolean().valid(true).required(),
    }),
  ),
  offerModel.createOffer,
)

router.post(
  "/listOffers",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional().default(1),
      limit: Joi.number().min(1).max(50).optional().default(10),
      type: Joi.string().valid("all", "nearby", "subscribed").optional().default("all"),
      // Support both single value and array parameters
      offer_type: Joi.number().optional(), // For backward compatibility
      offer_type_ids: Joi.array().items(Joi.number()).optional(), // New array parameter
      business_category_id: Joi.number().optional(), // For backward compatibility
      business_category_ids: Joi.array().items(Joi.number()).optional(), // New array parameter
      sort_by: Joi.string()
        .valid("created_at", "lowest_price_first", "highest_price_first", "rating", "near_by", "relevance")
        .optional()
        .default("created_at"),
      latitude: Joi.number().when('type', {
        is: 'nearby',
        then: Joi.required(),
        otherwise: Joi.optional()
      }).when('sort_by', {
        is: 'distance',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      longitude: Joi.number().when('type', {
        is: 'nearby',
        then: Joi.required(),
        otherwise: Joi.optional()
      }).when('sort_by', {
        is: 'distance',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      search_query: Joi.string().optional(), // Original parameter name
      min_rating: Joi.number().min(0).max(5).optional(),
      max_rating: Joi.number().min(0).max(5).optional(),
      redeem_method: Joi.string().valid("store", "delivery", "both").optional(), // For backward compatibility
      redeem_methods: Joi.array().items(Joi.string().valid("store", "delivery")).optional(), // New array parameter
      listed_in_rplus: Joi.boolean().optional(),
      profile_types: Joi.array().items(Joi.string().valid("bronze", "silver", "gold")).optional(),
    })
    .with('latitude', 'longitude')
    .with('longitude', 'latitude')
    .with('min_rating', ['min_rating', 'max_rating'])
    .with('max_rating', ['min_rating', 'max_rating'])
  ),
  offerModel.listOffers
)

// Get offer details
router.post(
  "/getOfferDetails",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().required(),
    }),
  ),
  offerModel.getOfferDetails,
)

// Update offer
router.post(
  "/updateOffer",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().required(),
      image: Joi.string().optional(),
      title: Joi.string().max(100).optional(),
      subtitle: Joi.string().max(255).optional(),
      description: Joi.string().optional(),
      terms_of_use: Joi.string().optional(),
      pin_code: Joi.string().min(4).max(10).optional(),
      delivery_fee: Joi.number().min(0).optional(),
      estimated_delivery_time: Joi.string().optional(),
      available_branches: Joi.string().optional(),
      valid_times: Joi.array()
        .items(
          Joi.object({
            start_time: Joi.string()
              .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
              .required(),
            end_time: Joi.string()
              .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
              .required(),
          }),
        )
        .optional(),
      user_acknowledgment: Joi.boolean().valid(true).required(),
    }),
  ),
  offerModel.updateOffer,
)

// Delete offer
router.post(
  "/deleteOffer",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().required(),
    }),
  ),
  offerModel.deleteOffer,
)

// List offer in RedeemPlus store
router.post(
  "/listInStore",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().required(),
    }),
  ),
  offerModel.listInRedeemPlusStore,
)

// Get my offers
router.post(
  "/getMyOffers",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      status: Joi.string().valid("active", "expired", "all").optional(),
    }),
  ),
  offerModel.getMyOffers,
)

module.exports = router
