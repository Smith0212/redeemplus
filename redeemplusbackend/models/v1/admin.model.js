const { sendResponse } = require("../../middleware")
const pool = require("../../config/database")
const responseCode = require("../../config/responseCode")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")

const admin_model = {
  // Admin Login
  async login(req, res) {
    try {
      const { email, password } = req.body

      // Check admin credentials (you can use environment variables or database)
      const adminEmail = process.env.ADMIN_EMAIL || "admin@redeemplus.com"
      const adminPassword = process.env.ADMIN_PASSWORD || "admin123"

      if (email !== adminEmail || password !== adminPassword) {
        return sendResponse(req, res, 401, responseCode.OPERATION_FAILED, { keyword: "invalid_credentials" }, {})
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: "admin",
          email: adminEmail,
          role: "admin",
        },
        process.env.JWT_SECRET || "your_jwt_secret",
        { expiresIn: "24h" },
      )

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "login_successful" },
        {
          token,
          admin: {
            email: adminEmail,
            role: "admin",
          },
        },
      )
    } catch (err) {
      console.error("Admin Login Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  // Dashboard Statistics
  async getDashboardStats(req, res) {
    try {
      // Get total counts
      const totalUsersQuery = "SELECT COUNT(*) as count FROM tbl_users WHERE is_deleted = FALSE"
      const totalBusinessesQuery =
        "SELECT COUNT(*) as count FROM tbl_users WHERE account_type = 'business' AND is_deleted = FALSE"
      const totalOffersQuery = "SELECT COUNT(*) as count FROM tbl_offers WHERE is_deleted = FALSE"
      const totalReportsQuery = "SELECT COUNT(*) as count FROM tbl_reports WHERE is_deleted = FALSE"
      const pendingReportsQuery =
        "SELECT COUNT(*) as count FROM tbl_reports WHERE status = 'pending' AND is_deleted = FALSE"
      const activeOffersQuery = "SELECT COUNT(*) as count FROM tbl_offers WHERE is_active = TRUE AND is_deleted = FALSE"

      const [totalUsers, totalBusinesses, totalOffers, totalReports, pendingReports, activeOffers] = await Promise.all([
        pool.query(totalUsersQuery),
        pool.query(totalBusinessesQuery),
        pool.query(totalOffersQuery),
        pool.query(totalReportsQuery),
        pool.query(pendingReportsQuery),
        pool.query(activeOffersQuery),
      ])

      // Get recent activity
      const recentActivityQuery = `
        SELECT 
          'user' as type,
          u.username as title,
          'New user registered' as description,
          u.created_at as timestamp
        FROM tbl_users u
        WHERE u.is_deleted = FALSE
        UNION ALL
        SELECT 
          'offer' as type,
          o.title as title,
          'New offer created' as description,
          o.created_at as timestamp
        FROM tbl_offers o
        WHERE o.is_deleted = FALSE
        UNION ALL
        SELECT 
          'report' as type,
          CONCAT('Report #', r.ticket_number) as title,
          'New report submitted' as description,
          r.created_at as timestamp
        FROM tbl_reports r
        WHERE r.is_deleted = FALSE
        ORDER BY timestamp DESC
        LIMIT 10
      `

      const recentActivity = await pool.query(recentActivityQuery)

      // Get monthly user registrations for chart
      const monthlyUsersQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as count
        FROM tbl_users
        WHERE is_deleted = FALSE
          AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month
      `

      const monthlyUsers = await pool.query(monthlyUsersQuery)

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "stats_retrieved" },
        {
          stats: {
            totalUsers: Number.parseInt(totalUsers.rows[0].count),
            totalBusinesses: Number.parseInt(totalBusinesses.rows[0].count),
            totalOffers: Number.parseInt(totalOffers.rows[0].count),
            totalReports: Number.parseInt(totalReports.rows[0].count),
            pendingReports: Number.parseInt(pendingReports.rows[0].count),
            activeOffers: Number.parseInt(activeOffers.rows[0].count),
          },
          recentActivity: recentActivity.rows,
          monthlyUsers: monthlyUsers.rows,
        },
      )
    } catch (err) {
      console.error("Dashboard Stats Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  // Get Users List
  async getUsers(req, res) {
    try {
      const { page = 1, limit = 10, search = "", account_type = "", status = "" } = req.body

      const offset = (page - 1) * limit
      const whereConditions = ["u.is_deleted = FALSE"]
      const queryParams = []
      let paramIndex = 1

      // Add search condition
      if (search) {
        whereConditions.push(`(u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`)
        queryParams.push(`%${search}%`)
        paramIndex++
      }

      // Add account type filter
      if (account_type) {
        whereConditions.push(`u.account_type = $${paramIndex}`)
        queryParams.push(account_type)
        paramIndex++
      }

      // Add status filter
      if (status === "active") {
        whereConditions.push("u.is_active = TRUE")
      } else if (status === "inactive") {
        whereConditions.push("u.is_active = FALSE")
      }

      const whereClause = whereConditions.join(" AND ")

      // Get users with business category info
      const usersQuery = `
        SELECT 
          u.id,
          u.username,
          u.email,
          u.phone,
          u.country_code,
          u.account_type,
          u.profile_image,
          u.is_verified,
          u.is_active,
          u.avg_rating,
          u.business_address,
          u.created_at,
          u.updated_at,
          bc.category_name as business_category,
          bsc.subcategory_name as business_subcategory,
          COUNT(o.id) as total_offers,
          COUNT(CASE WHEN o.is_active = TRUE THEN 1 END) as active_offers
        FROM tbl_users u
        LEFT JOIN tbl_business_subcategories bsc ON u.business_subcategory_id = bsc.id
        LEFT JOIN tbl_business_categories bc ON bsc.category_id = bc.id
        LEFT JOIN tbl_offers o ON u.id = o.user_id AND o.is_deleted = FALSE
        WHERE ${whereClause}
        GROUP BY u.id, bc.category_name, bsc.subcategory_name
        ORDER BY u.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `

      queryParams.push(limit, offset)

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM tbl_users u
        WHERE ${whereClause}
      `

      const [users, totalCount] = await Promise.all([
        pool.query(usersQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2)), // Remove limit and offset for count
      ])

      const totalPages = Math.ceil(totalCount.rows[0].total / limit)

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "users_retrieved" },
        {
          users: users.rows,
          pagination: {
            currentPage: Number.parseInt(page),
            totalPages,
            totalItems: Number.parseInt(totalCount.rows[0].total),
            itemsPerPage: Number.parseInt(limit),
          },
        },
      )
    } catch (err) {
      console.error("Get Users Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  // Get User Details
  async getUserDetails(req, res) {
    try {
      const { user_id } = req.body

      if (!user_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_user_id" }, {})
      }

      // Get user details with related information
      const userQuery = `
        SELECT 
          u.*,
          bc.category_name as business_category,
          bsc.subcategory_name as business_subcategory,
          um.plan_id,
          um.start_date as membership_start,
          um.end_date as membership_end,
          mp.name as membership_plan
        FROM tbl_users u
        LEFT JOIN tbl_business_subcategories bsc ON u.business_subcategory_id = bsc.id
        LEFT JOIN tbl_business_categories bc ON bsc.category_id = bc.id
        LEFT JOIN tbl_user_memberships um ON u.id = um.user_id AND um.is_active = TRUE
        LEFT JOIN tbl_membership_plans mp ON um.plan_id = mp.id
        WHERE u.id = $1 AND u.is_deleted = FALSE
      `

      // Get user's offers
      const offersQuery = `
        SELECT 
          o.id,
          o.title,
          o.total_price,
          o.currency,
          o.quantity_available,
          o.total_redemptions,
          o.is_active,
          o.created_at,
          osc.offer_subcategory_name
        FROM tbl_offers o
        LEFT JOIN tbl_offer_subcategories osc ON o.offer_subcategory_id = osc.id
        WHERE o.user_id = $1 AND o.is_deleted = FALSE
        ORDER BY o.created_at DESC
        LIMIT 10
      `

      // Get user's reviews (if business)
      const reviewsQuery = `
        SELECT 
          r.id,
          r.rating,
          r.review,
          r.created_at,
          u.username as reviewer_name
        FROM tbl_reviews r
        JOIN tbl_users u ON r.user_id = u.id
        WHERE r.business_id = $1 AND r.is_deleted = FALSE
        ORDER BY r.created_at DESC
        LIMIT 10
      `

      const [userResult, offersResult, reviewsResult] = await Promise.all([
        pool.query(userQuery, [user_id]),
        pool.query(offersQuery, [user_id]),
        pool.query(reviewsQuery, [user_id]),
      ])

      if (userResult.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "user_not_found" }, {})
      }

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "user_details_retrieved" },
        {
          user: userResult.rows[0],
          offers: offersResult.rows,
          reviews: reviewsResult.rows,
        },
      )
    } catch (err) {
      console.error("Get User Details Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  // Update User Status
  async updateUserStatus(req, res) {
    try {
      const { user_id, status } = req.body

      if (!user_id || !status) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_parameters" }, {})
      }

      const validStatuses = ["active", "inactive", "suspended"]
      if (!validStatuses.includes(status)) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "invalid_status" }, {})
      }

      const is_active = status === "active"

      const updateQuery = `
        UPDATE tbl_users 
        SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2 AND is_deleted = FALSE
        RETURNING id, username, email, is_active
      `

      const result = await pool.query(updateQuery, [is_active, user_id])

      if (result.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "user_not_found" }, {})
      }

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "user_status_updated" },
        {
          user: result.rows[0],
        },
      )
    } catch (err) {
      console.error("Update User Status Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  // Delete User
  async deleteUser(req, res) {
    try {
      const { user_id } = req.body

      if (!user_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_user_id" }, {})
      }

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        // Soft delete user
        await client.query("UPDATE tbl_users SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1", [
          user_id,
        ])

        // Soft delete user's offers
        await client.query(
          "UPDATE tbl_offers SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1",
          [user_id],
        )

        // Deactivate user's memberships
        await client.query(
          "UPDATE tbl_user_memberships SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1",
          [user_id],
        )

        await client.query("COMMIT")

        return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "user_deleted" }, {})
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }
    } catch (err) {
      console.error("Delete User Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  // Get Offers List
  async getOffers(req, res) {
    try {
      const { page = 1, limit = 10, search = "", status = "", user_id = "" } = req.body

      const offset = (page - 1) * limit
      const whereConditions = ["o.is_deleted = FALSE"]
      const queryParams = []
      let paramIndex = 1

      // Add search condition
      if (search) {
        whereConditions.push(`(o.title ILIKE $${paramIndex} OR o.description ILIKE $${paramIndex})`)
        queryParams.push(`%${search}%`)
        paramIndex++
      }

      // Add status filter
      if (status === "active") {
        whereConditions.push("o.is_active = TRUE")
      } else if (status === "inactive") {
        whereConditions.push("o.is_active = FALSE")
      }

      // Add user filter
      if (user_id) {
        whereConditions.push(`o.user_id = $${paramIndex}`)
        queryParams.push(user_id)
        paramIndex++
      }

      const whereClause = whereConditions.join(" AND ")

      const offersQuery = `
        SELECT 
          o.id,
          o.title,
          o.subtitle,
          o.total_price,
          o.old_price,
          o.currency,
          o.discount_percentage,
          o.quantity_available,
          o.total_redemptions,
          o.view_count,
          o.is_active,
          o.start_date,
          o.end_date,
          o.created_at,
          u.username as business_name,
          u.email as business_email,
          osc.offer_subcategory_name,
          oc.offer_category_name
        FROM tbl_offers o
        JOIN tbl_users u ON o.user_id = u.id
        LEFT JOIN tbl_offer_subcategories osc ON o.offer_subcategory_id = osc.id
        LEFT JOIN tbl_offer_categories oc ON osc.offer_category_id = oc.id
        WHERE ${whereClause}
        ORDER BY o.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `

      queryParams.push(limit, offset)

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM tbl_offers o
        WHERE ${whereClause}
      `

      const [offers, totalCount] = await Promise.all([
        pool.query(offersQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2)),
      ])

      const totalPages = Math.ceil(totalCount.rows[0].total / limit)

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "offers_retrieved" },
        {
          offers: offers.rows,
          pagination: {
            currentPage: Number.parseInt(page),
            totalPages,
            totalItems: Number.parseInt(totalCount.rows[0].total),
            itemsPerPage: Number.parseInt(limit),
          },
        },
      )
    } catch (err) {
      console.error("Get Offers Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  // Get Offer Details
  async getOfferDetails(req, res) {
    try {
      const { offer_id } = req.body

      if (!offer_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_offer_id" }, {})
      }

      const offerQuery = `
        SELECT 
          o.*,
          u.username as business_name,
          u.email as business_email,
          u.phone as business_phone,
          u.business_address,
          osc.offer_subcategory_name,
          oc.offer_category_name
        FROM tbl_offers o
        JOIN tbl_users u ON o.user_id = u.id
        LEFT JOIN tbl_offer_subcategories osc ON o.offer_subcategory_id = osc.id
        LEFT JOIN tbl_offer_categories oc ON osc.offer_category_id = oc.id
        WHERE o.id = $1 AND o.is_deleted = FALSE
      `

      // Get offer redemptions
      const redemptionsQuery = `
        SELECT 
          r.id,
          r.quantity,
          r.total_amount,
          r.redemption_method,
          r.created_at,
          u.username as redeemer_name,
          u.email as redeemer_email
        FROM tbl_redemptions r
        JOIN tbl_users u ON r.user_id = u.id
        WHERE r.offer_id = $1 AND r.is_deleted = FALSE
        ORDER BY r.created_at DESC
        LIMIT 10
      `

      const [offerResult, redemptionsResult] = await Promise.all([
        pool.query(offerQuery, [offer_id]),
        pool.query(redemptionsQuery, [offer_id]),
      ])

      if (offerResult.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "offer_not_found" }, {})
      }

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "offer_details_retrieved" },
        {
          offer: offerResult.rows[0],
          redemptions: redemptionsResult.rows,
        },
      )
    } catch (err) {
      console.error("Get Offer Details Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  // Update Offer Status
  async updateOfferStatus(req, res) {
    try {
      const { offer_id, status } = req.body

      if (!offer_id || !status) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_parameters" }, {})
      }

      const validStatuses = ["active", "inactive"]
      if (!validStatuses.includes(status)) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "invalid_status" }, {})
      }

      const is_active = status === "active"

      const updateQuery = `
        UPDATE tbl_offers 
        SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2 AND is_deleted = FALSE
        RETURNING id, title, is_active
      `

      const result = await pool.query(updateQuery, [is_active, offer_id])

      if (result.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "offer_not_found" }, {})
      }

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "offer_status_updated" },
        {
          offer: result.rows[0],
        },
      )
    } catch (err) {
      console.error("Update Offer Status Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  // Get Reports List
  async getReports(req, res) {
    try {
      const { page = 1, limit = 10, search = "", status = "", report_type = "" } = req.body

      const offset = (page - 1) * limit
      const whereConditions = ["r.is_deleted = FALSE"]
      const queryParams = []
      let paramIndex = 1

      // Add search condition
      if (search) {
        whereConditions.push(`(r.ticket_number ILIKE $${paramIndex} OR r.additional_details ILIKE $${paramIndex})`)
        queryParams.push(`%${search}%`)
        paramIndex++
      }

      // Add status filter
      if (status) {
        whereConditions.push(`r.status = $${paramIndex}`)
        queryParams.push(status)
        paramIndex++
      }

      // Add report type filter
      if (report_type) {
        whereConditions.push(`r.report_type = $${paramIndex}`)
        queryParams.push(report_type)
        paramIndex++
      }

      const whereClause = whereConditions.join(" AND ")

      const reportsQuery = `
        SELECT 
          r.id,
          r.ticket_number,
          r.report_type,
          r.status,
          r.additional_details,
          r.admin_notes,
          r.created_at,
          r.resolved_at,
          reporter.username as reporter_name,
          reporter.email as reporter_email,
          reported_user.username as reported_user_name,
          reported_user.email as reported_user_email,
          o.title as reported_offer_title,
          rr.reason as report_reason
        FROM tbl_reports r
        JOIN tbl_users reporter ON r.reporter_id = reporter.id
        LEFT JOIN tbl_users reported_user ON r.reported_user_id = reported_user.id
        LEFT JOIN tbl_offers o ON r.reported_offer_id = o.id
        LEFT JOIN tbl_report_reasons rr ON r.reason_id = rr.id
        WHERE ${whereClause}
        ORDER BY r.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `

      queryParams.push(limit, offset)

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM tbl_reports r
        WHERE ${whereClause}
      `

      const [reports, totalCount] = await Promise.all([
        pool.query(reportsQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2)),
      ])

      const totalPages = Math.ceil(totalCount.rows[0].total / limit)

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "reports_retrieved" },
        {
          reports: reports.rows,
          pagination: {
            currentPage: Number.parseInt(page),
            totalPages,
            totalItems: Number.parseInt(totalCount.rows[0].total),
            itemsPerPage: Number.parseInt(limit),
          },
        },
      )
    } catch (err) {
      console.error("Get Reports Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  // Get Report Details
  async getReportDetails(req, res) {
    try {
      const { report_id } = req.body

      if (!report_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_report_id" }, {})
      }

      const reportQuery = `
        SELECT 
          r.*,
          reporter.username as reporter_name,
          reporter.email as reporter_email,
          reporter.phone as reporter_phone,
          reported_user.username as reported_user_name,
          reported_user.email as reported_user_email,
          reported_user.phone as reported_user_phone,
          o.title as reported_offer_title,
          o.description as reported_offer_description,
          rr.reason as report_reason
        FROM tbl_reports r
        JOIN tbl_users reporter ON r.reporter_id = reporter.id
        LEFT JOIN tbl_users reported_user ON r.reported_user_id = reported_user.id
        LEFT JOIN tbl_offers o ON r.reported_offer_id = o.id
        LEFT JOIN tbl_report_reasons rr ON r.reason_id = rr.id
        WHERE r.id = $1 AND r.is_deleted = FALSE
      `

      // Get voice notes if any
      const voiceNotesQuery = `
        SELECT audio_url, duration_seconds, uploaded_at
        FROM tbl_report_voice_notes
        WHERE report_id = $1
        ORDER BY uploaded_at DESC
      `

      const [reportResult, voiceNotesResult] = await Promise.all([
        pool.query(reportQuery, [report_id]),
        pool.query(voiceNotesQuery, [report_id]),
      ])

      if (reportResult.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "report_not_found" }, {})
      }

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "report_details_retrieved" },
        {
          report: reportResult.rows[0],
          voiceNotes: voiceNotesResult.rows,
        },
      )
    } catch (err) {
      console.error("Get Report Details Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  // Update Report Status
  async updateReportStatus(req, res) {
    try {
      const { report_id, status, admin_notes = "" } = req.body

      if (!report_id || !status) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_parameters" }, {})
      }

      const validStatuses = ["pending", "reviewed", "resolved", "dismissed"]
      if (!validStatuses.includes(status)) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "invalid_status" }, {})
      }

      const resolved_at = status === "resolved" ? new Date() : null

      const updateQuery = `
        UPDATE tbl_reports 
        SET status = $1, admin_notes = $2, resolved_at = $3, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $4 AND is_deleted = FALSE
        RETURNING id, ticket_number, status, resolved_at
      `

      const result = await pool.query(updateQuery, [status, admin_notes, resolved_at, report_id])

      if (result.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "report_not_found" }, {})
      }

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "report_status_updated" },
        {
          report: result.rows[0],
        },
      )
    } catch (err) {
      console.error("Update Report Status Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  // Send Notification
  async sendNotification(req, res) {
    try {
      const { recipient_type, recipient_ids = [], title, message, type = "admin" } = req.body

      if (!recipient_type || !title || !message) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_parameters" }, {})
      }

      let targetUserIds = []

      if (recipient_type === "all") {
        // Send to all users
        const allUsersQuery = "SELECT id FROM tbl_users WHERE is_deleted = FALSE AND is_active = TRUE"
        const allUsers = await pool.query(allUsersQuery)
        targetUserIds = allUsers.rows.map((user) => user.id)
      } else if (recipient_type === "businesses") {
        // Send to all businesses
        const businessUsersQuery =
          "SELECT id FROM tbl_users WHERE account_type = 'business' AND is_deleted = FALSE AND is_active = TRUE"
        const businessUsers = await pool.query(businessUsersQuery)
        targetUserIds = businessUsers.rows.map((user) => user.id)
      } else if (recipient_type === "individuals") {
        // Send to all individual users
        const individualUsersQuery =
          "SELECT id FROM tbl_users WHERE account_type = 'individual' AND is_deleted = FALSE AND is_active = TRUE"
        const individualUsers = await pool.query(individualUsersQuery)
        targetUserIds = individualUsers.rows.map((user) => user.id)
      } else if (recipient_type === "specific" && recipient_ids.length > 0) {
        targetUserIds = recipient_ids
      }

      if (targetUserIds.length === 0) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "no_recipients" }, {})
      }

      // Insert notifications for all target users
      const notificationPromises = targetUserIds.map((userId) => {
        const insertQuery = `
          INSERT INTO tbl_notifications (user_id, type, title, message, data)
          VALUES ($1, $2, $3, $4, $5)
        `
        return pool.query(insertQuery, [userId, type, title, message, JSON.stringify({ sender: "admin" })])
      })

      await Promise.all(notificationPromises)

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "notifications_sent" },
        {
          sent_count: targetUserIds.length,
        },
      )
    } catch (err) {
      console.error("Send Notification Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  // Get Membership Plans
  async getMembershipPlans(req, res) {
    try {
      const plansQuery = `
        SELECT 
          mp.*,
          COUNT(um.id) as active_subscriptions
        FROM tbl_membership_plans mp
        LEFT JOIN tbl_user_memberships um ON mp.id = um.plan_id AND um.is_active = TRUE
        WHERE mp.is_deleted = FALSE
        GROUP BY mp.id
        ORDER BY mp.price ASC
      `

      const plans = await pool.query(plansQuery)

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "plans_retrieved" },
        {
          plans: plans.rows,
        },
      )
    } catch (err) {
      console.error("Get Membership Plans Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  // Get Analytics Data
  async getAnalytics(req, res) {
    try {
      const { period = "30" } = req.body // days

      // User registrations over time
      const userRegistrationsQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM tbl_users
        WHERE created_at >= NOW() - INTERVAL '${period} days'
          AND is_deleted = FALSE
        GROUP BY DATE(created_at)
        ORDER BY date
      `

      // Offers created over time
      const offersCreatedQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM tbl_offers
        WHERE created_at >= NOW() - INTERVAL '${period} days'
          AND is_deleted = FALSE
        GROUP BY DATE(created_at)
        ORDER BY date
      `

      // Redemptions over time
      const redemptionsQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          SUM(total_amount) as revenue
        FROM tbl_redemptions
        WHERE created_at >= NOW() - INTERVAL '${period} days'
          AND is_deleted = FALSE
        GROUP BY DATE(created_at)
        ORDER BY date
      `

      // Top categories
      const topCategoriesQuery = `
        SELECT 
          oc.offer_category_name as category,
          COUNT(o.id) as offer_count
        FROM tbl_offers o
        JOIN tbl_offer_subcategories osc ON o.offer_subcategory_id = osc.id
        JOIN tbl_offer_categories oc ON osc.offer_category_id = oc.id
        WHERE o.is_deleted = FALSE
        GROUP BY oc.offer_category_name
        ORDER BY offer_count DESC
        LIMIT 10
      `

      const [userRegistrations, offersCreated, redemptions, topCategories] = await Promise.all([
        pool.query(userRegistrationsQuery),
        pool.query(offersCreatedQuery),
        pool.query(redemptionsQuery),
        pool.query(topCategoriesQuery),
      ])

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "analytics_retrieved" },
        {
          userRegistrations: userRegistrations.rows,
          offersCreated: offersCreated.rows,
          redemptions: redemptions.rows,
          topCategories: topCategories.rows,
        },
      )
    } catch (err) {
      console.error("Get Analytics Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },
}

module.exports = admin_model
