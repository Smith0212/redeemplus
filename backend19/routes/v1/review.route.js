const { validateJoi, checkToken, checkApiKey } = require("../../middleware")
const reviewModel = require("../../models/v1/review.model")
const express = require("express")
const Joi = require("joi")
const router = express.Router()

// Add review
router.post(
  "/addreview",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      business_id: Joi.number().required(),
      offer_id: Joi.number().optional(),
      rating: Joi.number().min(1).max(5).required(),
      review: Joi.string().max(1000).optional(),
    }),
  ),
  reviewModel.addReview,
)

// Get business reviews
router.post(
  "/getbusinessreviews",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      business_id: Joi.number().required(),
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      rating_filter: Joi.number().min(1).max(5).optional(),
    }),
  ),
  reviewModel.getBusinessReviews,
)

// Get offer reviews
router.post(
  "/getofferreviews",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().required(),
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      rating_filter: Joi.number().min(1).max(5).optional(),
    }),
  ),
  reviewModel.getOfferReviews,
)

// Get my reviews (given or received)
router.post(
  "/getmyreviews",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      type: Joi.string().valid("given", "received").optional(),
    }),
  ),
  reviewModel.getMyReviews,
)

// Update review
router.post(
  "/updatereview",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      review_id: Joi.number().required(),
      rating: Joi.number().min(1).max(5).optional(),
      review: Joi.string().max(1000).optional(),
    }),
  ),
  reviewModel.updateReview,
)

// Delete review
router.post(
  "/deletereview",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      review_id: Joi.number().required(),
    }),
  ),
  reviewModel.deleteReview,
)

// Get review statistics
router.post(
  "/getreviewstats",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      business_id: Joi.number().required(),
    }),
  ),
  reviewModel.getReviewStats,
)

// Report review
router.post(
  "/reportreview",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      review_id: Joi.number().required(),
      reason: Joi.string()
        .valid("inappropriate_content", "spam", "fake_review", "offensive_language", "misleading_information", "other")
        .required(),
      additional_details: Joi.string().max(500).optional(),
    }),
  ),
  reviewModel.reportReview,
)

// Get top rated businesses
router.post(
  "/gettopratedbusinesses",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      category_id: Joi.number().optional(),
      min_reviews: Joi.number().min(1).optional(),
    }),
  ),
  reviewModel.getTopRatedBusinesses,
)

module.exports = router
