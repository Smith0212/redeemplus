const { sendResponse } = require("../../middleware")
const pool = require("../../config/database")
const responseCode = require("../../config/responseCode")

const settings_model = {
  async getSettings(req, res) {
    try {
      const user_id = req.user.id

      const settingsQuery = `
                SELECT * FROM tbl_user_settings 
                WHERE user_id = $1 AND is_active = TRUE AND is_deleted = FALSE
            `

      const { rows } = await pool.query(settingsQuery, [user_id])

      let settings
      if (rows.length === 0) {
        // Create default settings if none exist
        const defaultSettingsQuery = `
                    INSERT INTO tbl_user_settings (user_id) 
                    VALUES ($1) 
                    RETURNING *
                `
        const defaultResult = await pool.query(defaultSettingsQuery, [user_id])
        settings = defaultResult.rows[0]
      } else {
        settings = rows[0]
      }

      // Format response
      const response = {
        notifications: {
          notification_enabled: settings.notification_enabled,
          sound_enabled: settings.sound_enabled,
          vibrate_enabled: settings.vibrate_enabled,
          app_updates_enabled: settings.app_updates_enabled,
          delivery_status_enabled: settings.delivery_status_enabled,
          subscribers_notification_enabled: settings.subscribers_notification_enabled,
          redeemed_offers_notification_enabled: settings.redeemed_offers_notification_enabled,
          delivery_request_notification_enabled: settings.delivery_request_notification_enabled,
          new_service_notification_enabled: settings.new_service_notification_enabled,
          new_tips_notification_enabled: settings.new_tips_notification_enabled,
        },
        preferences: {
          language: settings.language,
        },
        created_at: settings.created_at,
        updated_at: settings.updated_at,
      }

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, response)
    } catch (err) {
      console.error("Get Settings Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async updateSettings(req, res) {
    try {
      const user_id = req.user.id
      const {
        notification_enabled,
        sound_enabled,
        vibrate_enabled,
        app_updates_enabled,
        delivery_status_enabled,
        subscribers_notification_enabled,
        redeemed_offers_notification_enabled,
        delivery_request_notification_enabled,
        new_service_notification_enabled,
        new_tips_notification_enabled,
        language,
      } = req.body

      // Check if settings exist
      const existingQuery = `
                SELECT id FROM tbl_user_settings 
                WHERE user_id = $1 AND is_active = TRUE AND is_deleted = FALSE
            `
      const existingResult = await pool.query(existingQuery, [user_id])

      let query, params

      if (existingResult.rows.length === 0) {
        // Create new settings
        query = `
                    INSERT INTO tbl_user_settings (
                        user_id, notification_enabled, sound_enabled, vibrate_enabled,
                        app_updates_enabled, delivery_status_enabled, subscribers_notification_enabled,
                        redeemed_offers_notification_enabled, delivery_request_notification_enabled,
                        new_service_notification_enabled, new_tips_notification_enabled, language
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING *
                `
        params = [
          user_id,
          notification_enabled ?? true,
          sound_enabled ?? true,
          vibrate_enabled ?? true,
          app_updates_enabled ?? true,
          delivery_status_enabled ?? true,
          subscribers_notification_enabled ?? true,
          redeemed_offers_notification_enabled ?? true,
          delivery_request_notification_enabled ?? true,
          new_service_notification_enabled ?? true,
          new_tips_notification_enabled ?? true,
          language ?? "en",
        ]
      } else {
        // Update existing settings
        const fields = []
        const values = []
        let idx = 1

        const updateFields = {
          notification_enabled,
          sound_enabled,
          vibrate_enabled,
          app_updates_enabled,
          delivery_status_enabled,
          subscribers_notification_enabled,
          redeemed_offers_notification_enabled,
          delivery_request_notification_enabled,
          new_service_notification_enabled,
          new_tips_notification_enabled,
          language,
        }

        for (const [key, value] of Object.entries(updateFields)) {
          if (value !== undefined) {
            fields.push(`${key} = $${idx++}`)
            values.push(value)
          }
        }

        if (fields.length === 0) {
          return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "no_fields_to_update" }, {})
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`)
        values.push(user_id)

        query = `
                    UPDATE tbl_user_settings 
                    SET ${fields.join(", ")}
                    WHERE user_id = $${idx}
                    RETURNING *
                `
        params = values
      }

      const result = await pool.query(query, params)
      const settings = result.rows[0]

      // Format response
      const response = {
        notifications: {
          notification_enabled: settings.notification_enabled,
          sound_enabled: settings.sound_enabled,
          vibrate_enabled: settings.vibrate_enabled,
          app_updates_enabled: settings.app_updates_enabled,
          delivery_status_enabled: settings.delivery_status_enabled,
          subscribers_notification_enabled: settings.subscribers_notification_enabled,
          redeemed_offers_notification_enabled: settings.redeemed_offers_notification_enabled,
          delivery_request_notification_enabled: settings.delivery_request_notification_enabled,
          new_service_notification_enabled: settings.new_service_notification_enabled,
          new_tips_notification_enabled: settings.new_tips_notification_enabled,
        },
        preferences: {
          language: settings.language,
        },
        updated_at: settings.updated_at,
      }

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "settings_updated" }, response)
    } catch (err) {
      console.error("Update Settings Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async resetSettings(req, res) {
    try {
      const user_id = req.user.id

      const resetQuery = `
                UPDATE tbl_user_settings 
                SET 
                    notification_enabled = TRUE,
                    sound_enabled = TRUE,
                    vibrate_enabled = TRUE,
                    app_updates_enabled = TRUE,
                    delivery_status_enabled = TRUE,
                    subscribers_notification_enabled = TRUE,
                    redeemed_offers_notification_enabled = TRUE,
                    delivery_request_notification_enabled = TRUE,
                    new_service_notification_enabled = TRUE,
                    new_tips_notification_enabled = TRUE,
                    language = 'en',
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $1
                RETURNING *
            `

      const result = await pool.query(resetQuery, [user_id])

      if (result.rows.length === 0) {
        // Create default settings if none exist
        const createQuery = `
                    INSERT INTO tbl_user_settings (user_id) 
                    VALUES ($1) 
                    RETURNING *
                `
        const createResult = await pool.query(createQuery, [user_id])
        return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "settings_reset" }, createResult.rows[0])
      }

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "settings_reset" }, result.rows[0])
    } catch (err) {
      console.error("Reset Settings Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async updateNotificationSettings(req, res) {
    try {
      const user_id = req.user.id
      const { notification_type, enabled } = req.body

      if (!notification_type || enabled === undefined) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_parameters" }, {})
      }

      // Validate notification type
      const validTypes = [
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
      ]

      if (!validTypes.includes(notification_type)) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "invalid_notification_type" }, {})
      }

      // Ensure settings exist
      const ensureSettingsQuery = `
                INSERT INTO tbl_user_settings (user_id) 
                VALUES ($1) 
                ON CONFLICT (user_id) DO NOTHING
            `
      await pool.query(ensureSettingsQuery, [user_id])

      // Update specific notification setting
      const updateQuery = `
                UPDATE tbl_user_settings 
                SET ${notification_type} = $1, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2
                RETURNING ${notification_type}, updated_at
            `

      const result = await pool.query(updateQuery, [enabled, user_id])

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "notification_setting_updated" },
        {
          notification_type,
          enabled: result.rows[0][notification_type],
          updated_at: result.rows[0].updated_at,
        },
      )
    } catch (err) {
      console.error("Update Notification Settings Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async updateLanguage(req, res) {
    try {
      const user_id = req.user.id
      const { language } = req.body

      if (!language) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_language" }, {})
      }

      // Validate language
      const supportedLanguages = ["en", "ar", "es", "fr", "de", "it", "pt", "ru", "zh", "ja", "ko"]
      if (!supportedLanguages.includes(language)) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "unsupported_language" }, {})
      }

      // Ensure settings exist
      const ensureSettingsQuery = `
                INSERT INTO tbl_user_settings (user_id) 
                VALUES ($1) 
                ON CONFLICT (user_id) DO NOTHING
            `
      await pool.query(ensureSettingsQuery, [user_id])

      // Update language
      const updateQuery = `
                UPDATE tbl_user_settings 
                SET language = $1, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2
                RETURNING language, updated_at
            `

      const result = await pool.query(updateQuery, [language, user_id])

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "language_updated" },
        {
          language: result.rows[0].language,
          updated_at: result.rows[0].updated_at,
        },
      )
    } catch (err) {
      console.error("Update Language Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getNotificationPreferences(req, res) {
    try {
      const user_id = req.user.id

      const settingsQuery = `
                SELECT 
                    notification_enabled, sound_enabled, vibrate_enabled,
                    app_updates_enabled, delivery_status_enabled, subscribers_notification_enabled,
                    redeemed_offers_notification_enabled, delivery_request_notification_enabled,
                    new_service_notification_enabled, new_tips_notification_enabled
                FROM tbl_user_settings 
                WHERE user_id = $1 AND is_active = TRUE AND is_deleted = FALSE
            `

      const { rows } = await pool.query(settingsQuery, [user_id])

      let preferences
      if (rows.length === 0) {
        // Return default preferences
        preferences = {
          notification_enabled: true,
          sound_enabled: true,
          vibrate_enabled: true,
          app_updates_enabled: true,
          delivery_status_enabled: true,
          subscribers_notification_enabled: true,
          redeemed_offers_notification_enabled: true,
          delivery_request_notification_enabled: true,
          new_service_notification_enabled: true,
          new_tips_notification_enabled: true,
        }
      } else {
        preferences = rows[0]
      }

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, preferences)
    } catch (err) {
      console.error("Get Notification Preferences Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },
}

module.exports = settings_model
