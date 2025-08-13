const { validateJoi, checkToken, checkApiKey } = require("../../middleware")
const wishlistModel = require("../../models/v1/wishlist.model")
const express = require("express")
const Joi = require("joi")
const router = express.Router()

// Add to wishlist
router.post(
  "/addtowishlist",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().required(),
    }),
  ),
  wishlistModel.addToWishlist,
)

// Remove from wishlist
router.post(
  "/removefromwishlist",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().required(),
    }),
  ),
  wishlistModel.removeFromWishlist,
)

// Get wishlist
router.post(
  "/getwishlist",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      category_filter: Joi.number().optional(),
      sort_by: Joi.string().valid("added_date", "price_low", "price_high", "expiry_soon").optional(),
      status_filter: Joi.string().valid("active", "expired", "all").optional(),
    }),
  ),
  wishlistModel.getWishlist,
)

// Get wishlist statistics
router.post("/getwishliststats", checkApiKey, checkToken, wishlistModel.getWishlistStats)

// Clear expired offers
router.post("/clearexpiredoffers", checkApiKey, checkToken, wishlistModel.clearExpiredOffers)

// Check wishlist status
router.post(
  "/checkwishliststatus",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().required(),
    }),
  ),
  wishlistModel.checkWishlistStatus,
)

module.exports = router
