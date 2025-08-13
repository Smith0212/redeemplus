const { sendResponse } = require("../../middleware")
const pool = require("../../config/database")
const responseCode = require("../../config/responseCode")

const notification_model = {
  async getNotifications(req, res) {
    try {
      const user_id = req.user.id
      const { page = 1, limit = 20, type = "all" } = req.body // all, offer_redeemed, new_subscribers, delivery_request

      const offset = (page - 1) * limit
      const whereConditions = ["n.user_id = $1", "n.is_active = TRUE", "n.is_deleted = FALSE"]
      const queryParams = [user_id]
      let paramIndex = 2

      if (type !== "all") {
        whereConditions.push(`n.type = $${paramIndex}`)
        queryParams.push(type)
        paramIndex++
      }

      const notificationsQuery = `
                SELECT 
                    n.id, n.type, n.title, n.message, n.data, n.is_read, n.created_at,
                    s.id as sender_id, s.username as sender_name, s.profile_image as sender_image
                FROM tbl_notifications n
                LEFT JOIN tbl_users s ON n.sender_id = s.id
                WHERE ${whereConditions.join(" AND ")}
                ORDER BY n.created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `

      const countQuery = `
                SELECT COUNT(*) as total FROM tbl_notifications n
                WHERE ${whereConditions.join(" AND ")}
            `

      const unreadCountQuery = `
                SELECT COUNT(*) as unread_count FROM tbl_notifications n
                WHERE n.user_id = $1 AND n.is_read = FALSE AND n.is_active = TRUE AND n.is_deleted = FALSE
            `

      queryParams.push(limit, offset)

      const [notificationsResult, countResult, unreadResult] = await Promise.all([
        pool.query(notificationsQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2)),
        pool.query(unreadCountQuery, [user_id]),
      ])

      const notifications = notificationsResult.rows
      const total = Number.parseInt(countResult.rows[0].total)
      const unreadCount = Number.parseInt(unreadResult.rows[0].unread_count)

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          notifications,
          unread_count: unreadCount,
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
      console.error("Get Notifications Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async markAsRead(req, res) {
    try {
      const user_id = req.user.id
      const { notification_id } = req.body

      if (!notification_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_notification_id" }, {})
      }

      // Verify ownership and mark as read
      const updateQuery = `
                UPDATE tbl_notifications 
                SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND user_id = $2 AND is_active = TRUE AND is_deleted = FALSE
                RETURNING id
            `

      const result = await pool.query(updateQuery, [notification_id, user_id])

      if (result.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "notification_not_found" }, {})
      }

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "notification_marked_read" },
        { notification_id: result.rows[0].id },
      )
    } catch (err) {
      console.error("Mark Notification as Read Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async markAllAsRead(req, res) {
    try {
      const user_id = req.user.id

      const updateQuery = `
                UPDATE tbl_notifications 
                SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $1 AND is_read = FALSE AND is_active = TRUE AND is_deleted = FALSE
                RETURNING COUNT(*) as updated_count
            `

      const result = await pool.query(updateQuery, [user_id])

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "all_notifications_marked_read" }, {})
    } catch (err) {
      console.error("Mark All Notifications as Read Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async deleteNotification(req, res) {
    try {
      const user_id = req.user.id
      const { notification_id } = req.body

      if (!notification_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_notification_id" }, {})
      }

      // Soft delete notification
      const deleteQuery = `
                UPDATE tbl_notifications 
                SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND user_id = $2 AND is_active = TRUE AND is_deleted = FALSE
                RETURNING id
            `

      const result = await pool.query(deleteQuery, [notification_id, user_id])

      if (result.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "notification_not_found" }, {})
      }

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "notification_deleted" },
        { notification_id: result.rows[0].id },
      )
    } catch (err) {
      console.error("Delete Notification Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getNotificationStats(req, res) {
    try {
      const user_id = req.user.id

      // Get membership info and stats
      const membershipQuery = `
                SELECT 
                    mp.name as membership_name, mp.offer_limit, um.offers_used,
                    um.start_date, um.end_date,
                    CASE 
                        WHEN um.end_date > CURRENT_TIMESTAMP THEN TRUE 
                        ELSE FALSE 
                    END as is_active
                FROM tbl_user_memberships um
                JOIN tbl_membership_plans mp ON um.plan_id = mp.id
                WHERE um.user_id = $1 AND um.is_active = TRUE AND um.is_deleted = FALSE
                ORDER BY um.created_at DESC
                LIMIT 1
            `

      const membershipResult = await pool.query(membershipQuery, [user_id])

      let membership = {
        name: "Bronze",
        offer_limit: 20,
        offers_used: 0,
        remaining_offers: 20,
        validity: "1-Year",
        is_active: true,
      }

      if (membershipResult.rows.length > 0) {
        const m = membershipResult.rows[0]
        membership = {
          name: m.membership_name,
          offer_limit: m.offer_limit,
          offers_used: m.offers_used || 0,
          remaining_offers: m.offer_limit ? Math.max(0, m.offer_limit - (m.offers_used || 0)) : "Unlimited",
          validity: m.is_active
            ? `${Math.ceil((new Date(m.end_date) - new Date()) / (1000 * 60 * 60 * 24))} days left`
            : "Expired",
          is_active: m.is_active,
        }
      }

      // Get financial stats
      const statsQuery = `
                SELECT 
                    COALESCE(SUM(CASE WHEN r.user_id = $1 THEN o.old_price - o.total_price ELSE 0 END), 0) as total_savings,
                    COALESCE(SUM(CASE WHEN o.user_id = $1 THEN r.total_amount ELSE 0 END), 0) as total_earnings,
                    COUNT(CASE WHEN r.user_id = $1 THEN 1 END) as my_redemptions
                FROM tbl_redemptions r
                JOIN tbl_offers o ON r.offer_id = o.id
                WHERE (r.user_id = $1 OR o.user_id = $1) AND r.is_active = TRUE AND r.is_deleted = FALSE
            `

      const statsResult = await pool.query(statsQuery, [user_id])
      const stats = statsResult.rows[0]

      const response = {
        membership,
        financial_stats: {
          total_savings: Number.parseFloat(stats.total_savings).toFixed(2),
          total_earnings: Number.parseFloat(stats.total_earnings).toFixed(2),
          my_redemptions: Number.parseInt(stats.my_redemptions),
        },
      }

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, response)
    } catch (err) {
      console.error("Get Notification Stats Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  // Helper function to create notifications (used by other modules)
  async createNotification(user_id, sender_id, type, title, message, data = {}) {
    try {
      const notificationQuery = `
                INSERT INTO tbl_notifications (user_id, sender_id, type, title, message, data)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `

      const result = await pool.query(notificationQuery, [
        user_id,
        sender_id,
        type,
        title,
        message,
        JSON.stringify(data),
      ])

      return result.rows[0].id
    } catch (err) {
      console.error("Create Notification Error:", err)
      throw err
    }
  },
}

module.exports = notification_model
