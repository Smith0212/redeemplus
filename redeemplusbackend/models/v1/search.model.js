const { sendResponse } = require("../../middleware")
const pool = require("../../config/database")
const responseCode = require("../../config/responseCode")

const search_model = {
  async search(req, res) {
    try {
      const user_id = req.user.id
      const {
        query,
        page = 1,
        limit = 10,
        type = "all", // all, offers
        business_category_ids = [],
        offer_type_ids = [],
        profile_types = [], // bronze, silver, gold // need to add all types
        redeem_methods = [], // store, delivery
        listed_in_rplus = false,
        min_rating,
        max_rating,
        latitude,
        longitude,
        sort_by = "relevance", // relevance, rating, distance, price_low, price_high
      } = req.body

      if (!query || query.trim().length < 2) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "query_too_short" }, {})
      }

      const offset = (page - 1) * limit
      const searchTerm = `%${query.trim()}%`

      // Save search query for recent searches
      await pool.query(
        `INSERT INTO tbl_recently_viewed (user_id, offer_id) 
                 SELECT $1, NULL WHERE NOT EXISTS (
                     SELECT 1 FROM tbl_recently_viewed WHERE user_id = $1 AND offer_id IS NULL
                 )`,
        [user_id],
      )

      const results = { offers: [], users: [], total_offers: 0, total_users: 0 }

      // Search offers
      if (type === "all" || type === "offers") {
        const offerResults = await this.searchOffers({
          user_id,
          searchTerm,
          page,
          limit,
          business_category_ids,
          offer_type_ids,
          redeem_methods,
          listed_in_rplus,
          min_rating,
          max_rating,
          latitude,
          longitude,
          sort_by,
        })
        results.offers = offerResults.offers
        results.total_offers = offerResults.total
      }

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          ...results,
          pagination: {
            current_page: page,
            total_pages: Math.ceil(Math.max(results.total_offers, results.total_users) / limit),
            has_next: page < Math.ceil(Math.max(results.total_offers, results.total_users) / limit),
            has_prev: page > 1,
          },
        },
      )
    } catch (err) {
      console.error("Search Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async searchOffers({
    user_id,
    searchTerm,
    page,
    limit,
    business_category_ids,
    offer_type_ids,
    redeem_methods,
    listed_in_rplus,
    min_rating,
    max_rating,
    latitude,
    longitude,
    sort_by,
  }) {
    const offset = (page - 1) * limit
    const whereConditions = [
      "o.is_active = TRUE",
      "o.is_deleted = FALSE",
      "o.end_date > CURRENT_TIMESTAMP",
      "(o.title ILIKE $1 OR o.subtitle ILIKE $1 OR o.description ILIKE $1 OR u.username ILIKE $1)",
    ]
    const joinConditions = []
    let orderBy = "o.created_at DESC"
    const queryParams = [searchTerm]
    let paramIndex = 2

    // Business category filter
    if (business_category_ids.length > 0) {
      whereConditions.push(`o.business_category_id = ANY($${paramIndex})`)
      queryParams.push(business_category_ids)
      paramIndex++
    }

    // Offer type filter
    if (offer_type_ids.length > 0) {
      whereConditions.push(`o.offer_type_id = ANY($${paramIndex})`)
      queryParams.push(offer_type_ids)
      paramIndex++
    }

    // Redeem method filter
    if (redeem_methods.length > 0) {
      const redeemConditions = []
      if (redeem_methods.includes("store")) {
        redeemConditions.push("o.is_redeemable_in_store = TRUE")
      }
      if (redeem_methods.includes("delivery")) {
        redeemConditions.push("o.is_delivery_available = TRUE")
      }
      if (redeemConditions.length > 0) {
        whereConditions.push(`(${redeemConditions.join(" OR ")})`)
      }
    }

    // RedeemPlus store filter
    if (listed_in_rplus) {
      whereConditions.push("o.is_listed_in_rplus = TRUE")
    }

    // Rating filter
    if (min_rating || max_rating) {
      joinConditions.push(
        "LEFT JOIN (SELECT business_id, AVG(rating) as avg_rating FROM tbl_reviews WHERE is_active = TRUE AND is_deleted = FALSE GROUP BY business_id) r ON o.user_id = r.business_id",
      )

      if (min_rating) {
        whereConditions.push(`COALESCE(r.avg_rating, 0) >= $${paramIndex}`)
        queryParams.push(min_rating)
        paramIndex++
      }
      if (max_rating) {
        whereConditions.push(`COALESCE(r.avg_rating, 0) <= $${paramIndex}`)
        queryParams.push(max_rating)
        paramIndex++
      }
    }

    // Distance filter and sorting
    if (latitude && longitude) {
      if (sort_by === "distance") {
        orderBy = `(6371 * acos(cos(radians(${latitude})) * cos(radians(CAST(o.offer_latitude AS FLOAT))) * cos(radians(CAST(o.offer_longitude AS FLOAT)) - radians(${longitude})) + sin(radians(${latitude})) * sin(radians(CAST(o.offer_latitude AS FLOAT))))) ASC`
      }
    }

    // Other sorting options
    switch (sort_by) {
      case "price_low":
        orderBy = "o.total_price ASC"
        break
      case "price_high":
        orderBy = "o.total_price DESC"
        break
      case "rating":
        if (!joinConditions.some((j) => j.includes("avg_rating"))) {
          joinConditions.push(
            "LEFT JOIN (SELECT business_id, AVG(rating) as avg_rating FROM tbl_reviews WHERE is_active = TRUE AND is_deleted = FALSE GROUP BY business_id) r ON o.user_id = r.business_id",
          )
        }
        orderBy = "COALESCE(r.avg_rating, 0) DESC"
        break
      case "relevance":
      default:
        orderBy = `
                    CASE 
                        WHEN o.title ILIKE $1 THEN 1
                        WHEN o.subtitle ILIKE $1 THEN 2
                        WHEN u.username ILIKE $1 THEN 3
                        ELSE 4
                    END, o.view_count DESC, o.created_at DESC
                `
        break
    }

    // Main query
    const offersQuery = `
            SELECT 
                o.id, o.title, o.subtitle, o.description, o.image, o.total_price, o.old_price,
                o.discount_percentage, o.quantity_available, o.is_redeemable_in_store,
                o.is_delivery_available, o.delivery_fee, o.view_count, o.total_redemptions,
                o.start_date, o.end_date, o.created_at, o.is_listed_in_rplus,
                u.id as business_id, u.username as business_name, u.profile_image as business_image,
                ot.offer_category_name, ot.offer_subcategory_name,
                bc.category_name as business_category,
                mp.has_verified_badge,
                COALESCE(AVG(rev.rating), 0) as avg_rating,
                COUNT(DISTINCT rev.id) as review_count,
                CASE WHEN so.id IS NOT NULL THEN TRUE ELSE FALSE END as is_saved,
                CASE WHEN us.id IS NOT NULL THEN TRUE ELSE FALSE END as is_subscribed,
                ${
                  latitude && longitude
                    ? `
                    (6371 * acos(cos(radians(${latitude})) * cos(radians(CAST(o.offer_latitude AS FLOAT))) * 
                    cos(radians(CAST(o.offer_longitude AS FLOAT)) - radians(${longitude})) + 
                    sin(radians(${latitude})) * sin(radians(CAST(o.offer_latitude AS FLOAT))))) as distance
                `
                    : "NULL as distance"
                }
            FROM tbl_offers o
            JOIN tbl_users u ON o.user_id = u.id AND u.is_active = TRUE AND u.is_deleted = FALSE
            LEFT JOIN tbl_offer_types ot ON o.offer_type_id = ot.id
            LEFT JOIN tbl_business_categories bc ON o.business_category_id = bc.id
            LEFT JOIN tbl_user_memberships um ON u.id = um.user_id AND um.is_active = TRUE
            LEFT JOIN tbl_membership_plans mp ON um.plan_id = mp.id
            LEFT JOIN tbl_reviews rev ON o.user_id = rev.business_id AND rev.is_active = TRUE AND rev.is_deleted = FALSE
            LEFT JOIN tbl_saved_offers so ON o.id = so.offer_id AND so.user_id = $${paramIndex} AND so.is_active = TRUE AND so.is_deleted = FALSE
            LEFT JOIN tbl_user_subscriptions us ON o.user_id = us.business_id AND us.user_id = $${paramIndex} AND us.is_active = TRUE AND us.is_deleted = FALSE
            ${joinConditions.join(" ")}
            WHERE ${whereConditions.join(" AND ")}
            GROUP BY o.id, u.id, ot.id, bc.id, mp.id, so.id, us.id
            ORDER BY ${orderBy}
            LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
        `

    // Count query
    const countQuery = `
            SELECT COUNT(DISTINCT o.id) as total
            FROM tbl_offers o
            JOIN tbl_users u ON o.user_id = u.id AND u.is_active = TRUE AND u.is_deleted = FALSE
            ${joinConditions.join(" ")}
            WHERE ${whereConditions.join(" AND ")}
        `

    queryParams.push(user_id, user_id, limit, offset)

    const [offersResult, countResult] = await Promise.all([
      pool.query(offersQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2)),
    ])

    return {
      offers: offersResult.rows,
      total: Number.parseInt(countResult.rows[0].total),
    }
  },

  async searchUsers({
    user_id,
    searchTerm,
    page,
    limit,
    profile_types,
    business_category_ids,
    latitude,
    longitude,
    sort_by,
  }) {
    const offset = (page - 1) * limit
    const whereConditions = [
      "u.is_active = TRUE",
      "u.is_deleted = FALSE",
      "u.id != $2",
      "(u.username ILIKE $1 OR bc.category_name ILIKE $1 OR bc.sub_category_name ILIKE $1)",
    ]
    const joinConditions = []
    let orderBy = "u.created_at DESC"
    const queryParams = [searchTerm, user_id]
    let paramIndex = 3

    // Profile type filter
    if (profile_types.length > 0) {
      const profileConditions = profile_types.map((type) => {
        switch (type.toLowerCase()) {
          case "bronze":
            return "mp.name = 'Bronze' OR mp.name IS NULL"
          case "silver":
            return "mp.name = 'Silver'"
          case "gold":
            return "mp.name = 'Gold'"
          default:
            return "1=0"
        }
      })
      whereConditions.push(`(${profileConditions.join(" OR ")})`)
    }

    // Business category filter
    if (business_category_ids.length > 0) {
      whereConditions.push(`u.business_category_id = ANY($${paramIndex})`)
      queryParams.push(business_category_ids)
      paramIndex++
    }

    // Sorting
    switch (sort_by) {
      case "rating":
        joinConditions.push(
          "LEFT JOIN (SELECT business_id, AVG(rating) as avg_rating FROM tbl_reviews WHERE is_active = TRUE AND is_deleted = FALSE GROUP BY business_id) r ON u.id = r.business_id",
        )
        orderBy = "COALESCE(r.avg_rating, 0) DESC"
        break
      case "distance":
        if (latitude && longitude) {
          orderBy = `(6371 * acos(cos(radians(${latitude})) * cos(radians(CAST(u.latitude AS FLOAT))) * cos(radians(CAST(u.longitude AS FLOAT)) - radians(${longitude})) + sin(radians(${latitude})) * sin(radians(CAST(u.latitude AS FLOAT))))) ASC`
        }
        break
      case "relevance":
      default:
        orderBy = `
                    CASE 
                        WHEN u.username ILIKE $1 THEN 1
                        WHEN bc.category_name ILIKE $1 THEN 2
                        ELSE 3
                    END, u.created_at DESC
                `
        break
    }

    // Main query
    const usersQuery = `
            SELECT 
                u.id, u.username, u.profile_image, u.account_type, u.created_at,
                bc.category_name, bc.sub_category_name,
                mp.name as membership_name, mp.has_verified_badge,
                COALESCE(AVG(r.rating), 0) as avg_rating,
                COUNT(DISTINCT r.id) as total_reviews,
                COUNT(DISTINCT o.id) as total_offers,
                COUNT(DISTINCT s.id) as total_subscribers,
                CASE WHEN us.id IS NOT NULL THEN TRUE ELSE FALSE END as is_subscribed,
                ${
                  latitude && longitude
                    ? `
                    (6371 * acos(cos(radians(${latitude})) * cos(radians(CAST(u.latitude AS FLOAT))) * 
                    cos(radians(CAST(u.longitude AS FLOAT)) - radians(${longitude})) + 
                    sin(radians(${latitude})) * sin(radians(CAST(u.latitude AS FLOAT))))) as distance
                `
                    : "NULL as distance"
                }
            FROM tbl_users u
            LEFT JOIN tbl_business_categories bc ON u.business_category_id = bc.id
            LEFT JOIN tbl_user_memberships um ON u.id = um.user_id AND um.is_active = TRUE
            LEFT JOIN tbl_membership_plans mp ON um.plan_id = mp.id
            LEFT JOIN tbl_reviews r ON u.id = r.business_id AND r.is_active = TRUE AND r.is_deleted = FALSE
            LEFT JOIN tbl_offers o ON u.id = o.user_id AND o.is_active = TRUE AND o.is_deleted = FALSE
            LEFT JOIN tbl_user_subscriptions s ON u.id = s.business_id AND s.is_active = TRUE AND s.is_deleted = FALSE
            LEFT JOIN tbl_user_subscriptions us ON u.id = us.business_id AND us.user_id = $${paramIndex} AND us.is_active = TRUE AND us.is_deleted = FALSE
            ${joinConditions.join(" ")}
            WHERE ${whereConditions.join(" AND ")}
            GROUP BY u.id, bc.id, mp.id, us.id
            ORDER BY ${orderBy}
            LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
        `

    // Count query
    const countQuery = `
            SELECT COUNT(DISTINCT u.id) as total
            FROM tbl_users u
            LEFT JOIN tbl_business_categories bc ON u.business_category_id = bc.id
            LEFT JOIN tbl_user_memberships um ON u.id = um.user_id AND um.is_active = TRUE
            LEFT JOIN tbl_membership_plans mp ON um.plan_id = mp.id
            ${joinConditions.join(" ")}
            WHERE ${whereConditions.join(" AND ")}
        `

    queryParams.push(user_id, limit, offset)

    const [usersResult, countResult] = await Promise.all([
      pool.query(usersQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2)),
    ])

    return {
      users: usersResult.rows,
      total: Number.parseInt(countResult.rows[0].total),
    }
  },

  // async getRecentSearches(req, res) {
  //   try {
  //     const user_id = req.user.id

  //     const recentSearches = []

  //     return sendResponse(
  //       req,
  //       res,
  //       200,
  //       responseCode.SUCCESS,
  //       { keyword: "success" },
  //       { recent_searches: recentSearches },
  //     )
  //   } catch (err) {
  //     console.error("Get Recent Searches Error:", err)
  //     return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
  //   }
  // },

  async getRecentlyViewed(req, res) {
    try {
      const user_id = req.user.id
      const { page = 1, limit = 10 } = req.body

      const offset = (page - 1) * limit

      const recentlyViewedQuery = `
                SELECT 
                    o.id, o.title, o.subtitle, o.image, o.total_price, o.old_price,
                    o.quantity_available, o.is_redeemable_in_store, o.is_delivery_available,
                    o.view_count, o.total_redemptions,
                    u.id as business_id, u.username as business_name, u.profile_image as business_image,
                    ot.offer_category_name, ot.offer_subcategory_name,
                    COALESCE(AVG(r.rating), 0) as avg_rating,
                    COUNT(DISTINCT r.id) as review_count,
                    rv.created_at as viewed_at
                FROM tbl_recently_viewed rv
                JOIN tbl_offers o ON rv.offer_id = o.id
                JOIN tbl_users u ON o.user_id = u.id
                LEFT JOIN tbl_offer_types ot ON o.offer_type_id = ot.id
                LEFT JOIN tbl_reviews r ON o.user_id = r.business_id AND r.is_active = TRUE AND r.is_deleted = FALSE
                WHERE rv.user_id = $1 AND rv.is_active = TRUE AND rv.is_deleted = FALSE
                AND o.is_active = TRUE AND o.is_deleted = FALSE
                GROUP BY o.id, u.id, ot.id, rv.created_at
                ORDER BY rv.created_at DESC
                LIMIT $2 OFFSET $3
            `

      const countQuery = `
                SELECT COUNT(*) as total FROM tbl_recently_viewed rv
                JOIN tbl_offers o ON rv.offer_id = o.id
                WHERE rv.user_id = $1 AND rv.is_active = TRUE AND rv.is_deleted = FALSE
                AND o.is_active = TRUE AND o.is_deleted = FALSE
            `

      const [viewedResult, countResult] = await Promise.all([
        pool.query(recentlyViewedQuery, [user_id, limit, offset]),
        pool.query(countQuery, [user_id]),
      ])

      const recentlyViewed = viewedResult.rows
      const total = Number.parseInt(countResult.rows[0].total)

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          recently_viewed: recentlyViewed,
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
      console.error("Get Recently Viewed Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  // async clearRecentSearches(req, res) {
  //   try {
  //     const user_id = req.user.id

  //     return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "recent_searches_cleared" }, {})
  //   } catch (err) {
  //     console.error("Clear Recent Searches Error:", err)
  //     return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
  //   }
  // },
}

module.exports = search_model
