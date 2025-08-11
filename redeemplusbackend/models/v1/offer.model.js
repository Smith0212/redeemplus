const { sendResponse } = require("../../middleware")
const pool = require("../../config/database")
const responseCode = require("../../config/responseCode")

const offer_model = {
  async createOffer(req, res) {
    try {
      const user_id = req.user.id
      const {
        offer_subcategory_id,
        business_subcategory_id,
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
        offer_type // Added offer_type to check against allowed types
      } = req.body

      // Check user's membership and offer limits
      const membershipQuery = `
                SELECT mp.offer_limit, mp.visibility_days, mp.allowed_offer_types, 
                       mp.offer_quantity_limit, mp.limit_per_user, mp.can_update_currency,
                       mp.edit_access, um.offers_used, um.end_date
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
      if (membership.offer_limit !== null && membership.offers_used >= membership.offer_limit) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "offer_limit_exceeded" }, {})
      }

      // Check offer type is allowed for this membership
      if (membership.allowed_offer_types && !membership.allowed_offer_types.includes(offer_type)) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "offer_type_not_allowed" }, {})
      }

      // Check offer duration doesn't exceed plan's visibility_days
      if (duration > membership.visibility_days) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "duration_exceeds_limit" }, {
          max_allowed_duration: membership.visibility_days
        })
      }

      // Check quantity_available doesn't exceed plan's offer_quantity_limit
      if (membership.offer_quantity_limit && quantity_available > membership.offer_quantity_limit) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "quantity_exceeds_limit" }, {
          max_allowed_quantity: membership.offer_quantity_limit
        })
      }

      // Check quantity_per_user doesn't exceed plan's limit_per_user
      if (membership.limit_per_user && quantity_per_user > membership.limit_per_user) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "user_limit_exceeds" }, {
          max_per_user: membership.limit_per_user
        })
      }

      // Validate required fields
      if (!title || !total_price || !duration || !quantity_available || !pin_code) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_required_fields" }, {})
      }

      if (!user_acknowledgment) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "acknowledgment_required" }, {})
      }

      // Ensure at least one redeem method is true
      if (!is_redeemable_in_store && !is_delivery_available) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "invalid_redeem_method" }, {})
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
                        user_id, offer_subcategory_id, business_subcategory_id, image, title, subtitle,
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
          offer_subcategory_id,
          business_subcategory_id,
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

  async listOffers(req, res) {
    try {
      // offer_type and offer_type_ids will always in list so marge them
      
      const {
        page = 1,
        limit = 10,
        type = "all", // all, nearby, subscribed, user 
        business_subcategory_id,
        business_subcategory_ids = [],
        sort_by = "created_at",
        latitude,
        longitude,
        search_query,
        rating_filter,
        membership_type,
        redeem_method,
        redeem_methods = [],
        listed_in_rplus,
        offer_category_id,
        offer_category_ids = [],
        offer_subcategory_id,
        offer_subcategory_ids = []
      } = req.body;

      const user_id = type == "user" ? req.body.user_id : req.user.id;
      
      if(!user_id) {
        user_id = req.user.id;
      }


      // Use query if search_query is not provided
      const isSearch = !!search_query;

      // Handle array parameters from both single value and array inputs
      const finalBusinessCategoryIds = business_subcategory_id ? [business_subcategory_id] : business_subcategory_ids;
      const finalOfferCategoryIds = offer_category_id ? [offer_category_id] : offer_category_ids;
      const finalOfferSubcategoryIds = offer_subcategory_id ? [offer_subcategory_id] : offer_subcategory_ids;
      const finalRedeemMethods = redeem_method ? [redeem_method] : redeem_methods;

      const offset = (page - 1) * limit;

      // Get current day (0-6 where 0 is Sunday) and current time
      const currentDate = new Date();
      const currentDay = currentDate.getDay(); // 0 (Sunday) to 6 (Saturday)
      const currentTime = currentDate.toTimeString().substring(0, 8); // HH:MM:SS format

      const whereConditions = [
        "o.is_active = TRUE",
        "o.is_deleted = FALSE",
        "o.start_date <= CURRENT_TIMESTAMP",
        "o.end_date > CURRENT_TIMESTAMP",
        // Check valid_days (1=valid, 0=invalid)
        `SUBSTRING(o.valid_days FROM ${currentDay + 1} FOR 1) = '1'`
      ];

      const joinConditions = [
        // Join with offer valid times and filter by current time
        `LEFT JOIN tbl_offer_valid_times ovt ON o.id = ovt.offer_id AND ovt.is_active = TRUE AND ovt.is_deleted = FALSE`,
        `LEFT JOIN (
          SELECT offer_id, 
                 BOOL_OR(
                   (valid_time_start <= valid_time_end AND '${currentTime}' BETWEEN valid_time_start AND valid_time_end) OR
                   (valid_time_start > valid_time_end AND ('${currentTime}' >= valid_time_start OR '${currentTime}' <= valid_time_end))
                 ) AS is_currently_valid
          FROM tbl_offer_valid_times
          WHERE is_active = TRUE AND is_deleted = FALSE
          GROUP BY offer_id
        ) current_valid_times ON o.id = current_valid_times.offer_id`
      ];

      // Only show offers that either have no time restrictions or are currently valid
      whereConditions.push(`(current_valid_times.is_currently_valid = TRUE OR NOT EXISTS (
        SELECT 1 FROM tbl_offer_valid_times WHERE offer_id = o.id AND is_active = TRUE AND is_deleted = FALSE
      ))`);

      let orderBy = "o.created_at DESC";
      const queryParams = [];
      let paramIndex = 1;

      // type filter
      if (type === "nearby" && latitude && longitude) {
        // Add distance calculation and filter
        whereConditions.push(`
          (6371 * acos(cos(radians($${paramIndex})) * cos(radians(CAST(o.offer_latitude AS FLOAT))) * 
          cos(radians(CAST(o.offer_longitude AS FLOAT)) - radians($${paramIndex + 1})) + 
          sin(radians($${paramIndex})) * sin(radians(CAST(o.offer_latitude AS FLOAT))))) <= 50
        `);
        queryParams.push(latitude, longitude);
        paramIndex += 2;
      } else if (type === "subscribed") {
        joinConditions.push(`
          JOIN tbl_user_subscriptions subscribed_us ON o.user_id = subscribed_us.business_id 
          AND subscribed_us.user_id = $${paramIndex} AND subscribed_us.is_active = TRUE AND subscribed_us.is_deleted = FALSE
        `);
        queryParams.push(user_id);
        paramIndex++;
      } else if (type === "user") {
        whereConditions.push(`o.user_id = $${paramIndex}`);
        queryParams.push(user_id);
        paramIndex++;
      }

      // Search query
      if (isSearch) {
        whereConditions.push(
          `(o.title ILIKE $${paramIndex} OR o.subtitle ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex})`
        );
        queryParams.push(`%${search_query}%`);
        paramIndex++;
      }

      if (membership_type) {
        whereConditions.push(`LOWER(mp.name) = LOWER($${paramIndex})`);
        queryParams.push(membership_type);
        paramIndex++;
      }

      // Offer category filter (array support)
      if (finalOfferCategoryIds.length > 0) {
        whereConditions.push(`osc.offer_category_id = ANY($${paramIndex})`);
        queryParams.push(finalOfferCategoryIds);
        paramIndex++;
      }

      // Offer subcategory filter (array support)
      if (finalOfferSubcategoryIds.length > 0) {
        whereConditions.push(`o.offer_subcategory_id = ANY($${paramIndex})`);
        queryParams.push(finalOfferSubcategoryIds);
        paramIndex++;
      }

      // Business category filter (array support)
      if (finalBusinessCategoryIds.length > 0) {
        whereConditions.push(`o.business_subcategory_id = ANY($${paramIndex})`);
        queryParams.push(finalBusinessCategoryIds);
        paramIndex++;
      }

      // Rating filter
      if (rating_filter === 'top') {
        whereConditions.push(`COALESCE(u.avg_rating, 0) BETWEEN 4.0 AND 5.0`);
      } else if (rating_filter === 'moderate') {
        whereConditions.push(`COALESCE(u.avg_rating, 0) BETWEEN 3.0 AND 3.9`);
      } else if (rating_filter === 'low') {
        whereConditions.push(`COALESCE(u.avg_rating, 0) BETWEEN 1.0 AND 2.9`);
      }

      // Redeem method filter
      if (finalRedeemMethods.length > 0) {
        const redeemConditions = [];
        if (finalRedeemMethods.includes("store") || finalRedeemMethods.includes("both")) {
          redeemConditions.push("o.is_redeemable_in_store = TRUE");
        }
        if (finalRedeemMethods.includes("delivery") || finalRedeemMethods.includes("both")) {
          redeemConditions.push("o.is_delivery_available = TRUE");
        }
        if (redeemConditions.length > 0) {
          whereConditions.push(`(${redeemConditions.join(" OR ")})`);
        }
      }

      // RedeemPlus store filter
      if (listed_in_rplus) {
        whereConditions.push("o.is_listed_in_rplus = TRUE");
      }

      // Sorting
      switch (sort_by) {
        case "lowest_price_first":
          orderBy = "o.total_price ASC";
          break;
        case "highest_price_first":
          orderBy = "o.total_price DESC";
          break;
        case "rating":
          if (!joinConditions.some(j => j.includes("avg_rating"))) {
            joinConditions.push(
              "LEFT JOIN (SELECT business_id, AVG(rating) as avg_rating FROM tbl_reviews WHERE is_active = TRUE AND is_deleted = FALSE GROUP BY business_id) r ON o.user_id = r.business_id"
            );
          }
          orderBy = "COALESCE(r.avg_rating, 0) DESC";
          break;
        case "near_by":
          if (latitude && longitude) {
            orderBy = `(6371 * acos(cos(radians(${latitude})) * cos(radians(CAST(o.offer_latitude AS FLOAT))) * 
                      cos(radians(CAST(o.offer_longitude AS FLOAT)) - radians(${longitude})) + 
                      sin(radians(${latitude})) * sin(radians(CAST(o.offer_latitude AS FLOAT))))) ASC`;
          }
          break;
        case "relevance":
          if (isSearch) {quantity_per_user
            orderBy = `
              CASE 
                WHEN o.title ILIKE $1 THEN 1
                WHEN o.subtitle ILIKE $1 THEN 2
                WHEN u.username ILIKE $1 THEN 3
                ELSE 4
              END, o.view_count DESC, o.created_at DESC
            `;
          }
          break;
        default:
          orderBy = "o.created_at DESC";
      }

      // Build main queryquantity_per_user
      const mainQuery = `
        SELECT 
          o.id, o.title, o.subtitle, o.description, o.terms_of_use, o.available_branches,  o.image, o.total_price, o.old_price,
          o.discount_percentage, o.quantity_available, o.is_redeemable_in_store,
          o.is_delivery_available, o.delivery_fee, o.view_count, o.total_redemptions,
          o.start_date, o.end_date, o.created_at, o.is_listed_in_rplus,
          u.id as business_id, u.username, u.profile_image,
          oc.offer_category_name, osc.offer_subcategory_name,
          bsc.subcategory_name as business_subcategory,
          mp.has_verified_badge,
          COALESCE(u.avg_rating, 0) as avg_rating,
          COALESCE(rev.review_count, 0) as review_count,
          CASE WHEN so.id IS NOT NULL THEN TRUE ELSE FALSE END as is_saved,
          CASE WHEN us.id IS NOT NULL THEN TRUE ELSE FALSE END as is_subscribed,
          ${latitude && longitude
          ? `
              (6371 * acos(cos(radians(${latitude})) * cos(radians(CAST(o.offer_latitude AS FLOAT))) * 
              cos(radians(CAST(o.offer_longitude AS FLOAT)) - radians(${longitude})) + 
              sin(radians(${latitude})) * sin(radians(CAST(o.offer_latitude AS FLOAT))))) as distance
            `
          : "NULL as distance"
        },
          -- Include valid days and times information
          o.valid_days,
          (
            SELECT JSON_AGG(
              JSON_BUILD_OBJECT(
                'start_time', valid_time_start,
                'end_time', valid_time_end
              )
            )
            FROM tbl_offer_valid_times 
            WHERE offer_id = o.id AND is_active = TRUE AND is_deleted = FALSE
          ) AS valid_times
        FROM tbl_offers o
        JOIN tbl_users u ON o.user_id = u.id AND u.is_active = TRUE AND u.is_deleted = FALSE
        LEFT JOIN tbl_offer_subcategories osc ON o.offer_subcategory_id = osc.id
        LEFT JOIN tbl_offer_categories oc ON osc.offer_category_id = oc.id
        LEFT JOIN tbl_business_subcategories bsc ON o.business_subcategory_id = bsc.id
        LEFT JOIN tbl_user_memberships um ON u.id = um.user_id AND um.is_active = TRUE
        LEFT JOIN tbl_membership_plans mp ON um.plan_id = mp.id
        LEFT JOIN (
          SELECT 
            business_id,
            AVG(rating) as avg_rating,
            COUNT(*) as review_count
          FROM tbl_reviews
          WHERE is_active = TRUE AND is_deleted = FALSE
          GROUP BY business_id
        ) rev ON o.user_id = rev.business_id
        LEFT JOIN (
          SELECT DISTINCT ON (user_id, offer_id) *
          FROM tbl_saved_offers
          WHERE is_active = TRUE AND is_deleted = FALSE
          ORDER BY user_id, offer_id, id DESC
        ) so ON o.id = so.offer_id AND so.user_id = $${paramIndex}
        LEFT JOIN (
          SELECT DISTINCT ON (user_id, business_id) *
          FROM tbl_user_subscriptions
          WHERE is_active = TRUE AND is_deleted = FALSE
          ORDER BY user_id, business_id, id DESC
        ) us ON o.user_id = us.business_id AND us.user_id = $${paramIndex}
        ${joinConditions.join(" ")}
        WHERE ${whereConditions.join(" AND ")}
        GROUP BY o.id, u.id, oc.id, osc.id, bsc.id, mp.id, rev.avg_rating, rev.review_count, so.id, us.id
        ORDER BY ${orderBy}
        LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
      `;

      // Count query
      const countQuery = `
        SELECT COUNT(DISTINCT o.id) as total
        FROM tbl_offers o
        JOIN tbl_users u ON o.user_id = u.id AND u.is_active = TRUE AND u.is_deleted = FALSE
        ${joinConditions.join(" ")}
        WHERE ${whereConditions.join(" AND ")}
      `;

      queryParams.push(user_id, limit, offset);

      console.log("List Offers Query:", mainQuery, queryParams);

      const [offersResult, countResult] = await Promise.all([
        pool.query(mainQuery, queryParams),
        // pool.query(countQuery, queryParams.slice(0, -2)),
      ]);

      const offers = offersResult.rows;
      // console.log("Offers Result:", offers);
      // const total = Number.parseInt(countResult.rows[0].total);

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          offers,
          // pagination: {
          //   current_page: page,
          //   total_pages: Math.ceil(total / limit),
          //   has_next: page < Math.ceil(total / limit),
          //   has_prev: page > 1,
          // },
        }
      );
    } catch (err) {
      console.error("List Offers Error:", err);
      return sendResponse(
        req,
        res,
        500,
        responseCode.OPERATION_FAILED,
        { keyword: "failed" },
        err.message
      );
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
                    o.id, o.offer_subcategory_id, o.business_subcategory_id, o.image, o.title, o.subtitle, o.description, o.terms_of_use, o.discount_percentage, o.total_price, o.old_price, o.duration, o.quantity_available, o.is_redeemable_in_store, o.is_delivery_available, o.delivery_fee, o.estimated_delivery_time, o.end_date, o.valid_days, o.offer_latitude, o.offer_longitude, o.available_branches, o.view_count, o.total_redemptions,
                    u.id as business_id, u.username as business_name, u.profile_image as business_image,
                    oc.offer_category_name, osc.offer_subcategory_name,
                    bc.category_name as business_category,
                    mp.has_verified_badge,
                    COALESCE(u.avg_rating, 0) as avg_rating,
                    COUNT(DISTINCT rev.id) as review_count,
                    CASE WHEN so.id IS NOT NULL THEN TRUE ELSE FALSE END as is_saved,
                    CASE WHEN us.id IS NOT NULL THEN TRUE ELSE FALSE END as is_subscribed,
                    CASE WHEN o.user_id = $2 THEN TRUE ELSE FALSE END as is_owner
                FROM tbl_offers o
                JOIN tbl_users u ON o.user_id = u.id AND u.is_active = TRUE AND u.is_deleted = FALSE
                LEFT JOIN tbl_offer_subcategories osc ON o.offer_subcategory_id = osc.id
                LEFT JOIN tbl_offer_categories oc ON osc.offer_category_id = oc.id
                LEFT JOIN tbl_business_categories bc ON o.business_subcategory_id = bc.id
                LEFT JOIN tbl_user_memberships um ON u.id = um.user_id AND um.is_active = TRUE
                LEFT JOIN tbl_membership_plans mp ON um.plan_id = mp.id
                LEFT JOIN tbl_reviews rev ON o.user_id = rev.business_id AND rev.is_active = TRUE AND rev.is_deleted = FALSE
                LEFT JOIN tbl_saved_offers so ON o.id = so.offer_id AND so.user_id = $2 AND so.is_active = TRUE AND so.is_deleted = FALSE
                LEFT JOIN tbl_user_subscriptions us ON o.user_id = us.business_id AND us.user_id = $2 AND us.is_active = TRUE AND us.is_deleted = FALSE
                WHERE o.id = $1 AND o.is_active = TRUE AND o.is_deleted = FALSE
                GROUP BY o.id, u.id, oc.id, osc.id, bc.id, mp.id, so.id, us.id
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
                    u.avg_rating AS avg_rating,
                    osc.offer_subcategory_name
                FROM tbl_offers o
                JOIN tbl_users u ON o.user_id = u.id AND u.is_active = TRUE AND u.is_deleted = FALSE
                LEFT JOIN tbl_reviews rev ON o.user_id = rev.business_id AND rev.is_active = TRUE AND rev.is_deleted = FALSE
                LEFT JOIN tbl_offer_subcategories osc ON o.offer_subcategory_id = osc.id
                WHERE o.business_subcategory_id = $1 AND o.user_id != $2 AND o.id != $3 
                AND o.is_active = TRUE AND o.is_deleted = FALSE AND o.end_date > CURRENT_TIMESTAMP
                GROUP BY o.id, u.id, osc.id
                ORDER BY RANDOM()
                LIMIT 5
            `
      console.log("offer.business_subcategory_id:", offer.business_subcategory_id, "offer.user_id:", offer.user_id, "offer_id:", offer_id)
      const recommendedResult = await pool.query(recommendedQuery, [
        offer.business_subcategory_id,
        user_id,
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
        // Fields that can be updated with limited access
        image,
        description,
        terms_of_use,
        discount_percentage,
        pin_code,
        estimated_delivery_time,
        available_branches,
        valid_times = [],
        user_acknowledgment,
        valid_days,
        quantity_available,
        quantity_per_user,
        // Fields that require full access
        offer_subcategory_id,
        business_subcategory_id,
        title,
        subtitle,
        total_price,
        old_price,
        currency,
        duration,
        is_redeemable_in_store,
        is_delivery_available,
        delivery_fee,
        offer_latitude,
        offer_longitude,
        end_date
      } = req.body

      if (!offer_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_offer_id" }, {})
      }

      if (!user_acknowledgment) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "acknowledgment_required" }, {})
      }

      // Check if user owns the offer
      const ownershipQuery = `
        SELECT id, currency, end_date 
        FROM tbl_offers 
        WHERE id = $1 AND user_id = $2 AND is_active = TRUE AND is_deleted = FALSE
      `
      const ownershipResult = await pool.query(ownershipQuery, [offer_id, user_id])

      if (ownershipResult.rows.length === 0) {
        return sendResponse(req, res, 403, responseCode.OPERATION_FAILED, { keyword: "permission_denied" }, {})
      }

      const currentOffer = ownershipResult.rows[0]

      // Check user's membership for update permissions
      const membershipQuery = `
        SELECT mp.can_update_currency, mp.edit_access
        FROM tbl_user_memberships um
        JOIN tbl_membership_plans mp ON um.plan_id = mp.id
        WHERE um.user_id = $1 AND um.is_active = TRUE AND um.end_date > CURRENT_TIMESTAMP
        ORDER BY um.created_at DESC LIMIT 1
      `
      const membershipResult = await pool.query(membershipQuery, [user_id])
      const membership = membershipResult.rows[0] || {}

      const hasFullEditAccess = membership.edit_access === 'full'
      // console.log("hasFullEditAccess:", hasFullEditAccess, "membership.edit_access:", membership.edit_access)
      // Check if currency update is allowed
      if (currency && currency !== currentOffer.currency && !membership.can_update_currency) {
        return sendResponse(req, res, 403, responseCode.OPERATION_FAILED, { keyword: "currency_update_not_allowed" }, {})
      }

      // Check if trying to update restricted fields without full access
      const restrictedFields = [
        offer_subcategory_id !== undefined && !hasFullEditAccess ? 'offer_subcategory_id' : null,
        business_subcategory_id !== undefined && !hasFullEditAccess ? 'business_subcategory_id' : null,
        title !== undefined && !hasFullEditAccess ? 'title' : null,
        subtitle !== undefined && !hasFullEditAccess ? 'subtitle' : null,
        total_price !== undefined && !hasFullEditAccess ? 'total_price' : null,
        old_price !== undefined && !hasFullEditAccess ? 'old_price' : null,
        duration !== undefined && !hasFullEditAccess ? 'duration' : null,
        is_redeemable_in_store !== undefined && !hasFullEditAccess ? 'is_redeemable_in_store' : null,
        is_delivery_available !== undefined && !hasFullEditAccess ? 'is_delivery_available' : null,
        delivery_fee !== undefined && !hasFullEditAccess ? 'delivery_fee' : null,
        offer_latitude !== undefined && !hasFullEditAccess ? 'offer_latitude' : null,
        offer_longitude !== undefined && !hasFullEditAccess ? 'offer_longitude' : null,
        end_date !== undefined && !hasFullEditAccess ? 'end_date' : null
      ].filter(Boolean)

      if (restrictedFields.length > 0) {
        return sendResponse(req, res, 403, responseCode.OPERATION_FAILED, { 
          keyword: "field_update_not_allowed"
        }, {"restrictedFields": restrictedFields})
      }

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        // Build dynamic update query
        const fields = []
        const values = []
        let idx = 1

        // Always allowed fields (limited access)
        const updateFields = {
          image,
          description,
          terms_of_use,
          discount_percentage,
          pin_code,
          estimated_delivery_time,
          available_branches,
          user_acknowledgment,
          valid_days,
          quantity_available,
          quantity_per_user
        }

        // Fields that require full access
        if (hasFullEditAccess) {
          Object.assign(updateFields, {
            offer_subcategory_id,
            business_subcategory_id,
            title,
            subtitle,
            total_price,
            old_price,
            currency,
            duration,
            is_redeemable_in_store,
            is_delivery_available,
            delivery_fee,
            offer_latitude,
            offer_longitude,
            end_date
          })
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
      // await pool.query(
      //   "UPDATE tbl_user_memberships SET offers_used = offers_used - 1 WHERE user_id = $1 AND is_active = TRUE AND offers_used > 0",
      //   [user_id],
      // )

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

}

module.exports = offer_model
