const { sendResponse } = require("../../middleware")
const pool = require("../../config/database")
const responseCode = require("../../config/responseCode")

const report_model = {
  async createReport(req, res) {
    try {
      const user_id = req.user.id
      const {
        report_type,
        reported_user_id,
        reported_offer_id,
        reason,
        additional_details,
        voice_notes = [],
      } = req.body

      if (!report_type || !reason) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_parameters" }, {})
      }

      // Validate report type
      if (!["user", "offer", "problem"].includes(report_type)) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "invalid_report_type" }, {})
      }

      // Validate required fields based on report type
      if (report_type === "user" && !reported_user_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_reported_user_id" }, {})
      }

      if (report_type === "offer" && !reported_offer_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_reported_offer_id" }, {})
      }

      // Validate reported user exists (if applicable)
      if (reported_user_id) {
        const userQuery = "SELECT id FROM tbl_users WHERE id = $1 AND is_active = TRUE AND is_deleted = FALSE"
        const userResult = await pool.query(userQuery, [reported_user_id])

        if (userResult.rows.length === 0) {
          return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "reported_user_not_found" }, {})
        }

        // Prevent self-reporting
        if (reported_user_id === user_id) {
          return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "cannot_report_self" }, {})
        }
      }

      // Validate reported offer exists (if applicable)
      if (reported_offer_id) {
        const offerQuery = "SELECT id FROM tbl_offers WHERE id = $1 AND is_active = TRUE AND is_deleted = FALSE"
        const offerResult = await pool.query(offerQuery, [reported_offer_id])

        if (offerResult.rows.length === 0) {
          return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "reported_offer_not_found" }, {})
        }
      }

      // Check for duplicate reports (same user, same type, same target)
      let duplicateQuery = `
                SELECT id FROM tbl_reports 
                WHERE reporter_id = $1 AND report_type = $2 AND status IN ('pending', 'reviewed')
                AND is_active = TRUE AND is_deleted = FALSE
            `
      const duplicateParams = [user_id, report_type]

      if (reported_user_id) {
        duplicateQuery += " AND reported_user_id = $3"
        duplicateParams.push(reported_user_id)
      } else if (reported_offer_id) {
        duplicateQuery += " AND reported_offer_id = $3"
        duplicateParams.push(reported_offer_id)
      }

      const duplicateResult = await pool.query(duplicateQuery, duplicateParams)

      if (duplicateResult.rows.length > 0) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "duplicate_report" }, {})
      }

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        // Generate ticket number
        const ticketNumber = `RPT${Date.now()}${Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0")}`

        // Create report
        const reportQuery = `
                    INSERT INTO tbl_reports (
                        ticket_number, reporter_id, reported_user_id, reported_offer_id,
                        report_type, reason, additional_details, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
                    RETURNING id, ticket_number, created_at
                `

        const reportResult = await client.query(reportQuery, [
          ticketNumber,
          user_id,
          reported_user_id,
          reported_offer_id,
          report_type,
          reason,
          additional_details,
        ])

        const report = reportResult.rows[0]

        // Add voice notes if provided
        if (voice_notes && voice_notes.length > 0) {
          for (const voiceNote of voice_notes) {
            if (voiceNote.audio_url && voiceNote.duration_seconds <= 60) {
              await client.query(
                "INSERT INTO tbl_report_voice_notes (report_id, audio_url, duration_seconds) VALUES ($1, $2, $3)",
                [report.id, voiceNote.audio_url, voiceNote.duration_seconds],
              )
            }
          }
        }

        await client.query("COMMIT")

        return sendResponse(
          req,
          res,
          200,
          responseCode.SUCCESS,
          { keyword: "report_created" },
          {
            report_id: report.id,
            ticket_number: report.ticket_number,
            created_at: report.created_at,
          },
        )
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }
    } catch (err) {
      console.error("Create Report Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getMyReports(req, res) {
    try {
      const user_id = req.user.id
      const { page = 1, limit = 10, status_filter = "all", report_type_filter = "all" } = req.body

      const offset = (page - 1) * limit
      const whereConditions = ["r.reporter_id = $1", "r.is_active = TRUE", "r.is_deleted = FALSE"]
      const queryParams = [user_id]
      let paramIndex = 2

      // Status filter
      if (status_filter !== "all") {
        whereConditions.push(`r.status = $${paramIndex}`)
        queryParams.push(status_filter)
        paramIndex++
      }

      // Report type filter
      if (report_type_filter !== "all") {
        whereConditions.push(`r.report_type = $${paramIndex}`)
        queryParams.push(report_type_filter)
        paramIndex++
      }

      const reportsQuery = `
                SELECT 
                    r.id, r.ticket_number, r.report_type, r.reason, r.additional_details,
                    r.status, r.admin_notes, r.created_at, r.resolved_at,
                    ru.id as reported_user_id, ru.username as reported_username,
                    ro.id as reported_offer_id, ro.title as reported_offer_title,
                    COUNT(vrn.id) as voice_notes_count
                FROM tbl_reports r
                LEFT JOIN tbl_users ru ON r.reported_user_id = ru.id
                LEFT JOIN tbl_offers ro ON r.reported_offer_id = ro.id
                LEFT JOIN tbl_report_voice_notes vrn ON r.id = vrn.report_id
                WHERE ${whereConditions.join(" AND ")}
                GROUP BY r.id, ru.id, ro.id
                ORDER BY r.created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `

      const countQuery = `
                SELECT COUNT(*) as total FROM tbl_reports r
                WHERE ${whereConditions.join(" AND ")}
            `

      queryParams.push(limit, offset)

      const [reportsResult, countResult] = await Promise.all([
        pool.query(reportsQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2)),
      ])

      const reports = reportsResult.rows
      const total = Number.parseInt(countResult.rows[0].total)

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          reports,
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
      console.error("Get My Reports Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getReportDetails(req, res) {
    try {
      const user_id = req.user.id
      const { report_id } = req.body

      if (!report_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_report_id" }, {})
      }

      const reportQuery = `
                SELECT 
                    r.*,
                    ru.id as reported_user_id, ru.username as reported_username, ru.profile_image as reported_user_image,
                    ro.id as reported_offer_id, ro.title as reported_offer_title, ro.image as reported_offer_image
                FROM tbl_reports r
                LEFT JOIN tbl_users ru ON r.reported_user_id = ru.id
                LEFT JOIN tbl_offers ro ON r.reported_offer_id = ro.id
                WHERE r.id = $1 AND r.reporter_id = $2 AND r.is_active = TRUE AND r.is_deleted = FALSE
            `

      const reportResult = await pool.query(reportQuery, [report_id, user_id])

      if (reportResult.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "report_not_found" }, {})
      }

      const report = reportResult.rows[0]

      // Get voice notes
      const voiceNotesQuery = `
                SELECT audio_url, duration_seconds, uploaded_at 
                FROM tbl_report_voice_notes 
                WHERE report_id = $1
                ORDER BY uploaded_at ASC
            `
      const voiceNotesResult = await pool.query(voiceNotesQuery, [report_id])

      report.voice_notes = voiceNotesResult.rows

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, report)
    } catch (err) {
      console.error("Get Report Details Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getReportReasons(req, res) {
    try {
      const { report_type } = req.body

      if (!report_type || !["user", "offer", "problem"].includes(report_type)) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "invalid_report_type" }, {})
      }

      const reasonsQuery = `
                SELECT id, reason FROM tbl_report_reasons 
                WHERE report_type = $1 AND is_active = TRUE AND is_deleted = FALSE
                ORDER BY reason ASC
            `

      const { rows } = await pool.query(reasonsQuery, [report_type])

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, { reasons: rows })
    } catch (err) {
      console.error("Get Report Reasons Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getReportStats(req, res) {
    try {
      const user_id = req.user.id

      const statsQuery = `
                SELECT 
                    COUNT(*) as total_reports,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reports,
                    COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as reviewed_reports,
                    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_reports,
                    COUNT(CASE WHEN status = 'dismissed' THEN 1 END) as dismissed_reports,
                    COUNT(CASE WHEN report_type = 'user' THEN 1 END) as user_reports,
                    COUNT(CASE WHEN report_type = 'offer' THEN 1 END) as offer_reports,
                    COUNT(CASE WHEN report_type = 'problem' THEN 1 END) as problem_reports,
                    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_reports
                FROM tbl_reports 
                WHERE reporter_id = $1 AND is_active = TRUE AND is_deleted = FALSE
            `

      const { rows } = await pool.query(statsQuery, [user_id])
      const stats = rows[0]

      const response = {
        overview: {
          total_reports: Number.parseInt(stats.total_reports),
          recent_reports: Number.parseInt(stats.recent_reports),
        },
        by_status: {
          pending: Number.parseInt(stats.pending_reports),
          reviewed: Number.parseInt(stats.reviewed_reports),
          resolved: Number.parseInt(stats.resolved_reports),
          dismissed: Number.parseInt(stats.dismissed_reports),
        },
        by_type: {
          user_reports: Number.parseInt(stats.user_reports),
          offer_reports: Number.parseInt(stats.offer_reports),
          problem_reports: Number.parseInt(stats.problem_reports),
        },
      }

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, response)
    } catch (err) {
      console.error("Get Report Stats Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async updateReport(req, res) {
    try {
      const user_id = req.user.id
      const { report_id, additional_details } = req.body

      if (!report_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_report_id" }, {})
      }

      // Check if report exists and belongs to user
      const reportQuery = `
                SELECT id, status FROM tbl_reports 
                WHERE id = $1 AND reporter_id = $2 AND is_active = TRUE AND is_deleted = FALSE
            `
      const reportResult = await pool.query(reportQuery, [report_id, user_id])

      if (reportResult.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "report_not_found" }, {})
      }

      const report = reportResult.rows[0]

      // Only allow updates for pending reports
      if (report.status !== "pending") {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "report_cannot_be_updated" }, {})
      }

      // Update report
      const updateQuery = `
                UPDATE tbl_reports 
                SET additional_details = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING id, updated_at
            `

      const result = await pool.query(updateQuery, [additional_details, report_id])

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "report_updated" },
        {
          report_id: result.rows[0].id,
          updated_at: result.rows[0].updated_at,
        },
      )
    } catch (err) {
      console.error("Update Report Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async cancelReport(req, res) {
    try {
      const user_id = req.user.id
      const { report_id } = req.body

      if (!report_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_report_id" }, {})
      }

      // Check if report exists and belongs to user
      const reportQuery = `
                SELECT id, status FROM tbl_reports 
                WHERE id = $1 AND reporter_id = $2 AND is_active = TRUE AND is_deleted = FALSE
            `
      const reportResult = await pool.query(reportQuery, [report_id, user_id])

      if (reportResult.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "report_not_found" }, {})
      }

      const report = reportResult.rows[0]

      // Only allow cancellation for pending reports
      if (report.status !== "pending") {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "report_cannot_be_cancelled" }, {})
      }

      // Soft delete report
      const cancelQuery = `
                UPDATE tbl_reports 
                SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING id
            `

      const result = await pool.query(cancelQuery, [report_id])

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "report_cancelled" },
        { report_id: result.rows[0].id },
      )
    } catch (err) {
      console.error("Cancel Report Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },
}

module.exports = report_model
