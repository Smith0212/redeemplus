const { sendResponse } = require("../../middleware")
const pool = require("../../config/database")
const responseCode = require("../../config/responseCode")

const offer_model = {
  async createOffer(req, res) {
    try {
      const user_id = req.user.id
      const {
        offer_type_id,
        business_category_id,
        image,
        title,
        subtitle,
        description,
        terms_of_use,
        discount_percentage,
        total_price,
        old_price,
        duration,
        quantity_available,
        quantity_per_user = 1,
        pin_code,
        is_redeemable_in_store = true,
        is_delivery_available = false,
        delivery_fee = 0,
        estimated_delivery_time,
        valid_days = "1111111", // 7 digits representing Sun-Sat
        offer_latitude,
        offer_longitude,
        available_branches,
        valid_times = [], // Array of {start_time, end_time}
        user_acknowledgment,
      } = req.body

      // Check user's membership and offer limits
      const membershipQuery = `
                SELECT mp.offer_limit, mp.visibility_days, um.offers_used, um.end_date
                FROM tbl_user_memberships um
                JOIN tbl_membership_plans mp ON um.plan_id = mp.id
                WHERE um.user_id = $1 AND um.is_active = TRUE AND um.end_date > CURRENT_TIMESTAMP
                ORDER BY um.created_at DESC LIMIT 1
            `

      const membershipResult = await pool.query(membershipQuery, [user_id])

      if (membershipResult.rows.length === 0) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "no_active_membership" }, {})
      }

      const membership = membershipResult.rows[0]

      // Check offer limit (null means unlimited for Gold)
      if (membership.offer_limit && membership.offers_used >= membership.offer_limit) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "offer_limit_exceeded" }, {})
      }

      // Validate required fields
      if (!title || !total_price || !duration || !quantity_available || !pin_code) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_required_fields" }, {})
      }

      if (!user_acknowledgment) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "acknowledgment_required" }, {})
      }

      // Calculate dates
      const start_date = new Date()
      const end_date = new Date()
      end_date.setDate(start_date.getDate() + duration)

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        // Create offer
        const offerQuery = `
                    INSERT INTO tbl_offers (
                        user_id, offer_type_id, business_category_id, image, title, subtitle,
                        description, terms_of_use, discount_percentage, total_price, old_price,
                        duration, quantity_available, quantity_per_user, pin_code,
                        is_redeemable_in_store, is_delivery_available, delivery_fee,
                        estimated_delivery_time, start_date, end_date, valid_days,
                        offer_latitude, offer_longitude, available_branches, user_acknowledgment
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
                    ) RETURNING id
                `

        const offerResult = await client.query(offerQuery, [
          user_id,
          offer_type_id,
          business_category_id,
          image,
          title,
          subtitle,
          description,
          terms_of_use,
          discount_percentage,
          total_price,
          old_price,
          duration,
          quantity_available,
          quantity_per_user,
          pin_code,
          is_redeemable_in_store,
          is_delivery_available,
          delivery_fee,
          estimated_delivery_time,
          start_date,
          end_date,
          valid_days,
          offer_latitude,
          offer_longitude,
          available_branches,
          user_acknowledgment,
        ])

        const offer_id = offerResult.rows[0].id

        // Add valid times if provided
        if (valid_times && valid_times.length > 0) {
          for (const time of valid_times) {
            await client.query(
              "INSERT INTO tbl_offer_valid_times (offer_id, valid_time_start, valid_time_end) VALUES ($1, $2, $3)",
              [offer_id, time.start_time, time.end_time],
            )
          }
        }

        // Update user's offers used count
        await client.query(
          "UPDATE tbl_user_memberships SET offers_used = offers_used + 1 WHERE user_id = $1 AND is_active = TRUE",
          [user_id],
        )

        await client.query("COMMIT")

        return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "offer_created" }, { offer_id })
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }
    } catch (err) {
      console.error("Create Offer Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getOffers(req, res) {
    try {
      const user_id = req.user.id
      const {
        page = 1,
        limit = 10,
        category = "all", // all, nearby, subscribed
        offer_type,
        business_category_id,
        sort_by = "created_at", // created_at, price_low, price_high, rating, distance
        latitude,
        longitude,
        search_query,
        min_rating,
        max_rating,
        redeem_method, // store, delivery, both
        listed_in_rplus,
      } = req.body

      const offset = (page - 1) * limit
      const whereConditions = ["o.is_active = TRUE", "o.is_deleted = FALSE", "o.end_date > CURRENT_TIMESTAMP"]
      const joinConditions = []
      let orderBy = "o.created_at DESC"
      const queryParams = []
      let paramIndex = 1

      // Category filter
      if (category === "nearby" && latitude && longitude) {
        // Add distance calculation and filter
        whereConditions.push(`
                    (6371 * acos(cos(radians($${paramIndex})) * cos(radians(CAST(o.offer_latitude AS FLOAT))) * 
                    cos(radians(CAST(o.offer_longitude AS FLOAT)) - radians($${paramIndex + 1})) + 
                    sin(radians($${paramIndex})) * sin(radians(CAST(o.offer_latitude AS FLOAT))))) <= 50
                `)
        queryParams.push(latitude, longitude)
        paramIndex += 2
      } else if (category === "subscribed") {
        joinConditions.push(`
                    JOIN tbl_user_subscriptions us ON o.user_id = us.business_id 
                    AND us.user_id = $${paramIndex} AND us.is_active = TRUE AND us.is_deleted = FALSE
                `)
        queryParams.push(user_id)
        paramIndex++
      }

      // Offer type filter
      if (offer_type) {
        whereConditions.push(`o.offer_type_id = $${paramIndex}`)
        queryParams.push(offer_type)
        paramIndex++
      }

      // Business category filter
      if (business_category_id) {
        whereConditions.push(`o.business_category_id = $${paramIndex}`)
        queryParams.push(business_category_id)
        paramIndex++
      }

      // Search query
      if (search_query) {
        whereConditions.push(
          `(o.title ILIKE $${paramIndex} OR o.subtitle ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex})`,
        )
        queryParams.push(`%${search_query}%`)
        paramIndex++
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

      // Redeem method filter
      if (redeem_method === "store") {
        whereConditions.push("o.is_redeemable_in_store = TRUE")
      } else if (redeem_method === "delivery") {
        whereConditions.push("o.is_delivery_available = TRUE")
      }

      // RedeemPlus store filter
      if (listed_in_rplus) {
        whereConditions.push("o.is_listed_in_rplus = TRUE")
      }

      // Sorting
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
        case "distance":
          if (latitude && longitude) {
            orderBy = `(6371 * acos(cos(radians(${latitude})) * cos(radians(CAST(o.offer_latitude AS FLOAT))) * cos(radians(CAST(o.offer_longitude AS FLOAT)) - radians(${longitude})) + sin(radians(${latitude})) * sin(radians(CAST(o.offer_latitude AS FLOAT))))) ASC`
          }
          break
        default:
          orderBy = "o.created_at DESC"
      }

      // Build main query
      const mainQuery = `
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

      queryParams.push(user_id, user_id, limit, offset)

      // Count query
      const countQuery = `
                SELECT COUNT(DISTINCT o.id) as total
                FROM tbl_offers o
                JOIN tbl_users u ON o.user_id = u.id AND u.is_active = TRUE AND u.is_deleted = FALSE
                ${joinConditions.join(" ")}
                WHERE ${whereConditions.join(" AND ")}
            `

      const [offersResult, countResult] = await Promise.all([
        pool.query(mainQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2)), // Remove limit and offset for count
      ])

      const offers = offersResult.rows
      const total = Number.parseInt(countResult.rows[0].total)

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          offers,
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
      console.error("Get Offers Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getOfferDetails(req, res) {
    try {
      const user_id = req.user.id
      const { offer_id } = req.body

      if (!offer_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_offer_id" }, {})
      }

      // Get offer details
      const offerQuery = `
                SELECT 
                    o.*,
                    u.id as business_id, u.username as business_name, u.profile_image as business_image,
                    u.phone as business_phone, u.whatsapp_url, u.instagram_url, u.tiktok_url,
                    ot.offer_category_name, ot.offer_subcategory_name,
                    bc.category_name as business_category,
                    mp.has_verified_badge,
                    COALESCE(AVG(rev.rating), 0) as avg_rating,
                    COUNT(DISTINCT rev.id) as review_count,
                    CASE WHEN so.id IS NOT NULL THEN TRUE ELSE FALSE END as is_saved,
                    CASE WHEN us.id IS NOT NULL THEN TRUE ELSE FALSE END as is_subscribed,
                    CASE WHEN o.user_id = $2 THEN TRUE ELSE FALSE END as is_owner
                FROM tbl_offers o
                JOIN tbl_users u ON o.user_id = u.id AND u.is_active = TRUE AND u.is_deleted = FALSE
                LEFT JOIN tbl_offer_types ot ON o.offer_type_id = ot.id
                LEFT JOIN tbl_business_categories bc ON o.business_category_id = bc.id
                LEFT JOIN tbl_user_memberships um ON u.id = um.user_id AND um.is_active = TRUE
                LEFT JOIN tbl_membership_plans mp ON um.plan_id = mp.id
                LEFT JOIN tbl_reviews rev ON o.user_id = rev.business_id AND rev.is_active = TRUE AND rev.is_deleted = FALSE
                LEFT JOIN tbl_saved_offers so ON o.id = so.offer_id AND so.user_id = $2 AND so.is_active = TRUE AND so.is_deleted = FALSE
                LEFT JOIN tbl_user_subscriptions us ON o.user_id = us.business_id AND us.user_id = $2 AND us.is_active = TRUE AND us.is_deleted = FALSE
                WHERE o.id = $1 AND o.is_active = TRUE AND o.is_deleted = FALSE
                GROUP BY o.id, u.id, ot.id, bc.id, mp.id, so.id, us.id
            `

      const offerResult = await pool.query(offerQuery, [offer_id, user_id])

      if (offerResult.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "offer_not_found" }, {})
      }

      const offer = offerResult.rows[0]

      // Get valid times
      const timesQuery = `
                SELECT valid_time_start, valid_time_end 
                FROM tbl_offer_valid_times 
                WHERE offer_id = $1 AND is_active = TRUE AND is_deleted = FALSE
            `
      const timesResult = await pool.query(timesQuery, [offer_id])

      // Update view count (only if not owner)
      if (!offer.is_owner) {
        await pool.query("UPDATE tbl_offers SET view_count = view_count + 1 WHERE id = $1", [offer_id])

        // Add to recently viewed
        await pool.query(
          `
                    INSERT INTO tbl_recently_viewed (user_id, offer_id) 
                    VALUES ($1, $2) 
                    ON CONFLICT (user_id, offer_id) 
                    DO UPDATE SET created_at = CURRENT_TIMESTAMP
                `,
          [user_id, offer_id],
        )
      }

      // Get recommended offers (same category, different business)
      const recommendedQuery = `
                SELECT 
                    o.id, o.title, o.subtitle, o.image, o.total_price, o.old_price,
                    o.quantity_available, o.is_redeemable_in_store, o.is_delivery_available,
                    u.username as business_name, u.profile_image as business_image,
                    COALESCE(AVG(rev.rating), 0) as avg_rating,
                    ot.offer_category_name
                FROM tbl_offers o
                JOIN tbl_users u ON o.user_id = u.id AND u.is_active = TRUE AND u.is_deleted = FALSE
                LEFT JOIN tbl_reviews rev ON o.user_id = rev.business_id AND rev.is_active = TRUE AND rev.is_deleted = FALSE
                LEFT JOIN tbl_offer_types ot ON o.offer_type_id = ot.id
                WHERE o.business_category_id = $1 AND o.user_id != $2 AND o.id != $3 
                AND o.is_active = TRUE AND o.is_deleted = FALSE AND o.end_date > CURRENT_TIMESTAMP
                GROUP BY o.id, u.id, ot.id
                ORDER BY RANDOM()
                LIMIT 5
            `

      const recommendedResult = await pool.query(recommendedQuery, [
        offer.business_category_id,
        offer.user_id,
        offer_id,
      ])

      const response = {
        ...offer,
        valid_times: timesResult.rows,
        recommended_offers: recommendedResult.rows,
      }

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, response)
    } catch (err) {
      console.error("Get Offer Details Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async updateOffer(req, res) {
    try {
      const user_id = req.user.id
      const {
        offer_id,
        image,
        title,
        subtitle,
        description,
        terms_of_use,
        pin_code,
        delivery_fee,
        estimated_delivery_time,
        available_branches,
        valid_times = [],
        user_acknowledgment,
      } = req.body

      if (!offer_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_offer_id" }, {})
      }

      if (!user_acknowledgment) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "acknowledgment_required" }, {})
      }

      // Check if user owns the offer
      const ownershipQuery =
        "SELECT id FROM tbl_offers WHERE id = $1 AND user_id = $2 AND is_active = TRUE AND is_deleted = FALSE"
      const ownershipResult = await pool.query(ownershipQuery, [offer_id, user_id])

      if (ownershipResult.rows.length === 0) {
        return sendResponse(req, res, 403, responseCode.OPERATION_FAILED, { keyword: "permission_denied" }, {})
      }

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        // Build dynamic update query for allowed fields only
        const fields = []
        const values = []
        let idx = 1

        const updateFields = {
          image,
          title,
          subtitle,
          description,
          terms_of_use,
          pin_code,
          delivery_fee,
          estimated_delivery_time,
          available_branches,
        }

        for (const [key, value] of Object.entries(updateFields)) {
          if (value !== undefined) {
            fields.push(`${key} = $${idx++}`)
            values.push(value)
          }
        }

        if (fields.length > 0) {
          fields.push(`updated_at = CURRENT_TIMESTAMP`)
          values.push(offer_id)

          const updateQuery = `
                        UPDATE tbl_offers 
                        SET ${fields.join(", ")}
                        WHERE id = $${idx}
                        RETURNING id
                    `

          await client.query(updateQuery, values)
        }

        // Update valid times if provided
        if (valid_times && valid_times.length > 0) {
          // Delete existing times
          await client.query("DELETE FROM tbl_offer_valid_times WHERE offer_id = $1", [offer_id])

          // Insert new times
          for (const time of valid_times) {
            await client.query(
              "INSERT INTO tbl_offer_valid_times (offer_id, valid_time_start, valid_time_end) VALUES ($1, $2, $3)",
              [offer_id, time.start_time, time.end_time],
            )
          }
        }

        await client.query("COMMIT")

        return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "offer_updated" }, { offer_id })
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }
    } catch (err) {
      console.error("Update Offer Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async deleteOffer(req, res) {
    try {
      const user_id = req.user.id
      const { offer_id } = req.body

      if (!offer_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_offer_id" }, {})
      }

      // Check if user owns the offer
      const ownershipQuery =
        "SELECT id FROM tbl_offers WHERE id = $1 AND user_id = $2 AND is_active = TRUE AND is_deleted = FALSE"
      const ownershipResult = await pool.query(ownershipQuery, [offer_id, user_id])

      if (ownershipResult.rows.length === 0) {
        return sendResponse(req, res, 403, responseCode.OPERATION_FAILED, { keyword: "permission_denied" }, {})
      }

      // Check for active redemptions
      const activeRedemptionsQuery = `
                SELECT COUNT(*) as count FROM tbl_redemption_deliveries rd
                JOIN tbl_redemptions r ON rd.redemption_id = r.id
                WHERE r.offer_id = $1 AND rd.status IN ('pending', 'approved')
            `

      const activeRedemptions = await pool.query(activeRedemptionsQuery, [offer_id])

      if (Number.parseInt(activeRedemptions.rows[0].count) > 0) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "active_redemptions_exist" }, {})
      }

      // Soft delete offer
      const deleteQuery = `
                UPDATE tbl_offers 
                SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING id
            `

      const result = await pool.query(deleteQuery, [offer_id])

      // Update user's offers used count
      await pool.query(
        "UPDATE tbl_user_memberships SET offers_used = offers_used - 1 WHERE user_id = $1 AND is_active = TRUE AND offers_used > 0",
        [user_id],
      )

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "offer_deleted" },
        { offer_id: result.rows[0].id },
      )
    } catch (err) {
      console.error("Delete Offer Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async listInRedeemPlusStore(req, res) {
    try {
      const user_id = req.user.id
      const { offer_id } = req.body

      if (!offer_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_offer_id" }, {})
      }

      // Check if user owns the offer
      const offerQuery = `
                SELECT o.id, o.is_listed_in_rplus, mp.has_free_listing_rplus
                FROM tbl_offers o
                JOIN tbl_users u ON o.user_id = u.id
                LEFT JOIN tbl_user_memberships um ON u.id = um.user_id AND um.is_active = TRUE
                LEFT JOIN tbl_membership_plans mp ON um.plan_id = mp.id
                WHERE o.id = $1 AND o.user_id = $2 AND o.is_active = TRUE AND o.is_deleted = FALSE
            `

      const offerResult = await pool.query(offerQuery, [offer_id, user_id])

      if (offerResult.rows.length === 0) {
        return sendResponse(req, res, 403, responseCode.OPERATION_FAILED, { keyword: "permission_denied" }, {})
      }

      const offer = offerResult.rows[0]

      if (offer.is_listed_in_rplus) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "already_listed_in_store" }, {})
      }

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        // Check if user has free listing (Gold membership)
        if (!offer.has_free_listing_rplus) {
          // Create payment record for $5 listing fee
          const paymentQuery = `
                        INSERT INTO tbl_payments (user_id, amount, currency, payment_method, description, payment_type, status)
                        VALUES ($1, 5.00, 'USD', 'listing_fee', 'RedeemPlus Store Listing Fee', 'listing', 'completed')
                        RETURNING id
                    `

          await client.query(paymentQuery, [user_id])
        }

        // Update offer to be listed in RedeemPlus store
        await client.query(
          "UPDATE tbl_offers SET is_listed_in_rplus = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [offer_id],
        )

        await client.query("COMMIT")

        return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "offer_listed_in_store" }, { offer_id })
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }
    } catch (err) {
      console.error("List in RedeemPlus Store Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getMyOffers(req, res) {
    try {
      const user_id = req.user.id
      const { page = 1, limit = 10, status = "active" } = req.body // active, expired, all

      const offset = (page - 1) * limit
      const whereConditions = ["o.user_id = $1", "o.is_deleted = FALSE"]
      const queryParams = [user_id]
      const paramIndex = 2

      if (status === "active") {
        whereConditions.push("o.is_active = TRUE", "o.end_date > CURRENT_TIMESTAMP")
      } else if (status === "expired") {
        whereConditions.push("o.end_date <= CURRENT_TIMESTAMP")
      }

      const offersQuery = `
                SELECT 
                    o.id, o.title, o.subtitle, o.image, o.total_price, o.old_price,
                    o.quantity_available, o.view_count, o.total_redemptions,
                    o.start_date, o.end_date, o.is_active, o.is_listed_in_rplus,
                    o.created_at,
                    ot.offer_category_name, ot.offer_subcategory_name,
                    COUNT(DISTINCT r.id) as redemption_count
                FROM tbl_offers o
                LEFT JOIN tbl_offer_types ot ON o.offer_type_id = ot.id
                LEFT JOIN tbl_redemptions r ON o.id = r.offer_id AND r.is_active = TRUE AND r.is_deleted = FALSE
                WHERE ${whereConditions.join(" AND ")}
                GROUP BY o.id, ot.id
                ORDER BY o.created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `

      const countQuery = `
                SELECT COUNT(*) as total FROM tbl_offers o
                WHERE ${whereConditions.join(" AND ")}
            `

      queryParams.push(limit, offset)

      const [offersResult, countResult] = await Promise.all([
        pool.query(offersQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2)),
      ])

      const offers = offersResult.rows
      const total = Number.parseInt(countResult.rows[0].total)

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          offers,
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
      console.error("Get My Offers Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },
}

module.exports = offer_model
