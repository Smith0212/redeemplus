const { sendResponse } = require("../../middleware")
const pool = require("../../config/database")
const responseCode = require("../../config/responseCode")

const category_model = {
  async getBusinessCategories(req, res) {
    try {
      // Always fetch with subcategories
      const categoriesQuery = `
        SELECT 
          id, category_name, sub_category_name, created_at, updated_at
        FROM tbl_business_categories 
        WHERE is_active = TRUE AND is_deleted = FALSE
        ORDER BY category_name ASC, sub_category_name ASC
      `

      const { rows } = await pool.query(categoriesQuery)

      // Group by category
      const groupedCategories = {}
      rows.forEach((row) => {
        if (!groupedCategories[row.category_name]) {
          groupedCategories[row.category_name] = {
            category_name: row.category_name,
            subcategories: [],
          }
        }
        if (row.sub_category_name) {
          groupedCategories[row.category_name].subcategories.push({
            id: row.id,
            sub_category_name: row.sub_category_name,
            created_at: row.created_at,
            updated_at: row.updated_at,
          })
        }
      })

      const categories = Object.values(groupedCategories)
      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, { categories })
    } catch (err) {
      console.error("Get Business Categories Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getOfferTypes(req, res) {
    try {
      const offerTypesQuery = `
        SELECT 
          id, offer_category_name, offer_subcategory_name, 
          offer_subcategory_image, created_at, updated_at
        FROM tbl_offer_types 
        WHERE is_active = TRUE AND is_deleted = FALSE
        ORDER BY offer_category_name ASC, offer_subcategory_name ASC
      `

      const { rows } = await pool.query(offerTypesQuery)

      // Group by category
      const groupedOfferTypes = {}
      rows.forEach((row) => {
        if (!groupedOfferTypes[row.offer_category_name]) {
          groupedOfferTypes[row.offer_category_name] = {
            offer_category_name: row.offer_category_name,
            subcategories: [],
          }
        }
        if (row.offer_subcategory_name) {
          groupedOfferTypes[row.offer_category_name].subcategories.push({
            id: row.id,
            offer_subcategory_name: row.offer_subcategory_name,
            offer_subcategory_image: row.offer_subcategory_image,
            created_at: row.created_at,
            updated_at: row.updated_at,
          })
        }
      })

      const offer_types = Object.values(groupedOfferTypes)
      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, { offer_types })
    } catch (err) {
      console.error("Get Offer Types Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getCategoryStats(req, res) {
    try {
      const { category_type = "business" } = req.body // business or offer

      let statsQuery
      if (category_type === "business") {
        statsQuery = `
                    SELECT 
                        bc.id, bc.category_name, bc.sub_category_name,
                        COUNT(DISTINCT u.id) as business_count,
                        COUNT(DISTINCT o.id) as offer_count,
                        COALESCE(AVG(r.rating), 0) as avg_rating
                    FROM tbl_business_categories bc
                    LEFT JOIN tbl_users u ON bc.id = u.business_category_id 
                        AND u.is_active = TRUE AND u.is_deleted = FALSE
                    LEFT JOIN tbl_offers o ON u.id = o.user_id 
                        AND o.is_active = TRUE AND o.is_deleted = FALSE
                    LEFT JOIN tbl_reviews r ON u.id = r.business_id 
                        AND r.is_active = TRUE AND r.is_deleted = FALSE
                    WHERE bc.is_active = TRUE AND bc.is_deleted = FALSE
                    GROUP BY bc.id, bc.category_name, bc.sub_category_name
                    ORDER BY business_count DESC, offer_count DESC
                `
      } else {
        statsQuery = `
                    SELECT 
                        ot.id, ot.offer_category_name, ot.offer_subcategory_name,
                        COUNT(DISTINCT o.id) as offer_count,
                        COUNT(DISTINCT r.id) as redemption_count,
                        COALESCE(AVG(o.total_price), 0) as avg_price
                    FROM tbl_offer_types ot
                    LEFT JOIN tbl_offers o ON ot.id = o.offer_type_id 
                        AND o.is_active = TRUE AND o.is_deleted = FALSE
                    LEFT JOIN tbl_redemptions r ON o.id = r.offer_id 
                        AND r.is_active = TRUE AND r.is_deleted = FALSE
                    WHERE ot.is_active = TRUE AND ot.is_deleted = FALSE
                    GROUP BY ot.id, ot.offer_category_name, ot.offer_subcategory_name
                    ORDER BY offer_count DESC, redemption_count DESC
                `
      }

      const { rows } = await pool.query(statsQuery)

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          category_type,
          stats: rows,
        },
      )
    } catch (err) {
      console.error("Get Category Stats Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getPopularCategories(req, res) {
    try {
      const { limit = 10, category_type = "business" } = req.body

      let popularQuery
      if (category_type === "business") {
        popularQuery = `
                    SELECT 
                        bc.id, bc.category_name, bc.sub_category_name,
                        COUNT(DISTINCT u.id) as business_count,
                        COUNT(DISTINCT o.id) as offer_count,
                        COUNT(DISTINCT r.id) as redemption_count
                    FROM tbl_business_categories bc
                    LEFT JOIN tbl_users u ON bc.id = u.business_category_id 
                        AND u.is_active = TRUE AND u.is_deleted = FALSE
                    LEFT JOIN tbl_offers o ON u.id = o.user_id 
                        AND o.is_active = TRUE AND o.is_deleted = FALSE
                    LEFT JOIN tbl_redemptions red ON o.id = red.offer_id 
                        AND red.is_active = TRUE AND red.is_deleted = FALSE
                    WHERE bc.is_active = TRUE AND bc.is_deleted = FALSE
                    GROUP BY bc.id, bc.category_name, bc.sub_category_name
                    HAVING COUNT(DISTINCT u.id) > 0
                    ORDER BY redemption_count DESC, offer_count DESC, business_count DESC
                    LIMIT $1
                `
      } else {
        popularQuery = `
                    SELECT 
                        ot.id, ot.offer_category_name, ot.offer_subcategory_name,
                        ot.offer_subcategory_image,
                        COUNT(DISTINCT o.id) as offer_count,
                        COUNT(DISTINCT r.id) as redemption_count,
                        SUM(o.view_count) as total_views
                    FROM tbl_offer_types ot
                    LEFT JOIN tbl_offers o ON ot.id = o.offer_type_id 
                        AND o.is_active = TRUE AND o.is_deleted = FALSE
                    LEFT JOIN tbl_redemptions r ON o.id = r.offer_id 
                        AND r.is_active = TRUE AND r.is_deleted = FALSE
                    WHERE ot.is_active = TRUE AND ot.is_deleted = FALSE
                    GROUP BY ot.id, ot.offer_category_name, ot.offer_subcategory_name, ot.offer_subcategory_image
                    HAVING COUNT(DISTINCT o.id) > 0
                    ORDER BY redemption_count DESC, total_views DESC, offer_count DESC
                    LIMIT $1
                `
      }

      const { rows } = await pool.query(popularQuery, [limit])

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          category_type,
          popular_categories: rows,
        },
      )
    } catch (err) {
      console.error("Get Popular Categories Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async searchCategories(req, res) {
    try {
      const { query, limit = 20 } = req.body

      if (!query || query.trim().length < 2) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "query_too_short" }, {})
      }

      const searchTerm = `%${query.trim()}%`

      const searchQuery = `
        SELECT 
          id, category_name, sub_category_name, created_at
        FROM tbl_business_categories 
        WHERE (category_name ILIKE $1 OR sub_category_name ILIKE $1)
          AND is_active = TRUE AND is_deleted = FALSE
        ORDER BY 
          CASE 
            WHEN category_name ILIKE $1 THEN 1
            WHEN sub_category_name ILIKE $1 THEN 2
            ELSE 3
          END,
          category_name ASC, sub_category_name ASC
        LIMIT $2
      `

      const { rows } = await pool.query(searchQuery, [searchTerm, limit])

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          query,
          results: rows,
        },
      )
    } catch (err) {
      console.error("Search Categories Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getCategoryDetails(req, res) {
    try {
      const { category_id, category_type = "business" } = req.body

      if (!category_id) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_category_id" }, {})
      }

      let detailsQuery
      if (category_type === "business") {
        detailsQuery = `
                    SELECT 
                        bc.*,
                        COUNT(DISTINCT u.id) as business_count,
                        COUNT(DISTINCT o.id) as offer_count,
                        COUNT(DISTINCT r.id) as redemption_count,
                        COALESCE(AVG(rev.rating), 0) as avg_rating,
                        COUNT(DISTINCT rev.id) as review_count
                    FROM tbl_business_categories bc
                    LEFT JOIN tbl_users u ON bc.id = u.business_category_id 
                        AND u.is_active = TRUE AND u.is_deleted = FALSE
                    LEFT JOIN tbl_offers o ON u.id = o.user_id 
                        AND o.is_active = TRUE AND o.is_deleted = FALSE
                    LEFT JOIN tbl_redemptions r ON o.id = r.offer_id 
                        AND r.is_active = TRUE AND r.is_deleted = FALSE
                    LEFT JOIN tbl_reviews rev ON u.id = rev.business_id 
                        AND rev.is_active = TRUE AND rev.is_deleted = FALSE
                    WHERE bc.id = $1 AND bc.is_active = TRUE AND bc.is_deleted = FALSE
                    GROUP BY bc.id
                `
      } else {
        detailsQuery = `
                    SELECT 
                        ot.*,
                        COUNT(DISTINCT o.id) as offer_count,
                        COUNT(DISTINCT r.id) as redemption_count,
                        COALESCE(AVG(o.total_price), 0) as avg_price,
                        SUM(o.view_count) as total_views
                    FROM tbl_offer_types ot
                    LEFT JOIN tbl_offers o ON ot.id = o.offer_type_id 
                        AND o.is_active = TRUE AND o.is_deleted = FALSE
                    LEFT JOIN tbl_redemptions r ON o.id = r.offer_id 
                        AND r.is_active = TRUE AND r.is_deleted = FALSE
                    WHERE ot.id = $1 AND ot.is_active = TRUE AND ot.is_deleted = FALSE
                    GROUP BY ot.id
                `
      }

      const { rows } = await pool.query(detailsQuery, [category_id])

      if (rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "category_not_found" }, {})
      }

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          category_type,
          category: rows[0],
        },
      )
    } catch (err) {
      console.error("Get Category Details Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },
}

module.exports = category_model
