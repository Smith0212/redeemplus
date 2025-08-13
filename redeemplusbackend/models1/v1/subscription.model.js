const { sendResponse } = require("../../middleware")
const pool = require("../../config/database")
const responseCode = require("../../config/responseCode")

const subscription_model = {
  async subscribeToBusiness(req, res) {
    try {
      const user_id = req.user.id
      const { business_id } = req.body

      if (!business_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_business_id" }, {})
      }

      // Check if business exists and is active
      const businessQuery = `
                SELECT id, username, account_type FROM tbl_users 
                WHERE id = $1 AND is_active = TRUE AND is_deleted = FALSE
            `
      const businessResult = await pool.query(businessQuery, [business_id])

      if (businessResult.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "business_not_found" }, {})
      }

      const business = businessResult.rows[0]

      // Prevent self-subscription
      if (business_id === user_id) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "cannot_subscribe_self" }, {})
      }

      // Check if already subscribed
      const existingSubscriptionQuery = `
                SELECT id FROM tbl_user_subscriptions 
                WHERE user_id = $1 AND business_id = $2 AND is_active = TRUE AND is_deleted = FALSE
            `
      const existingSubscription = await pool.query(existingSubscriptionQuery, [user_id, business_id])

      if (existingSubscription.rows.length > 0) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "already_subscribed" }, {})
      }

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        // Create subscription
        const subscriptionQuery = `
                    INSERT INTO tbl_user_subscriptions (user_id, business_id)
                    VALUES ($1, $2)
                    RETURNING id, created_at
                `
        const subscriptionResult = await client.query(subscriptionQuery, [user_id, business_id])
        const subscription = subscriptionResult.rows[0]

        // Create notification for business owner
        await client.query(
          `INSERT INTO tbl_notifications (user_id, sender_id, type, title, message, data) 
                     VALUES ($1, $2, 'new_subscriber', 'New Subscriber', $3, $4)`,
          [
            business_id,
            user_id,
            `You have a new subscriber!`,
            JSON.stringify({
              subscription_id: subscription.id,
              subscriber_id: user_id,
            }),
          ],
        )

        await client.query("COMMIT")

        return sendResponse(
          req,
          res,
          200,
          responseCode.SUCCESS,
          { keyword: "subscribed_successfully" },
          {
            subscription_id: subscription.id,
            business_name: business.username,
            subscribed_at: subscription.created_at,
          },
        )
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }
    } catch (err) {
      console.error("Subscribe to Business Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async unsubscribeFromBusiness(req, res) {
    try {
      const user_id = req.user.id
      const { business_id } = req.body

      if (!business_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_business_id" }, {})
      }

      // Check if subscription exists
      const subscriptionQuery = `
                SELECT id FROM tbl_user_subscriptions 
                WHERE user_id = $1 AND business_id = $2 AND is_active = TRUE AND is_deleted = FALSE
            `
      const subscriptionResult = await pool.query(subscriptionQuery, [user_id, business_id])

      if (subscriptionResult.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "subscription_not_found" }, {})
      }

      // Soft delete subscription
      const unsubscribeQuery = `
                UPDATE tbl_user_subscriptions 
                SET is_deleted = TRUE, is_active = FALSE, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $1 AND business_id = $2
                RETURNING id
            `

      const result = await pool.query(unsubscribeQuery, [user_id, business_id])

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "unsubscribed_successfully" },
        { subscription_id: result.rows[0].id },
      )
    } catch (err) {
      console.error("Unsubscribe from Business Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getMySubscriptions(req, res) {
    try {
      const user_id = req.user.id
      const { page = 1, limit = 20 } = req.body

      const offset = (page - 1) * limit

      const subscriptionsQuery = `
                SELECT 
                    s.id as subscription_id, s.created_at as subscribed_at,
                    u.id as business_id, u.username as business_name, u.profile_image as business_image,
                    u.account_type, u.business_category_id,
                    bc.category_name, bc.sub_category_name,
                    mp.name as membership_name, mp.has_verified_badge,
                    COALESCE(AVG(r.rating), 0) as avg_rating,
                    COUNT(DISTINCT r.id) as total_reviews,
                    COUNT(DISTINCT o.id) as active_offers
                FROM tbl_user_subscriptions s
                JOIN tbl_users u ON s.business_id = u.id
                LEFT JOIN tbl_business_categories bc ON u.business_category_id = bc.id
                LEFT JOIN tbl_user_memberships um ON u.id = um.user_id AND um.is_active = TRUE
                LEFT JOIN tbl_membership_plans mp ON um.plan_id = mp.id
                LEFT JOIN tbl_reviews r ON u.id = r.business_id AND r.is_active = TRUE AND r.is_deleted = FALSE
                LEFT JOIN tbl_offers o ON u.id = o.user_id AND o.is_active = TRUE AND o.is_deleted = FALSE 
                    AND o.end_date > CURRENT_TIMESTAMP
                WHERE s.user_id = $1 AND s.is_active = TRUE AND s.is_deleted = FALSE
                    AND u.is_active = TRUE AND u.is_deleted = FALSE
                GROUP BY s.id, u.id, bc.id, mp.id
                ORDER BY s.created_at DESC
                LIMIT $2 OFFSET $3
            `

      const countQuery = `
                SELECT COUNT(*) as total FROM tbl_user_subscriptions s
                JOIN tbl_users u ON s.business_id = u.id
                WHERE s.user_id = $1 AND s.is_active = TRUE AND s.is_deleted = FALSE
                    AND u.is_active = TRUE AND u.is_deleted = FALSE
            `

      const [subscriptionsResult, countResult] = await Promise.all([
        pool.query(subscriptionsQuery, [user_id, limit, offset]),
        pool.query(countQuery, [user_id]),
      ])

      const subscriptions = subscriptionsResult.rows
      const total = Number.parseInt(countResult.rows[0].total)

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          subscriptions,
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
      console.error("Get My Subscriptions Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getMySubscribers(req, res) {
    try {
      const user_id = req.user.id
      const { page = 1, limit = 20 } = req.body

      const offset = (page - 1) * limit

      const subscribersQuery = `
                SELECT 
                    s.id as subscription_id, s.created_at as subscribed_at,
                    u.id as subscriber_id, u.username as subscriber_name, u.profile_image as subscriber_image,
                    u.account_type,
                    COALESCE(COUNT(DISTINCT r.id), 0) as redemptions_count,
                    COALESCE(SUM(r.total_amount), 0) as total_spent
                FROM tbl_user_subscriptions s
                JOIN tbl_users u ON s.user_id = u.id
                LEFT JOIN tbl_redemptions r ON u.id = r.user_id 
                    AND r.offer_id IN (SELECT id FROM tbl_offers WHERE user_id = $1)
                    AND r.is_active = TRUE AND r.is_deleted = FALSE
                WHERE s.business_id = $1 AND s.is_active = TRUE AND s.is_deleted = FALSE
                    AND u.is_active = TRUE AND u.is_deleted = FALSE
                GROUP BY s.id, u.id
                ORDER BY s.created_at DESC
                LIMIT $2 OFFSET $3
            `

      const countQuery = `
                SELECT COUNT(*) as total FROM tbl_user_subscriptions s
                JOIN tbl_users u ON s.user_id = u.id
                WHERE s.business_id = $1 AND s.is_active = TRUE AND s.is_deleted = FALSE
                    AND u.is_active = TRUE AND u.is_deleted = FALSE
            `

      const [subscribersResult, countResult] = await Promise.all([
        pool.query(subscribersQuery, [user_id, limit, offset]),
        pool.query(countQuery, [user_id]),
      ])

      const subscribers = subscribersResult.rows
      const total = Number.parseInt(countResult.rows[0].total)

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          subscribers,
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
      console.error("Get My Subscribers Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getSubscriptionStatus(req, res) {
    try {
      const user_id = req.user.id
      const { business_id } = req.body

      if (!business_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_business_id" }, {})
      }

      const statusQuery = `
                SELECT 
                    s.id as subscription_id, s.created_at as subscribed_at,
                    CASE WHEN s.id IS NOT NULL THEN TRUE ELSE FALSE END as is_subscribed
                FROM tbl_user_subscriptions s
                WHERE s.user_id = $1 AND s.business_id = $2 AND s.is_active = TRUE AND s.is_deleted = FALSE
            `

      const { rows } = await pool.query(statusQuery, [user_id, business_id])

      const status = {
        is_subscribed: rows.length > 0,
        subscription_id: rows.length > 0 ? rows[0].subscription_id : null,
        subscribed_at: rows.length > 0 ? rows[0].subscribed_at : null,
      }

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, status)
    } catch (err) {
      console.error("Get Subscription Status Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getSubscribedOffers(req, res) {
    try {
      const user_id = req.user.id
      const {
        page = 1,
        limit = 10,
        offer_type_id,
        business_category_id,
        sort_by = "created_at", // created_at, price_low, price_high, rating
      } = req.body

      const offset = (page - 1) * limit
      const whereConditions = [
        "s.user_id = $1",
        "s.is_active = TRUE",
        "s.is_deleted = FALSE",
        "o.is_active = TRUE",
        "o.is_deleted = FALSE",
        "o.end_date > CURRENT_TIMESTAMP",
        "u.is_active = TRUE",
        "u.is_deleted = FALSE",
      ]
      const queryParams = [user_id]
      let paramIndex = 2

      // Offer type filter
      if (offer_type_id) {
        whereConditions.push(`o.offer_type_id = $${paramIndex}`)
        queryParams.push(offer_type_id)
        paramIndex++
      }

      // Business category filter
      if (business_category_id) {
        whereConditions.push(`o.business_category_id = $${paramIndex}`)
        queryParams.push(business_category_id)
        paramIndex++
      }

      // Sorting
      let orderBy = "o.created_at DESC"
      switch (sort_by) {
        case "price_low":
          orderBy = "o.total_price ASC"
          break
        case "price_high":
          orderBy = "o.total_price DESC"
          break
        case "rating":
          orderBy = "COALESCE(AVG(r.rating), 0) DESC"
          break
        default:
          orderBy = "o.created_at DESC"
      }

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
                    COALESCE(AVG(r.rating), 0) as avg_rating,
                    COUNT(DISTINCT r.id) as review_count,
                    CASE WHEN so.id IS NOT NULL THEN TRUE ELSE FALSE END as is_saved
                FROM tbl_user_subscriptions s
                JOIN tbl_users u ON s.business_id = u.id
                JOIN tbl_offers o ON u.id = o.user_id
                LEFT JOIN tbl_offer_types ot ON o.offer_type_id = ot.id
                LEFT JOIN tbl_business_categories bc ON o.business_category_id = bc.id
                LEFT JOIN tbl_user_memberships um ON u.id = um.user_id AND um.is_active = TRUE
                LEFT JOIN tbl_membership_plans mp ON um.plan_id = mp.id
                LEFT JOIN tbl_reviews r ON u.id = r.business_id AND r.is_active = TRUE AND r.is_deleted = FALSE
                LEFT JOIN tbl_saved_offers so ON o.id = so.offer_id AND so.user_id = $1 AND so.is_active = TRUE AND so.is_deleted = FALSE
                WHERE ${whereConditions.join(" AND ")}
                GROUP BY o.id, u.id, ot.id, bc.id, mp.id, so.id, s.created_at
                ORDER BY ${orderBy}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `

      const countQuery = `
                SELECT COUNT(DISTINCT o.id) as total
                FROM tbl_user_subscriptions s
                JOIN tbl_users u ON s.business_id = u.id
                JOIN tbl_offers o ON u.id = o.user_id
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
      console.error("Get Subscribed Offers Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getSubscriptionStats(req, res) {
    try {
      const user_id = req.user.id

      // Get subscription statistics
      const statsQuery = `
                SELECT 
                    COUNT(DISTINCT s.business_id) as total_subscriptions,
                    COUNT(DISTINCT CASE WHEN u.account_type = 'business' THEN s.business_id END) as business_subscriptions,
                    COUNT(DISTINCT CASE WHEN u.account_type = 'individual' THEN s.business_id END) as individual_subscriptions,
                    COUNT(DISTINCT CASE WHEN mp.name = 'Gold' THEN s.business_id END) as gold_subscriptions,
                    COUNT(DISTINCT CASE WHEN mp.name = 'Silver' THEN s.business_id END) as silver_subscriptions,
                    COUNT(DISTINCT CASE WHEN mp.name = 'Bronze' OR mp.name IS NULL THEN s.business_id END) as bronze_subscriptions
                FROM tbl_user_subscriptions s
                JOIN tbl_users u ON s.business_id = u.id
                LEFT JOIN tbl_user_memberships um ON u.id = um.user_id AND um.is_active = TRUE
                LEFT JOIN tbl_membership_plans mp ON um.plan_id = mp.id
                WHERE s.user_id = $1 AND s.is_active = TRUE AND s.is_deleted = FALSE
                    AND u.is_active = TRUE AND u.is_deleted = FALSE
            `

      // Get subscriber statistics (for business users)
      const subscriberStatsQuery = `
                SELECT 
                    COUNT(DISTINCT s.user_id) as total_subscribers,
                    COUNT(DISTINCT CASE WHEN DATE(s.created_at) >= CURRENT_DATE - INTERVAL '7 days' THEN s.user_id END) as new_subscribers_week,
                    COUNT(DISTINCT CASE WHEN DATE(s.created_at) >= CURRENT_DATE - INTERVAL '30 days' THEN s.user_id END) as new_subscribers_month
                FROM tbl_user_subscriptions s
                JOIN tbl_users u ON s.user_id = u.id
                WHERE s.business_id = $1 AND s.is_active = TRUE AND s.is_deleted = FALSE
                    AND u.is_active = TRUE AND u.is_deleted = FALSE
            `

      const [statsResult, subscriberStatsResult] = await Promise.all([
        pool.query(statsQuery, [user_id]),
        pool.query(subscriberStatsQuery, [user_id]),
      ])

      const stats = statsResult.rows[0]
      const subscriberStats = subscriberStatsResult.rows[0]

      const response = {
        my_subscriptions: {
          total: Number.parseInt(stats.total_subscriptions),
          business_accounts: Number.parseInt(stats.business_subscriptions),
          individual_accounts: Number.parseInt(stats.individual_subscriptions),
          by_membership: {
            gold: Number.parseInt(stats.gold_subscriptions),
            silver: Number.parseInt(stats.silver_subscriptions),
            bronze: Number.parseInt(stats.bronze_subscriptions),
          },
        },
        my_subscribers: {
          total: Number.parseInt(subscriberStats.total_subscribers),
          new_this_week: Number.parseInt(subscriberStats.new_subscribers_week),
          new_this_month: Number.parseInt(subscriberStats.new_subscribers_month),
        },
      }

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, response)
    } catch (err) {
      console.error("Get Subscription Stats Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },
}

module.exports = subscription_model
