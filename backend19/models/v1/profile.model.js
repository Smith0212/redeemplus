const { sendResponse } = require("../../middleware")
const pool = require("../../config/database")
const responseCode = require("../../config/responseCode")

const profile_model = {
  async getProfile(req, res) {
    try {
      const user_id = req.user.id
      const { profile_user_id } = req.body

      const target_user_id = profile_user_id || user_id
      const is_own_profile = target_user_id == user_id

      // Get user profile with membership info
      const profileQuery = `
                SELECT 
                    u.id, u.username, u.email, u.phone, u.country_code, u.profile_image,
                    u.account_type, u.business_category_id, u.dob, u.instagram_url, 
                    u.tiktok_url, u.whatsapp_url, u.business_address, u.street, 
                    u.postal_code, u.zone, u.map_url, u.latitude, u.longitude,
                    u.created_at,
                    bc.category_name, bc.sub_category_name,
                    mp.name as membership_name, mp.has_verified_badge,
                    um.start_date as membership_start, um.end_date as membership_end,
                    um.offers_used,
                    COALESCE(AVG(r.rating), 0) as avg_rating,
                    COUNT(DISTINCT r.id) as total_reviews,
                    COUNT(DISTINCT o.id) as total_offers,
                    COUNT(DISTINCT s.id) as total_subscribers,
                    COUNT(DISTINCT red.id) as total_redemptions
                FROM tbl_users u
                LEFT JOIN tbl_business_categories bc ON u.business_category_id = bc.id
                LEFT JOIN tbl_user_memberships um ON u.id = um.user_id AND um.is_active = TRUE
                LEFT JOIN tbl_membership_plans mp ON um.plan_id = mp.id
                LEFT JOIN tbl_reviews r ON u.id = r.business_id AND r.is_active = TRUE AND r.is_deleted = FALSE
                LEFT JOIN tbl_offers o ON u.id = o.user_id AND o.is_active = TRUE AND o.is_deleted = FALSE
                LEFT JOIN tbl_user_subscriptions s ON u.id = s.business_id AND s.is_active = TRUE AND s.is_deleted = FALSE
                LEFT JOIN tbl_redemptions red ON o.id = red.offer_id AND red.is_active = TRUE AND red.is_deleted = FALSE
                WHERE u.id = $1 AND u.is_active = TRUE AND u.is_deleted = FALSE
                GROUP BY u.id, bc.id, mp.id, um.id
            `

      const { rows } = await pool.query(profileQuery, [target_user_id])

      if (rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "user_not_found" }, {})
      }

      const profile = rows[0]

      // Check if current user is subscribed to this profile (if not own profile)
      let is_subscribed = false
      if (!is_own_profile) {
        const subscriptionQuery = `
                    SELECT id FROM tbl_user_subscriptions 
                    WHERE user_id = $1 AND business_id = $2 AND is_active = TRUE AND is_deleted = FALSE
                `
        const subResult = await pool.query(subscriptionQuery, [user_id, target_user_id])
        is_subscribed = subResult.rows.length > 0
      }

     // Format response
      const response = {
        id: profile.id,
        username: profile.username,
        email: is_own_profile ? profile.email : null,
        phone: profile.phone,
        country_code: profile.country_code,
        profile_image: profile.profile_image,
        account_type: profile.account_type,
        dob: is_own_profile ? profile.dob : null,
        is_own_profile,
        is_subscribed,
        created_at: profile.created_at,
      }

      // Only show business info if account_type is not 'individual'
      if (profile.account_type == "business") {
        response.business_category = profile.category_name
          ? {
            id: profile.business_category_id,
            category_name: profile.category_name,
            sub_category_name: profile.sub_category_name,
          }
          : null

        response.location = {
          business_address: profile.business_address,
          street: profile.street,
          postal_code: profile.postal_code,
          zone: profile.zone,
          latitude: profile.latitude,
          longitude: profile.longitude,
        }
      }
      response.social_links = {
        instagram_url: profile.instagram_url,
        tiktok_url: profile.tiktok_url,
        whatsapp_url: profile.whatsapp_url,
        map_url: profile.map_url,
      }

      response.membership = {
        name: profile.membership_name || "Bronze",
        has_verified_badge: profile.has_verified_badge || false,
        start_date: profile.membership_start,
        end_date: profile.membership_end,
        offers_used: profile.offers_used || 0,
      }
      response.stats = {
        avg_rating: Number.parseFloat(profile.avg_rating).toFixed(1),
        total_reviews: Number.parseInt(profile.total_reviews),
        total_offers: Number.parseInt(profile.total_offers),
        total_subscribers: Number.parseInt(profile.total_subscribers),
        total_redemptions: Number.parseInt(profile.total_redemptions),
      }

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, response)
    } catch (err) {
      console.error("Get Profile Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async updateProfile(req, res) {
    try {
      const user_id = req.user.id
      const {
        username,
        email,
        phone,
        country_code,
        profile_image,
        business_category_id,
        dob,
        instagram_url,
        tiktok_url,
        whatsapp_url,
        business_address,
        street,
        postal_code,
        zone,
        map_url,
        latitude,
        longitude,
      } = req.body

      // Check if username is taken (if provided)
      if (username) {
        const usernameCheck = await pool.query(
          "SELECT id FROM tbl_users WHERE username = $1 AND id != $2 AND is_deleted = FALSE",
          [username, user_id],
        )
        if (usernameCheck.rows.length > 0) {
          return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "username_already_exists" }, {})
        }
      }

      // Check if email is taken (if provided)
      if (email) {
        const emailCheck = await pool.query(
          "SELECT id FROM tbl_users WHERE email = $1 AND id != $2 AND is_deleted = FALSE",
          [email, user_id],
        )
        if (emailCheck.rows.length > 0) {
          return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "email_already_exists" }, {})
        }
      }

      // Build dynamic update query
      const fields = []
      const values = []
      let idx = 1

      const updateFields = {
        username,
        email,
        phone,
        country_code,
        profile_image,
        business_category_id,
        dob,
        instagram_url,
        tiktok_url,
        whatsapp_url,
        business_address,
        street,
        postal_code,
        zone,
        map_url,
        latitude,
        longitude,
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

      const updateQuery = `
                UPDATE tbl_users 
                SET ${fields.join(", ")}
                WHERE id = $${idx} AND is_active = TRUE AND is_deleted = FALSE
                RETURNING *
            `

      const result = await pool.query(updateQuery, values)

      if (result.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "user_not_found" }, {})
      }

      const{password, ...safeUser} = result.rows[0]

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "profile_updated" }, safeUser)
    } catch (err) {
      console.error("Update Profile Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async changePassword(req, res) {
    try {
      const user_id = req.user.id
      const { old_password, new_password } = req.body

      if (!old_password || !new_password) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_parameters" }, {})
      }

      // Get current password
      const userQuery = "SELECT password FROM tbl_users WHERE id = $1 AND is_active = TRUE AND is_deleted = FALSE"
      const userResult = await pool.query(userQuery, [user_id])

      if (userResult.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "user_not_found" }, {})
      }

      const bcrypt = require("bcrypt")
      const validPassword = await bcrypt.compare(old_password, userResult.rows[0].password)

      if (!validPassword) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "invalid_old_password" }, {})
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(new_password, 10)

      // Update password
      const updateQuery = `
                UPDATE tbl_users 
                SET password = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING id
            `

      const result = await pool.query(updateQuery, [hashedPassword, user_id])

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "password_changed" },
        { user_id: result.rows[0].id },
      )
    } catch (err) {
      console.error("Change Password Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async deleteAccount(req, res) {
    try {
      const user_id = req.user.id

      // Check for active orders/redemptions
      const activeOrdersQuery = `
                SELECT COUNT(*) as count FROM tbl_redemption_deliveries rd
                JOIN tbl_redemptions r ON rd.redemption_id = r.id
                WHERE r.user_id = $1 AND rd.status IN ('pending', 'approved')
            `

      const activeOrders = await pool.query(activeOrdersQuery, [user_id])

      if (Number.parseInt(activeOrders.rows[0].count) > 0) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "pending_order_to_delivered" }, {})
      }

      // Soft delete user
      const deleteQuery = `
                UPDATE tbl_users 
                SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING id
            `

      const result = await pool.query(deleteQuery, [user_id])

      // Clear device tokens
      await pool.query("UPDATE tbl_device_info SET user_token = NULL, device_token = NULL WHERE user_id = $1", [
        user_id,
      ])

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "account_deleted" },
        { user_id: result.rows[0].id },
      )
    } catch (err) {
      console.error("Delete Account Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getMyReviews(req, res) {
    try {
      const user_id = req.user.id
      const { page = 1, limit = 10 } = req.body

      const offset = (page - 1) * limit

      const reviewsQuery = `
                SELECT 
                    r.id, r.rating, r.review, r.created_at,
                    u.id as reviewer_id, u.username as reviewer_name, u.profile_image as reviewer_image,
                    o.id as offer_id, o.title as offer_title, o.image as offer_image
                FROM tbl_reviews r
                JOIN tbl_users u ON r.user_id = u.id
                LEFT JOIN tbl_offers o ON r.offer_id = o.id
                WHERE r.business_id = $1 AND r.is_active = TRUE AND r.is_deleted = FALSE
                ORDER BY r.created_at DESC
                LIMIT $2 OFFSET $3
            `

      const countQuery = `
                SELECT COUNT(*) as total FROM tbl_reviews r
                WHERE r.business_id = $1 AND r.is_active = TRUE AND r.is_deleted = FALSE
            `

      const [reviewsResult, countResult] = await Promise.all([
        pool.query(reviewsQuery, [user_id, limit, offset]),
        pool.query(countQuery, [user_id]),
      ])

      const reviews = reviewsResult.rows
      const total = Number.parseInt(countResult.rows[0].total)

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          reviews,
          pagination: {
            current_page: page,
            total_pages: Math.ceil(total / limit),
            total_records: total,
            has_next: page < Math.ceil(total / limit),
            has_prev: page > 1,
          },
        },
      )
    } catch (err) {
      console.error("Get My Reviews Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },
}

module.exports = profile_model
