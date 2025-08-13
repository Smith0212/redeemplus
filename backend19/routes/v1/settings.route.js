const { validateJoi, checkToken, checkApiKey } = require("../../middleware")
const settingsModel = require("../../models/v1/settings.model")
const express = require("express")
const Joi = require("joi")
const router = express.Router()

// Get settings
router.post("/getsettings", checkApiKey, checkToken, settingsModel.getSettings)

// Update settings
router.post(
  "/updatesettings",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      notification_enabled: Joi.boolean().optional(),
      sound_enabled: Joi.boolean().optional(),
      vibrate_enabled: Joi.boolean().optional(),
      app_updates_enabled: Joi.boolean().optional(),
      delivery_status_enabled: Joi.boolean().optional(),
      subscribers_notification_enabled: Joi.boolean().optional(),
      redeemed_offers_notification_enabled: Joi.boolean().optional(),
      delivery_request_notification_enabled: Joi.boolean().optional(),
      new_service_notification_enabled: Joi.boolean().optional(),
      new_tips_notification_enabled: Joi.boolean().optional(),
      language: Joi.string().valid("en", "ar", "es", "fr", "de", "it", "pt", "ru", "zh", "ja", "ko").optional(),
    }),
  ),
  settingsModel.updateSettings,
)

// Reset settings to default
router.post("/resetsettings", checkApiKey, checkToken, settingsModel.resetSettings)

// Update specific notification setting
router.post(
  "/updatenotificationsetting",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      notification_type: Joi.string()
        .valid(
          "notification_enabled",
          "sound_enabled",
          "vibrate_enabled",
          "app_updates_enabled",
          "delivery_status_enabled",
          "subscribers_notification_enabled",
          "redeemed_offers_notification_enabled",
          "delivery_request_notification_enabled",
          "new_service_notification_enabled",
          "new_tips_notification_enabled",
        )
        .required(),
      enabled: Joi.boolean().required(),
    }),
  ),
  settingsModel.updateNotificationSettings,
)

// Update language
router.post(
  "/updatelanguage",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      language: Joi.string().valid("en", "ar", "es", "fr", "de", "it", "pt", "ru", "zh", "ja", "ko").required(),
    }),
  ),
  settingsModel.updateLanguage,
)

// Get notification preferences
router.post("/getnotificationpreferences", checkApiKey, checkToken, settingsModel.getNotificationPreferences)

module.exports = router
