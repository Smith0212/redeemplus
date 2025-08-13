const { sendResponse } = require("../../middleware")
const pool = require("../../config/database")
const responseCode = require("../../config/responseCode")

const review_model = {
  async addReview(req, res) {
    try {
      const user_id = req.user.id
      const { business_id, offer_id, rating, review } = req.body

      if (!business_id || !rating) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_parameters" }, {})
      }

      if (rating < 1 || rating > 5) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "invalid_rating" }, {})
      }

      // Check if business exists and is active
      const businessQuery = `
                SELECT id, username FROM tbl_users 
                WHERE id = $1 AND is_active = TRUE AND is_deleted = FALSE
            `
      const businessResult = await pool.query(businessQuery, [business_id])

      if (businessResult.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "business_not_found" }, {})
      }

      // If offer_id is provided, validate it belongs to the business
      if (offer_id) {
        const offerQuery = `
                    SELECT id FROM tbl_offers 
                    WHERE id = $1 AND user_id = $2 AND is_active = TRUE AND is_deleted = FALSE
                `
        const offerResult = await pool.query(offerQuery, [offer_id, business_id])

        if (offerResult.rows.length === 0) {
          return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "offer_not_found" }, {})
        }
      }

      // Check if user has already reviewed this business (and offer if specified)
      let existingReviewQuery = `
                SELECT id FROM tbl_reviews 
                WHERE user_id = $1 AND business_id = $2 AND is_active = TRUE AND is_deleted = FALSE
            `
      const queryParams = [user_id, business_id]

      if (offer_id) {
        existingReviewQuery += " AND offer_id = $3"
        queryParams.push(offer_id)
      } else {
        existingReviewQuery += " AND offer_id IS NULL"
      }

      const existingReview = await pool.query(existingReviewQuery, queryParams)

      if (existingReview.rows.length > 0) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "already_reviewed" }, {})
      }

      // Verify user has redeemed from this business (optional business rule)
      const redemptionQuery = `
                SELECT COUNT(*) as redemption_count FROM tbl_redemptions r
                JOIN tbl_offers o ON r.offer_id = o.id
                WHERE r.user_id = $1 AND o.user_id = $2 AND r.is_active = TRUE AND r.is_deleted = FALSE
            `
      const redemptionResult = await pool.query(redemptionQuery, [user_id, business_id])

      if (Number.parseInt(redemptionResult.rows[0].redemption_count) === 0) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "no_redemption_history" }, {})
      }

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        // Add review
        const reviewQuery = `
                    INSERT INTO tbl_reviews (user_id, business_id, offer_id, rating, review)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id, created_at
                `

        const reviewResult = await client.query(reviewQuery, [user_id, business_id, offer_id, rating, review])
        const newReview = reviewResult.rows[0]

        // Create notification for business owner
        await client.query(
          `INSERT INTO tbl_notifications (user_id, sender_id, type, title, message, data) 
                     VALUES ($1, $2, 'new_review', 'New Review Received', $3, $4)`,
          [
            business_id,
            user_id,
            `You received a ${rating}-star review`,
            JSON.stringify({
              review_id: newReview.id,
              rating,
              offer_id,
            }),
          ],
        )

        await client.query("COMMIT")

        return sendResponse(
          req,
          res,
          200,
          responseCode.SUCCESS,
          { keyword: "review_added" },
          {
            review_id: newReview.id,
            created_at: newReview.created_at,
          },
        )
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }
    } catch (err) {
      console.error("Add Review Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getBusinessReviews(req, res) {
    try {
      const { business_id, page = 1, limit = 10, rating_filter } = req.body

      if (!business_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_business_id" }, {})
      }

      const offset = (page - 1) * limit
      const whereConditions = [
        "r.business_id = $1",
        "r.is_active = TRUE",
        "r.is_deleted = FALSE",
        "u.is_active = TRUE",
        "u.is_deleted = FALSE",
      ]
      const queryParams = [business_id]
      let paramIndex = 2

      // Rating filter
      if (rating_filter) {
        whereConditions.push(`r.rating = $${paramIndex}`)
        queryParams.push(rating_filter)
        paramIndex++
      }

      // Get reviews with user details
      const reviewsQuery = `
                SELECT 
                    r.id, r.rating, r.review, r.created_at,
                    u.id as reviewer_id, u.username as reviewer_name, u.profile_image as reviewer_image,
                    o.id as offer_id, o.title as offer_title, o.image as offer_image
                FROM tbl_reviews r
                JOIN tbl_users u ON r.user_id = u.id
                LEFT JOIN tbl_offers o ON r.offer_id = o.id
                WHERE ${whereConditions.join(" AND ")}
                ORDER BY r.created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `

      // Get total count
      const countQuery = `
                SELECT COUNT(*) as total FROM tbl_reviews r
                JOIN tbl_users u ON r.user_id = u.id
                WHERE ${whereConditions.join(" AND ")}
            `

      // Get rating distribution
      const distributionQuery = `
                SELECT 
                    rating,
                    COUNT(*) as count
                FROM tbl_reviews r
                JOIN tbl_users u ON r.user_id = u.id
                WHERE r.business_id = $1 AND r.is_active = TRUE AND r.is_deleted = FALSE
                AND u.is_active = TRUE AND u.is_deleted = FALSE
                GROUP BY rating
                ORDER BY rating DESC
            `

      // Get overall rating
      const overallQuery = `
                SELECT 
                    COALESCE(AVG(rating), 0) as avg_rating,
                    COUNT(*) as total_reviews
                FROM tbl_reviews r
                JOIN tbl_users u ON r.user_id = u.id
                WHERE r.business_id = $1 AND r.is_active = TRUE AND r.is_deleted = FALSE
                AND u.is_active = TRUE AND u.is_deleted = FALSE
            `

      queryParams.push(limit, offset)

      const [reviewsResult, countResult, distributionResult, overallResult] = await Promise.all([
        pool.query(reviewsQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2)),
        pool.query(distributionQuery, [business_id]),
        pool.query(overallQuery, [business_id]),
      ])

      const reviews = reviewsResult.rows
      const total = Number.parseInt(countResult.rows[0].total)
      const distribution = distributionResult.rows
      const overall = overallResult.rows[0]

      // Format rating distribution
      const ratingDistribution = {}
      for (let i = 5; i >= 1; i--) {
        const found = distribution.find((d) => d.rating === i)
        ratingDistribution[i] = found ? Number.parseInt(found.count) : 0
      }

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          reviews,
          overall_rating: Number.parseFloat(overall.avg_rating).toFixed(1),
          total_reviews: Number.parseInt(overall.total_reviews),
          rating_distribution: ratingDistribution,
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
      console.error("Get Business Reviews Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getOfferReviews(req, res) {
    try {
      const { offer_id, page = 1, limit = 10, rating_filter } = req.body

      if (!offer_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_offer_id" }, {})
      }

      const offset = (page - 1) * limit
      const whereConditions = [
        "r.offer_id = $1",
        "r.is_active = TRUE",
        "r.is_deleted = FALSE",
        "u.is_active = TRUE",
        "u.is_deleted = FALSE",
      ]
      const queryParams = [offer_id]
      let paramIndex = 2

      // Rating filter
      if (rating_filter) {
        whereConditions.push(`r.rating = $${paramIndex}`)
        queryParams.push(rating_filter)
        paramIndex++
      }

      // Get reviews with user details
      const reviewsQuery = `
                SELECT 
                    r.id, r.rating, r.review, r.created_at,
                    u.id as reviewer_id, u.username as reviewer_name, u.profile_image as reviewer_image,
                    o.title as offer_title
                FROM tbl_reviews r
                JOIN tbl_users u ON r.user_id = u.id
                JOIN tbl_offers o ON r.offer_id = o.id
                WHERE ${whereConditions.join(" AND ")}
                ORDER BY r.created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `

      // Get total count and average rating
      const statsQuery = `
                SELECT 
                    COUNT(*) as total,
                    COALESCE(AVG(r.rating), 0) as avg_rating
                FROM tbl_reviews r
                JOIN tbl_users u ON r.user_id = u.id
                WHERE ${whereConditions.join(" AND ")}
            `

      queryParams.push(limit, offset)

      const [reviewsResult, statsResult] = await Promise.all([
        pool.query(reviewsQuery, queryParams),
        pool.query(statsQuery, queryParams.slice(0, -2)),
      ])

      const reviews = reviewsResult.rows
      const stats = statsResult.rows[0]

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          reviews,
          avg_rating: Number.parseFloat(stats.avg_rating).toFixed(1),
          total_reviews: Number.parseInt(stats.total),
          pagination: {
            current_page: page,
            total_pages: Math.ceil(Number.parseInt(stats.total) / limit),
            total_records: Number.parseInt(stats.total),
            has_next: page < Math.ceil(Number.parseInt(stats.total) / limit),
            has_prev: page > 1,
          },
        },
      )
    } catch (err) {
      console.error("Get Offer Reviews Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getMyReviews(req, res) {
    try {
      const user_id = req.user.id
      const { page = 1, limit = 10, type = "given" } = req.body // given, received

      const offset = (page - 1) * limit

      let reviewsQuery, countQuery

      if (type === "given") {
        // Reviews given by the user
        reviewsQuery = `
                    SELECT 
                        r.id, r.rating, r.review, r.created_at,
                        b.id as business_id, b.username as business_name, b.profile_image as business_image,
                        o.id as offer_id, o.title as offer_title, o.image as offer_image
                    FROM tbl_reviews r
                    JOIN tbl_users b ON r.business_id = b.id
                    LEFT JOIN tbl_offers o ON r.offer_id = o.id
                    WHERE r.user_id = $1 AND r.is_active = TRUE AND r.is_deleted = FALSE
                    ORDER BY r.created_at DESC
                    LIMIT $2 OFFSET $3
                `

        countQuery = `
                    SELECT COUNT(*) as total FROM tbl_reviews r
                    WHERE r.user_id = $1 AND r.is_active = TRUE AND r.is_deleted = FALSE
                `
      } else {
        // Reviews received by the user (if they are a business)
        reviewsQuery = `
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

        countQuery = `
                    SELECT COUNT(*) as total FROM tbl_reviews r
                    WHERE r.business_id = $1 AND r.is_active = TRUE AND r.is_deleted = FALSE
                `
      }

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
          type,
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

  async updateReview(req, res) {
    try {
      const user_id = req.user.id
      const { review_id, rating, review } = req.body

      if (!review_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_review_id" }, {})
      }

      if (rating && (rating < 1 || rating > 5)) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "invalid_rating" }, {})
      }

      // Verify ownership
      const ownershipQuery = `
                SELECT id, business_id FROM tbl_reviews 
                WHERE id = $1 AND user_id = $2 AND is_active = TRUE AND is_deleted = FALSE
            `
      const ownershipResult = await pool.query(ownershipQuery, [review_id, user_id])

      if (ownershipResult.rows.length === 0) {
        return sendResponse(req, res, 403, responseCode.OPERATION_FAILED, { keyword: "permission_denied" }, {})
      }

      const existingReview = ownershipResult.rows[0]

      // Build dynamic update query
      const fields = []
      const values = []
      let idx = 1

      if (rating !== undefined) {
        fields.push(`rating = $${idx++}`)
        values.push(rating)
      }

      if (review !== undefined) {
        fields.push(`review = $${idx++}`)
        values.push(review)
      }

      if (fields.length === 0) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "no_fields_to_update" }, {})
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`)
      values.push(review_id)

      const updateQuery = `
                UPDATE tbl_reviews 
                SET ${fields.join(", ")}
                WHERE id = $${idx}
                RETURNING id, rating, review, updated_at
            `

      const result = await pool.query(updateQuery, values)

      // Create notification for business owner if rating changed
      if (rating !== undefined) {
        await pool.query(
          `INSERT INTO tbl_notifications (user_id, sender_id, type, title, message, data) 
                     VALUES ($1, $2, 'review_updated', 'Review Updated', $3, $4)`,
          [
            existingReview.business_id,
            user_id,
            `A customer updated their review to ${rating} stars`,
            JSON.stringify({
              review_id,
              new_rating: rating,
            }),
          ],
        )
      }

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "review_updated" }, result.rows[0])
    } catch (err) {
      console.error("Update Review Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async deleteReview(req, res) {
    try {
      const user_id = req.user.id
      const { review_id } = req.body

      if (!review_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_review_id" }, {})
      }

      // Verify ownership
      const ownershipQuery = `
                SELECT id FROM tbl_reviews 
                WHERE id = $1 AND user_id = $2 AND is_active = TRUE AND is_deleted = FALSE
            `
      const ownershipResult = await pool.query(ownershipQuery, [review_id, user_id])

      if (ownershipResult.rows.length === 0) {
        return sendResponse(req, res, 403, responseCode.OPERATION_FAILED, { keyword: "permission_denied" }, {})
      }

      // Soft delete review
      const deleteQuery = `
                UPDATE tbl_reviews 
                SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING id
            `

      const result = await pool.query(deleteQuery, [review_id])

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "review_deleted" },
        { review_id: result.rows[0].id },
      )
    } catch (err) {
      console.error("Delete Review Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getReviewStats(req, res) {
    try {
      const { business_id } = req.body

      if (!business_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_business_id" }, {})
      }

      // Get comprehensive review statistics
      const statsQuery = `
                SELECT 
                    COUNT(*) as total_reviews,
                    COALESCE(AVG(rating), 0) as avg_rating,
                    COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
                    COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
                    COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
                    COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
                    COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star,
                    COUNT(CASE WHEN review IS NOT NULL AND review != '' THEN 1 END) as reviews_with_text,
                    COUNT(CASE WHEN offer_id IS NOT NULL THEN 1 END) as offer_specific_reviews
                FROM tbl_reviews r
                JOIN tbl_users u ON r.user_id = u.id
                WHERE r.business_id = $1 AND r.is_active = TRUE AND r.is_deleted = FALSE
                AND u.is_active = TRUE AND u.is_deleted = FALSE
            `

      // Get recent reviews trend (last 30 days)
      const trendQuery = `
                SELECT 
                    DATE(created_at) as review_date,
                    COUNT(*) as daily_count,
                    AVG(rating) as daily_avg_rating
                FROM tbl_reviews r
                JOIN tbl_users u ON r.user_id = u.id
                WHERE r.business_id = $1 AND r.is_active = TRUE AND r.is_deleted = FALSE
                AND u.is_active = TRUE AND u.is_deleted = FALSE
                AND r.created_at >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY DATE(created_at)
                ORDER BY review_date DESC
            `

      // Get top keywords from reviews (simple word frequency)
      const keywordsQuery = `
                SELECT 
                    unnest(string_to_array(lower(review), ' ')) as word,
                    COUNT(*) as frequency
                FROM tbl_reviews r
                JOIN tbl_users u ON r.user_id = u.id
                WHERE r.business_id = $1 AND r.is_active = TRUE AND r.is_deleted = FALSE
                AND u.is_active = TRUE AND u.is_deleted = FALSE
                AND review IS NOT NULL AND review != ''
                AND length(unnest(string_to_array(lower(review), ' '))) > 3
                GROUP BY word
                HAVING COUNT(*) > 1
                ORDER BY frequency DESC
                LIMIT 10
            `

      const [statsResult, trendResult, keywordsResult] = await Promise.all([
        pool.query(statsQuery, [business_id]),
        pool.query(trendQuery, [business_id]),
        pool.query(keywordsQuery, [business_id]),
      ])

      const stats = statsResult.rows[0]
      const trend = trendResult.rows
      const keywords = keywordsResult.rows

      // Calculate percentages for rating distribution
      const totalReviews = Number.parseInt(stats.total_reviews)
      const ratingDistribution = {
        5: {
          count: Number.parseInt(stats.five_star),
          percentage: totalReviews > 0 ? ((Number.parseInt(stats.five_star) / totalReviews) * 100).toFixed(1) : 0,
        },
        4: {
          count: Number.parseInt(stats.four_star),
          percentage: totalReviews > 0 ? ((Number.parseInt(stats.four_star) / totalReviews) * 100).toFixed(1) : 0,
        },
        3: {
          count: Number.parseInt(stats.three_star),
          percentage: totalReviews > 0 ? ((Number.parseInt(stats.three_star) / totalReviews) * 100).toFixed(1) : 0,
        },
        2: {
          count: Number.parseInt(stats.two_star),
          percentage: totalReviews > 0 ? ((Number.parseInt(stats.two_star) / totalReviews) * 100).toFixed(1) : 0,
        },
        1: {
          count: Number.parseInt(stats.one_star),
          percentage: totalReviews > 0 ? ((Number.parseInt(stats.one_star) / totalReviews) * 100).toFixed(1) : 0,
        },
      }

      const response = {
        overall: {
          total_reviews: totalReviews,
          avg_rating: Number.parseFloat(stats.avg_rating).toFixed(1),
          reviews_with_text: Number.parseInt(stats.reviews_with_text),
          offer_specific_reviews: Number.parseInt(stats.offer_specific_reviews),
        },
        rating_distribution: ratingDistribution,
        recent_trend: trend,
        top_keywords: keywords,
      }

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, response)
    } catch (err) {
      console.error("Get Review Stats Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async reportReview(req, res) {
    try {
      const user_id = req.user.id
      const { review_id, reason, additional_details } = req.body

      if (!review_id || !reason) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_parameters" }, {})
      }

      // Verify review exists
      const reviewQuery = `
                SELECT r.id, r.user_id as reviewer_id, r.business_id, u.username as reviewer_name
                FROM tbl_reviews r
                JOIN tbl_users u ON r.user_id = u.id
                WHERE r.id = $1 AND r.is_active = TRUE AND r.is_deleted = FALSE
            `
      const reviewResult = await pool.query(reviewQuery, [review_id])

      if (reviewResult.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "review_not_found" }, {})
      }

      const review = reviewResult.rows[0]

      // Check if user has already reported this review
      const existingReportQuery = `
                SELECT id FROM tbl_reports 
                WHERE reporter_id = $1 AND report_type = 'review' AND additional_details LIKE $2
                AND is_active = TRUE AND is_deleted = FALSE
            `
      const existingReport = await pool.query(existingReportQuery, [user_id, `%review_id:${review_id}%`])

      if (existingReport.rows.length > 0) {
        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: "already_reported" }, {})
      }

      // Generate ticket number
      const ticketNumber = `REV${Date.now()}${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0")}`

      // Create report
      const reportQuery = `
                INSERT INTO tbl_reports (
                    ticket_number, reporter_id, reported_user_id, report_type, 
                    reason, additional_details, status
                ) VALUES ($1, $2, $3, 'review', $4, $5, 'pending')
                RETURNING id, ticket_number
            `

      const reportDetails = `Review ID: ${review_id}\nReviewer: ${review.reviewer_name}\n${additional_details || ""}`

      const result = await pool.query(reportQuery, [ticketNumber, user_id, review.reviewer_id, reason, reportDetails])

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "review_reported" },
        {
          report_id: result.rows[0].id,
          ticket_number: result.rows[0].ticket_number,
        },
      )
    } catch (err) {
      console.error("Report Review Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getTopRatedBusinesses(req, res) {
    try {
      const { page = 1, limit = 10, category_id, min_reviews = 5 } = req.body

      const offset = (page - 1) * limit
      const whereConditions = ["u.is_active = TRUE", "u.is_deleted = FALSE", "u.account_type = 'business'"]
      const queryParams = []
      let paramIndex = 1

      if (category_id) {
        whereConditions.push(`u.business_category_id = $${paramIndex}`)
        queryParams.push(category_id)
        paramIndex++
      }

      const businessesQuery = `
                SELECT 
                    u.id, u.username, u.profile_image, u.business_category_id,
                    bc.category_name, bc.sub_category_name,
                    mp.name as membership_name, mp.has_verified_badge,
                    COALESCE(AVG(r.rating), 0) as avg_rating,
                    COUNT(r.id) as total_reviews,
                    COUNT(DISTINCT o.id) as total_offers
                FROM tbl_users u
                LEFT JOIN tbl_business_categories bc ON u.business_category_id = bc.id
                LEFT JOIN tbl_user_memberships um ON u.id = um.user_id AND um.is_active = TRUE
                LEFT JOIN tbl_membership_plans mp ON um.plan_id = mp.id
                LEFT JOIN tbl_reviews r ON u.id = r.business_id AND r.is_active = TRUE AND r.is_deleted = FALSE
                LEFT JOIN tbl_offers o ON u.id = o.user_id AND o.is_active = TRUE AND o.is_deleted = FALSE
                WHERE ${whereConditions.join(" AND ")}
                GROUP BY u.id, bc.id, mp.id
                HAVING COUNT(r.id) >= $${paramIndex}
                ORDER BY AVG(r.rating) DESC, COUNT(r.id) DESC
                LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
            `

      const countQuery = `
                SELECT COUNT(DISTINCT u.id) as total
                FROM tbl_users u
                LEFT JOIN tbl_reviews r ON u.id = r.business_id AND r.is_active = TRUE AND r.is_deleted = FALSE
                WHERE ${whereConditions.join(" AND ")}
                GROUP BY u.id
                HAVING COUNT(r.id) >= $${paramIndex}
            `

      queryParams.push(min_reviews, limit, offset)

      const [businessesResult, countResult] = await Promise.all([
        pool.query(businessesQuery, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2)),
      ])

      const businesses = businessesResult.rows
      const total = countResult.rows.length

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          businesses,
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
      console.error("Get Top Rated Businesses Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },
}

module.exports = review_model
