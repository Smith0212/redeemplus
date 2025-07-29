const { sendResponse } = require("../../middleware")
const pool = require("../../config/database")
const responseCode = require("../../config/responseCode")

const wishlist_model = {
  async addToWishlist(req, res) {
    try {
      const user_id = req.user.id
      const { offer_id } = req.body

      if (!offer_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_offer_id" }, {})
      }

      // Check if offer exists and is active
      const offerQuery = `
                SELECT id, title, user_id, end_date FROM tbl_offers 
                WHERE id = $1 AND is_active = TRUE AND is_deleted = FALSE
            `
      const offerResult = await pool.query(offerQuery, [offer_id])

      if (offerResult.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "offer_not_found" }, {})
      }

      const offer = offerResult.rows[0]

      // Check if offer is still valid
      if (new Date(offer.end_date) <= new Date()) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "offer_expired" }, {})
      }

      // Prevent users from saving their own offers
      if (offer.user_id === user_id) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "cannot_save_own_offer" }, {})
      }

      // Check if already in wishlist
      const existingQuery = `
                SELECT id FROM tbl_saved_offers 
                WHERE user_id = $1 AND offer_id = $2 AND is_active = TRUE AND is_deleted = FALSE
            `
      const existingResult = await pool.query(existingQuery, [user_id, offer_id])

      if (existingResult.rows.length > 0) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "already_in_wishlist" }, {})
      }

      // Add to wishlist
      const insertQuery = `
                INSERT INTO tbl_saved_offers (user_id, offer_id)
                VALUES ($1, $2)
                RETURNING id, created_at
            `
      const result = await pool.query(insertQuery, [user_id, offer_id])

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "added_to_wishlist" },
        {
          wishlist_id: result.rows[0].id,
          offer_title: offer.title,
          added_at: result.rows[0].created_at,
        },
      )
    } catch (err) {
      console.error("Add to Wishlist Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async removeFromWishlist(req, res) {
    try {
      const user_id = req.user.id
      const { offer_id } = req.body

      if (!offer_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_offer_id" }, {})
      }

      // Check if item exists in wishlist
      const existingQuery = `
                SELECT id FROM tbl_saved_offers 
                WHERE user_id = $1 AND offer_id = $2 AND is_active = TRUE AND is_deleted = FALSE
            `
      const existingResult = await pool.query(existingQuery, [user_id, offer_id])

      if (existingResult.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "not_in_wishlist" }, {})
      }

      // Soft delete from wishlist
      const deleteQuery = `
                UPDATE tbl_saved_offers 
                SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $1 AND offer_id = $2
                RETURNING id
            `
      const result = await pool.query(deleteQuery, [user_id, offer_id])

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "removed_from_wishlist" },
        { wishlist_id: result.rows[0].id },
      )
    } catch (err) {
      console.error("Remove from Wishlist Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getWishlist(req, res) {
    try {
      const user_id = req.user.id
      const {
        page = 1,
        limit = 10,
        category_filter,
        sort_by = "added_date", // added_date, price_low, price_high, expiry_soon
        status_filter = "active", // active, expired, all
      } = req.body

      const offset = (page - 1) * limit
      const whereConditions = [
        "so.user_id = $1",
        "so.is_active = TRUE",
        "so.is_deleted = FALSE",
        "o.is_active = TRUE",
        "o.is_deleted = FALSE",
        "u.is_active = TRUE",
        "u.is_deleted = FALSE",
      ]
      const queryParams = [user_id]
      let paramIndex = 2

      // Status filter
      if (status_filter === "active") {
        whereConditions.push("o.end_date > CURRENT_TIMESTAMP")
      } else if (status_filter === "expired") {
        whereConditions.push("o.end_date <= CURRENT_TIMESTAMP")
      }

      // Category filter
      if (category_filter) {
        whereConditions.push(`o.business_category_id = $${paramIndex}`)
        queryParams.push(category_filter)
        paramIndex++
      }

      // Sorting
      let orderBy = "so.created_at DESC"
      switch (sort_by) {
        case "price_low":
          orderBy = "o.total_price ASC"
          break
        case "price_high":
          orderBy = "o.total_price DESC"
          break
        case "expiry_soon":
          orderBy = "o.end_date ASC"
          break
        default:
          orderBy = "so.created_at DESC"
      }

      const wishlistQuery = `
                SELECT 
                    so.id as wishlist_id, so.created_at as added_at,
                    o.id as offer_id, o.title, o.subtitle, o.image, o.total_price, o.old_price,
                    o.discount_percentage, o.quantity_available, o.is_redeemable_in_store,
                    o.is_delivery_available, o.delivery_fee, o.start_date, o.end_date,
                    o.view_count, o.total_redemptions, o.is_listed_in_rplus,
                    u.id as business_id, u.username as business_name, u.profile_image as business_image,
                    ot.offer_category_name, ot.offer_subcategory_name,
                    bc.category_name as business_category,
                    mp.has_verified_badge,
                    COALESCE(AVG(r.rating), 0) as avg_rating,
                    COUNT(DISTINCT r.id) as review_count,
                    CASE 
                        WHEN o.end_date <= CURRENT_TIMESTAMP THEN 'expired'
                        WHEN o.end_date <= CURRENT_TIMESTAMP + INTERVAL '7 days' THEN 'expiring_soon'
                        ELSE 'active'
                    END as offer_status,
                    EXTRACT(DAYS FROM (o.end_date - CURRENT_TIMESTAMP)) as days_remaining
                FROM tbl_saved_offers so
                JOIN tbl_offers o ON so.offer_id = o.id
                JOIN tbl_users u ON o.user_id = u.id
                LEFT JOIN tbl_offer_types ot ON o.offer_type_id = ot.id
                LEFT JOIN tbl_business_categories bc ON o.business_category_id = bc.id
                LEFT JOIN tbl_user_memberships um ON u.id = um.user_id AND um.is_active = TRUE
                LEFT JOIN tbl_membership_plans mp ON um.plan_id = mp.id
                LEFT JOIN tbl_reviews r ON u.id = r.business_id AND r.is_active = TRUE AND r.is_deleted = FALSE
                WHERE ${whereConditions.join(" AND ")}
                GROUP BY so.id, o.id, u.id, ot.id, bc.id, mp.id
                ORDER BY ${orderBy}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `

      const countQuery = `
                SELECT COUNT(*) as total FROM tbl_saved_offers so
                JOIN tbl_offers o ON so.offer_id = o.id
                JOIN tbl_users u ON o.user_id = u.id
                WHERE ${whereConditions.join(" AND ")}
            `

      queryParams.push(limit, offset)

      const [wishlistResult, countResult] = await Promise.all([
        pool.query(wishlistQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2)),
      ])

      const wishlist = wishlistResult.rows
      const total = Number.parseInt(countResult.rows[0].total)

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          wishlist,
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
      console.error("Get Wishlist Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getWishlistStats(req, res) {
    try {
      const user_id = req.user.id

      const statsQuery = `
                SELECT 
                    COUNT(*) as total_saved,
                    COUNT(CASE WHEN o.end_date > CURRENT_TIMESTAMP THEN 1 END) as active_offers,
                    COUNT(CASE WHEN o.end_date <= CURRENT_TIMESTAMP THEN 1 END) as expired_offers,
                    COUNT(CASE WHEN o.end_date <= CURRENT_TIMESTAMP + INTERVAL '7 days' AND o.end_date > CURRENT_TIMESTAMP THEN 1 END) as expiring_soon,
                    COALESCE(AVG(o.total_price), 0) as avg_price,
                    COALESCE(SUM(CASE WHEN o.old_price > o.total_price THEN o.old_price - o.total_price ELSE 0 END), 0) as potential_savings,
                    COUNT(DISTINCT o.business_category_id) as categories_count,
                    COUNT(DISTINCT o.user_id) as businesses_count
                FROM tbl_saved_offers so
                JOIN tbl_offers o ON so.offer_id = o.id
                WHERE so.user_id = $1 AND so.is_active = TRUE AND so.is_deleted = FALSE
                AND o.is_active = TRUE AND o.is_deleted = FALSE
            `

      // Get category breakdown
      const categoryQuery = `
                SELECT 
                    bc.category_name,
                    COUNT(*) as count
                FROM tbl_saved_offers so
                JOIN tbl_offers o ON so.offer_id = o.id
                LEFT JOIN tbl_business_categories bc ON o.business_category_id = bc.id
                WHERE so.user_id = $1 AND so.is_active = TRUE AND so.is_deleted = FALSE
                AND o.is_active = TRUE AND o.is_deleted = FALSE
                GROUP BY bc.category_name
                ORDER BY count DESC
                LIMIT 5
            `

      const [statsResult, categoryResult] = await Promise.all([
        pool.query(statsQuery, [user_id]),
        pool.query(categoryQuery, [user_id]),
      ])

      const stats = statsResult.rows[0]
      const categories = categoryResult.rows

      const response = {
        overview: {
          total_saved: Number.parseInt(stats.total_saved),
          active_offers: Number.parseInt(stats.active_offers),
          expired_offers: Number.parseInt(stats.expired_offers),
          expiring_soon: Number.parseInt(stats.expiring_soon),
        },
        financial: {
          avg_price: Number.parseFloat(stats.avg_price).toFixed(2),
          potential_savings: Number.parseFloat(stats.potential_savings).toFixed(2),
        },
        diversity: {
          categories_count: Number.parseInt(stats.categories_count),
          businesses_count: Number.parseInt(stats.businesses_count),
        },
        top_categories: categories,
      }

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, response)
    } catch (err) {
      console.error("Get Wishlist Stats Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async clearExpiredOffers(req, res) {
    try {
      const user_id = req.user.id

      const clearQuery = `
                UPDATE tbl_saved_offers 
                SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $1 AND offer_id IN (
                    SELECT id FROM tbl_offers 
                    WHERE end_date <= CURRENT_TIMESTAMP
                ) AND is_active = TRUE AND is_deleted = FALSE
                RETURNING COUNT(*) as cleared_count
            `

      const result = await pool.query(clearQuery, [user_id])

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "expired_offers_cleared" }, {})
    } catch (err) {
      console.error("Clear Expired Offers Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async checkWishlistStatus(req, res) {
    try {
      const user_id = req.user.id
      const { offer_id } = req.body

      if (!offer_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_offer_id" }, {})
      }

      const statusQuery = `
                SELECT 
                    so.id as wishlist_id, so.created_at as added_at,
                    CASE WHEN so.id IS NOT NULL THEN TRUE ELSE FALSE END as is_saved
                FROM tbl_saved_offers so
                WHERE so.user_id = $1 AND so.offer_id = $2 AND so.is_active = TRUE AND so.is_deleted = FALSE
            `

      const { rows } = await pool.query(statusQuery, [user_id, offer_id])

      const status = {
        is_saved: rows.length > 0,
        wishlist_id: rows.length > 0 ? rows[0].wishlist_id : null,
        added_at: rows.length > 0 ? rows[0].added_at : null,
      }

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, status)
    } catch (err) {
      console.error("Check Wishlist Status Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },
}

module.exports = wishlist_model
