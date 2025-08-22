const { sendResponse } = require("../../middleware")
const pool = require("../../config/database")
const responseCode = require("../../config/responseCode")

const redemption_model = {
  async redeemWithPinCode(req, res) {
    try {
      const user_id = req.user.id
      const { offer_id, pin_code, quantity = 1 } = req.body

      if (!offer_id || !pin_code) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_parameters" }, {})
      }

      // Get offer details and validate
      const offerQuery = `
        SELECT 
          o.*, 
          u.username as business_name, 
          u.phone as business_phone,
          mp.redemption_limit as user_redemption_limit,
        FROM tbl_offers o
        JOIN tbl_users u ON o.user_id = u.id
        LEFT JOIN tbl_user_memberships um ON u.id = um.user_id AND um.is_active = TRUE
        LEFT JOIN tbl_membership_plans mp ON mp.id = um.plan_id AND mp.is_active = TRUE
        WHERE o.id = $1 AND o.is_active = TRUE AND o.is_deleted = FALSE 
          AND o.end_date > CURRENT_TIMESTAMP
      `

      const offerResult = await pool.query(offerQuery, [offer_id])

      if (offerResult.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "offer_not_found" }, {})
      }

      const offer = offerResult.rows[0]

      // Validate PIN code
      if (offer.pin_code !== pin_code) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "invalid_pin_code" }, {})
      }

      // Check if offer is redeemable in store
      if (!offer.is_redeemable_in_store) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "not_redeemable_in_store" }, {})
      }

      // Check quantity limits
      if (quantity > offer.quantity_available) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "insufficient_quantity" }, {})
      }

      // Check user redemption limit
      const thisOfferRedemptionQuery = `
        SELECT COALESCE(SUM(quantity), 0) as total_redeemed 
        FROM tbl_redemptions 
        WHERE offer_id = $1 AND user_id = $2 AND is_active = TRUE AND is_deleted = FALSE
      `

      const thisOfferRedemptionResult = await pool.query(thisOfferRedemptionQuery, [offer_id, user_id])
      const thisOfferRedeemed = Number.parseInt(thisOfferRedemptionResult.rows[0].total_redeemed)

      if (thisOfferRedeemed + quantity > offer.quantity_per_user) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "redemption_limit_exceeded" }, {})
      }

      const totalRedemptionQuery = `
        SELECT COALESCE(SUM(quantity), 0) as total_redeemed 
        FROM tbl_redemptions 
        WHERE user_id = $1 AND is_active = TRUE AND is_deleted = FALSE
      `

      const totalRedemptionResult = await pool.query(totalRedemptionQuery, [user_id])
      const totalRedeemed = Number.parseInt(totalRedemptionResult.rows[0].total_redeemed)

      if (totalRedeemed + quantity > offer.user_redemption_limit) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "user_redemption_limit_exceeded" }, {})
      }

      // Check valid days
      const today = new Date().getDay() // 0 = Sunday, 1 = Monday, etc.
      const validDays = offer.valid_days || "1111111"
      if (validDays[today] === "0") {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "offer_not_valid_today" }, {})
      }

      // Check valid times if any
      const currentTime = new Date().toTimeString().slice(0, 5) // HH:MM format
      const validTimesQuery = `
        SELECT * FROM tbl_offer_valid_times 
        WHERE offer_id = $1 AND is_active = TRUE AND is_deleted = FALSE
      `

      const validTimesResult = await pool.query(validTimesQuery, [offer_id])

      if (validTimesResult.rows.length > 0) {
        const isValidTime = validTimesResult.rows.some((time) => {
          return currentTime >= time.valid_time_start && currentTime <= time.valid_time_end
        })

        if (!isValidTime) {
          return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "offer_not_valid_now" }, {})
        }
      }

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        // // Generate confirmation number
        // const confirmationNumber = `RDP${Date.now()}${Math.floor(Math.random() * 1000)
        //   .toString()
        //   .padStart(3, "0")}`

        // Create redemption record
        const redemptionQuery = `
          INSERT INTO tbl_redemptions (
            offer_id, user_id, redemption_method, pin_code, 
            quantity, total_amount
          ) VALUES ($1, $2, 'pin_code', $3, $4, $5)
          RETURNING id
        `

        const totalAmount = offer.total_price * quantity

        const redemptionResult = await client.query(redemptionQuery, [
          offer_id,
          user_id,
          pin_code,
          quantity,
          totalAmount,
        ])

        const redemption = redemptionResult.rows[0]

        // Update offer quantities
        await client.query(
          "UPDATE tbl_offers SET quantity_available = quantity_available - $1, total_redemptions = total_redemptions + $1 WHERE id = $2",
          [quantity, offer_id],
        )

        // Create notification for business owner
        await client.query(
          `INSERT INTO tbl_notifications (user_id, sender_id, type, title, message, data) 
            VALUES ($1, $2, 'offer_redeemed', 'Offer Redeemed', $3, $4)`,
          [
            offer.user_id,
            user_id,
            `Your offer "${offer.title}" has been redeemed`,
            JSON.stringify({
              offer_id,
              redemption_id: redemption.id,
              quantity,
              total_amount: totalAmount,
            }),
          ],
        )

        await client.query("COMMIT")

        return sendResponse(
          req,
          res,
          200,
          responseCode.SUCCESS,
          { keyword: "redemption_successful" },
          {
            redemption_id: redemption.id,
            // confirmation_number: redemption.confirmation_number,
            offer_title: offer.title,
            business_name: offer.business_name,
            quantity,
            total_amount: totalAmount,
          },
        )
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }
    } catch (err) {
      console.error("Redeem with PIN Code Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async requestDelivery(req, res) {
    try {
      const user_id = req.user.id
      const { offer_id, delivery_address_id, quantity = 1, message } = req.body

      if (!offer_id || !delivery_address_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_parameters" }, {})
      }

      // Get offer details
      const offerQuery = `
                SELECT 
                    o.*, u.username as business_name, u.phone as business_phone
                FROM tbl_offers o
                JOIN tbl_users u ON o.user_id = u.id
                WHERE o.id = $1 AND o.is_active = TRUE AND o.is_deleted = FALSE 
                AND o.end_date > CURRENT_TIMESTAMP
            `

      const offerResult = await pool.query(offerQuery, [offer_id])

      if (offerResult.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "offer_not_found" }, {})
      }

      const offer = offerResult.rows[0]

      // Check if delivery is available
      if (!offer.is_delivery_available) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "delivery_not_available" }, {})
      }

      // Validate delivery address belongs to user
      const addressQuery = `
                SELECT * FROM tbl_delivery_addresses 
                WHERE id = $1 AND user_id = $2 AND is_active = TRUE AND is_deleted = FALSE
            `

      const addressResult = await pool.query(addressQuery, [delivery_address_id, user_id])

      if (addressResult.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "address_not_found" }, {})
      }

      const address = addressResult.rows[0]

      // Check quantity and user limits (same as PIN code redemption)
      // Check quantity limits
      if (quantity > offer.quantity_available) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "insufficient_quantity" }, {})
      }

      // Check user redemption limit
      const thisOfferRedemptionQuery = `
        SELECT COALESCE(SUM(quantity), 0) as total_redeemed 
        FROM tbl_redemptions 
        WHERE offer_id = $1 AND user_id = $2 AND is_active = TRUE AND is_deleted = FALSE
      `

      const thisOfferRedemptionResult = await pool.query(thisOfferRedemptionQuery, [offer_id, user_id])
      const thisOfferRedeemed = Number.parseInt(thisOfferRedemptionResult.rows[0].total_redeemed)

      if (thisOfferRedeemed + quantity > offer.quantity_per_user) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "redemption_limit_exceeded" }, {})
      }

      const totalRedemptionQuery = `
        SELECT COALESCE(SUM(quantity), 0) as total_redeemed 
        FROM tbl_redemptions 
        WHERE user_id = $1 AND is_active = TRUE AND is_deleted = FALSE
      `

      const totalRedemptionResult = await pool.query(totalRedemptionQuery, [user_id])
      const totalRedeemed = Number.parseInt(totalRedemptionResult.rows[0].total_redeemed)

      if (totalRedeemed + quantity > offer.user_redemption_limit) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "user_redemption_limit_exceeded" }, {})
      }

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        // // Generate confirmation number
        // const confirmationNumber = `RDD${Date.now()}${Math.floor(Math.random() * 1000)
        //   .toString()
        //   .padStart(3, "0")}`

        // Create redemption record
        const redemptionQuery = `
                    INSERT INTO tbl_redemptions (
                        offer_id, user_id, redemption_method, 
                        quantity, total_amount
                    ) VALUES ($1, $2, 'delivery', $3, $4)
                    RETURNING id
                `

        const totalAmount = Number(offer.total_price) * quantity + (Number(offer.delivery_fee) || 0)

        const redemptionResult = await client.query(redemptionQuery, [
          offer_id,
          user_id,
          // confirmationNumber,
          quantity,
          totalAmount,
        ])

        const redemption = redemptionResult.rows[0]

        // Create delivery record
        const deliveryQuery = `
                    INSERT INTO tbl_redemption_deliveries (
                        redemption_id, delivery_address_id, delivery_fee, 
                        estimated_delivery_time, message
                    ) VALUES ($1, $2, $3, $4, $5)
                    RETURNING id
                `

        await client.query(deliveryQuery, [
          redemption.id,
          delivery_address_id,
          offer.delivery_fee || 0,
          offer.estimated_delivery_time,
          message,
        ])

        // Create notification for business owner
        await client.query(
          `INSERT INTO tbl_notifications (user_id, sender_id, type, title, message, data) 
                     VALUES ($1, $2, 'delivery_request', 'New Delivery Request', $3, $4)`,
          [
            offer.user_id,
            user_id,
            `New delivery request for "${offer.title}"`,
            JSON.stringify({
              offer_id,
              redemption_id: redemption.id,
              quantity,
              total_amount: totalAmount,
              delivery_address: address.address,
            }),
          ],
        )

        await client.query("COMMIT")

        return sendResponse(
          req,
          res,
          200,
          responseCode.SUCCESS,
          { keyword: "delivery_request_sent" },
          {
            redemption_id: redemption.id,
            offer_image: offer.image,
            offer_title: offer.title,
            offer_subtitle: offer.subtitle,
            total_price: offer.total_price,
            quantity,
            status: "pending",
            business: {
              name: offer.business_name,
              profile_image: offer.business_profile_image,
              badge_flag: offer.business_badge_flag,
              social_links: offer.business_social_links,
              avg_rating: offer.business_avg_rating,
              is_subscribe: offer.business_is_subscribe,
              latitude: offer.business_latitude,
              longitude: offer.business_longitude,
            },
          }
        )
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }
    } catch (err) {
      console.error("Request Delivery Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getDeliveryRequests(req, res) {
    try {
      const user_id = req.user.id
      const { page = 1, limit = 10, status = "all" } = req.body // all, pending, approved, rejected, delivered

      const offset = (page - 1) * limit
      const whereConditions = ["o.user_id = $1", "r.redemption_method = 'delivery'"]
      const queryParams = [user_id]
      let paramIndex = 2

      if (status !== "all") {
        whereConditions.push(`rd.status = $${paramIndex}`)
        queryParams.push(status)
        paramIndex++
      }

      const requestsQuery = `
        SELECT 
          r.id as redemption_id, r.quantity, r.total_amount, r.created_at,
          o.id as offer_id, o.title as offer_title, o.image as offer_image,
          u.id as customer_id, u.username as customer_name, u.profile_image as customer_image,
          u.phone as customer_phone,
          da.address, da.phone_number as delivery_phone,
          rd.id as delivery_id, rd.delivery_fee, rd.estimated_delivery_time, 
          rd.status, rd.message, rd.rejection_reason, rd.accepted_at, rd.delivered_at,
          rd.delivery_address_id
        FROM tbl_redemptions r
        JOIN tbl_offers o ON r.offer_id = o.id
        JOIN tbl_users u ON r.user_id = u.id
        JOIN tbl_redemption_deliveries rd ON r.id = rd.redemption_id
        JOIN tbl_delivery_addresses da ON rd.delivery_address_id = da.id
        WHERE ${whereConditions.join(" AND ")} AND r.is_active = TRUE AND r.is_deleted = FALSE
        ORDER BY r.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `

      const countQuery = `
        SELECT COUNT(*) as total FROM tbl_redemptions r
        JOIN tbl_offers o ON r.offer_id = o.id
        JOIN tbl_redemption_deliveries rd ON r.id = rd.redemption_id
        WHERE ${whereConditions.join(" AND ")} AND r.is_active = TRUE AND r.is_deleted = FALSE
      `

      queryParams.push(limit, offset)

      const [requestsResult, countResult] = await Promise.all([
        pool.query(requestsQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2)),
      ])

      const requests = requestsResult.rows
      const total = Number.parseInt(countResult.rows[0].total)

      // Fetch all tbl_redemption_deliveries for these redemption_ids
      const redemptionIds = requests.map(r => r.redemption_id)
      let deliveries = []
      if (redemptionIds.length > 0) {
        const deliveriesQuery = `
          SELECT * FROM tbl_redemption_deliveries
          WHERE redemption_id = ANY($1)
        `
        const deliveriesResult = await pool.query(deliveriesQuery, [redemptionIds])
        deliveries = deliveriesResult.rows
      }

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          requests,
          deliveries, // all related tbl_redemption_deliveries data
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
      console.error("Get Delivery Requests Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async approveDeliveryRequest(req, res) {
    try {
      const user_id = req.user.id
      const { redemption_id } = req.body

      if (!redemption_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_redemption_id" }, {})
      }

      // Verify ownership and get details
      const verifyQuery = `
                SELECT r.*, rd.id as delivery_id, o.user_id as business_id, o.title as offer_title,
                       u.username as customer_name
                FROM tbl_redemptions r
                JOIN tbl_offers o ON r.offer_id = o.id
                JOIN tbl_redemption_deliveries rd ON r.id = rd.redemption_id
                JOIN tbl_users u ON r.user_id = u.id
                WHERE r.id = $1 AND o.user_id = $2 AND rd.status = 'pending'
            `

      const verifyResult = await pool.query(verifyQuery, [redemption_id, user_id])

      if (verifyResult.rows.length === 0) {
        return sendResponse(req, res, 403, responseCode.OPERATION_FAILED, { keyword: "permission_denied" }, {})
      }

      const request = verifyResult.rows[0]

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        // Update delivery status
        await client.query(
          "UPDATE tbl_redemption_deliveries SET status = 'approved', accepted_at = CURRENT_TIMESTAMP WHERE redemption_id = $1",
          [redemption_id],
        )

        // Update offer quantities
        await client.query(
          "UPDATE tbl_offers SET quantity_available = quantity_available - $1, total_redemptions = total_redemptions + $1 WHERE id = $2",
          [request.quantity, request.offer_id],
        )

        // Create notification for customer
        await client.query(
          `INSERT INTO tbl_notifications (user_id, sender_id, type, title, message, data) 
                     VALUES ($1, $2, 'delivery_approved', 'Delivery Approved', $3, $4)`,
          [
            request.user_id,
            user_id,
            `Your delivery request for "${request.offer_title}" has been approved`,
            JSON.stringify({
              redemption_id,
              offer_id: request.offer_id,
            }),
          ],
        )

        await client.query("COMMIT")

        return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "delivery_approved" }, { redemption_id })
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }
    } catch (err) {
      console.error("Approve Delivery Request Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async rejectDeliveryRequest(req, res) {
    try {
      const user_id = req.user.id
      const { redemption_id, rejection_reason } = req.body

      if (!redemption_id || !rejection_reason) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_parameters" }, {})
      }

      // Verify ownership
      const verifyQuery = `
                SELECT r.*, o.user_id as business_id, o.title as offer_title
                FROM tbl_redemptions r
                JOIN tbl_offers o ON r.offer_id = o.id
                JOIN tbl_redemption_deliveries rd ON r.id = rd.redemption_id
                WHERE r.id = $1 AND o.user_id = $2 AND rd.status = 'pending'
            `

      const verifyResult = await pool.query(verifyQuery, [redemption_id, user_id])

      if (verifyResult.rows.length === 0) {
        return sendResponse(req, res, 403, responseCode.OPERATION_FAILED, { keyword: "permission_denied" }, {})
      }

      const request = verifyResult.rows[0]

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        // Update delivery status
        await client.query(
          "UPDATE tbl_redemption_deliveries SET status = 'rejected', rejection_reason = $1 WHERE redemption_id = $2",
          [rejection_reason, redemption_id],
        )

        // Create notification for customer
        await client.query(
          `INSERT INTO tbl_notifications (user_id, sender_id, type, title, message, data) 
                     VALUES ($1, $2, 'delivery_rejected', 'Delivery Request Rejected', $3, $4)`,
          [
            request.user_id,
            user_id,
            `Your delivery request for "${request.offer_title}" has been rejected: ${rejection_reason}`,
            JSON.stringify({
              redemption_id,
              offer_id: request.offer_id,
              rejection_reason,
            }),
          ],
        )

        await client.query("COMMIT")

        return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "delivery_rejected" }, { redemption_id })
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }
    } catch (err) {
      console.error("Reject Delivery Request Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async markAsDelivered(req, res) {
    try {
      const user_id = req.user.id
      const { redemption_id } = req.body

      if (!redemption_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_redemption_id" }, {})
      }

      // Verify ownership
      const verifyQuery = `
                SELECT r.*, o.user_id as business_id, o.title as offer_title
                FROM tbl_redemptions r
                JOIN tbl_offers o ON r.offer_id = o.id
                JOIN tbl_redemption_deliveries rd ON r.id = rd.redemption_id
                WHERE r.id = $1 AND o.user_id = $2 AND rd.status = 'approved'
            `

      const verifyResult = await pool.query(verifyQuery, [redemption_id, user_id])

      if (verifyResult.rows.length === 0) {
        return sendResponse(req, res, 403, responseCode.OPERATION_FAILED, { keyword: "permission_denied" }, {})
      }

      const request = verifyResult.rows[0]

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        // Update delivery status
        await client.query(
          "UPDATE tbl_redemption_deliveries SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP WHERE redemption_id = $1",
          [redemption_id],
        )

        // Create notification for customer
        await client.query(
          `INSERT INTO tbl_notifications (user_id, sender_id, type, title, message, data) 
                     VALUES ($1, $2, 'delivery_completed', 'Order Delivered', $3, $4)`,
          [
            request.user_id,
            user_id,
            `Your order for "${request.offer_title}" has been delivered`,
            JSON.stringify({
              redemption_id,
              offer_id: request.offer_id,
            }),
          ],
        )

        await client.query("COMMIT")

        return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "marked_as_delivered" }, { redemption_id })
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }
    } catch (err) {
      console.error("Mark as Delivered Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getMyRedemptions(req, res) {
    try {
      const user_id = req.user.id
      const { page = 1, limit = 10, type = "all" } = req.body // all, pin_code, delivery

      const offset = (page - 1) * limit
      const whereConditions = ["r.user_id = $1", "r.is_active = TRUE", "r.is_deleted = FALSE"]
      const queryParams = [user_id]
      let paramIndex = 2

      if (type !== "all") {
        whereConditions.push(`r.redemption_method = $${paramIndex}`)
        queryParams.push(type)
        paramIndex++
      }

      const redemptionsQuery = `
                SELECT 
                    r.id, r.redemption_method, r.quantity, 
                    r.total_amount, r.created_at,
                    o.id as offer_id, o.title as offer_title, o.image as offer_image,
                    u.id as business_id, u.username as business_name, u.profile_image as business_image,
                    CASE 
                        WHEN r.redemption_method = 'delivery' THEN rd.status
                        ELSE 'completed'
                    END as status,
                    rd.delivered_at, rd.rejection_reason
                FROM tbl_redemptions r
                JOIN tbl_offers o ON r.offer_id = o.id
                JOIN tbl_users u ON o.user_id = u.id
                LEFT JOIN tbl_redemption_deliveries rd ON r.id = rd.redemption_id
                WHERE ${whereConditions.join(" AND ")}
                ORDER BY r.created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `

      const countQuery = `
                SELECT COUNT(*) as total FROM tbl_redemptions r
                WHERE ${whereConditions.join(" AND ")}
            `

      queryParams.push(limit, offset)

      const [redemptionsResult, countResult] = await Promise.all([
        pool.query(redemptionsQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2)),
      ])

      const redemptions = redemptionsResult.rows
      const total = Number.parseInt(countResult.rows[0].total)

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          redemptions,
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
      console.error("Get My Redemptions Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getRedemptionDetails(req, res) {
    try {
      const user_id = req.user.id
      const { redemption_id } = req.body

      if (!redemption_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_redemption_id" }, {})
      }

      const detailsQuery = `
                SELECT 
                    r.*, 
                    o.id as offer_id, o.title as offer_title, o.image as offer_image,
                    o.description as offer_description,
                    u.id as business_id, u.username as business_name, u.profile_image as business_image,
                    u.phone as business_phone,
                    rd.delivery_address_id, rd.delivery_fee, rd.estimated_delivery_time,
                    rd.status as delivery_status, rd.message, rd.rejection_reason,
                    rd.accepted_at, rd.delivered_at,
                    da.address, da.phone_number as delivery_phone
                FROM tbl_redemptions r
                JOIN tbl_offers o ON r.offer_id = o.id
                JOIN tbl_users u ON o.user_id = u.id
                LEFT JOIN tbl_redemption_deliveries rd ON r.id = rd.redemption_id
                LEFT JOIN tbl_delivery_addresses da ON rd.delivery_address_id = da.id
                WHERE r.id = $1 AND (r.user_id = $2 OR o.user_id = $2) 
                AND r.is_active = TRUE AND r.is_deleted = FALSE
            `

      const { rows } = await pool.query(detailsQuery, [redemption_id, user_id])

      if (rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "redemption_not_found" }, {})
      }

      const redemption = rows[0]

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, redemption)
    } catch (err) {
      console.error("Get Redemption Details Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },
}

module.exports = redemption_model
