const { validateJoi, checkToken, checkApiKey } = require("../../middleware")
const profileModel = require("../../models/v1/profile.model")
const express = require("express")
const Joi = require("joi")
const router = express.Router()

// Get profile (own or other user's)
router.post(
  "/getprofile",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      profile_user_id: Joi.number().optional(), // If not provided, returns own profile
    }),
  ),
  profileModel.getProfile,
)

// Update profile
router.post(
  "/updateprofile",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      username: Joi.string()
        .min(3)
        .max(20)
        .pattern(/^[a-zA-Z0-9._]+$/)
        .optional(),
      email: Joi.string().email().max(255).optional(),
      phone: Joi.string().max(20).optional(),
      country_code: Joi.string().max(6).optional(),
      profile_image: Joi.string().optional(),
      business_category_id: Joi.number().optional(),
      dob: Joi.date().optional(),
      instagram_url: Joi.string().uri().optional(),
      tiktok_url: Joi.string().uri().optional(),
      whatsapp_url: Joi.string().uri().optional(),
      business_address: Joi.string().optional(),
      street: Joi.string().max(16).optional(),
      postal_code: Joi.string().max(16).optional(),
      zone: Joi.string().max(16).optional(),
      map_url: Joi.string().uri().optional(),
      latitude: Joi.string().max(16).optional(),
      longitude: Joi.string().max(16).optional(),
    }),
  ),
  profileModel.updateProfile,
)

// Change password
router.post(
  "/changepassword",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      old_password: Joi.string().required(),
      new_password: Joi.string().min(8).required(),
    }),
  ),
  profileModel.changePassword,
)

// Delete account
router.post("/deleteaccount", checkApiKey, checkToken, profileModel.deleteAccount)

// Get my reviews
router.post(
  "/getmyreviews",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
    }),
  ),
  profileModel.getMyReviews,
)

module.exports = router
