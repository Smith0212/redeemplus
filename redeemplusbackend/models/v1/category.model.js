const { sendResponse } = require("../../middleware")
const pool = require("../../config/database")
const responseCode = require("../../config/responseCode")

const category_model = {
  async getBusinessCategories(req, res) {
    try {
      // Fetch categories and their subcategories
      const categoriesQuery = `
        SELECT 
          c.id AS category_id,
          c.category_name,
          c.created_at AS category_created_at,
          c.updated_at AS category_updated_at,
          sc.id AS subcategory_id,
          sc.subcategory_name,
          sc.created_at AS subcategory_created_at,
          sc.updated_at AS subcategory_updated_at
        FROM tbl_business_categories c
        LEFT JOIN tbl_business_subcategories sc
          ON c.id = sc.category_id
          AND sc.is_active = TRUE AND sc.is_deleted = FALSE
        WHERE c.is_active = TRUE AND c.is_deleted = FALSE
        ORDER BY c.category_name ASC, sc.subcategory_name ASC
      `

      const { rows } = await pool.query(categoriesQuery)

      // Group by category
      const groupedCategories = {}
      rows.forEach((row) => {
        if (!groupedCategories[row.category_name]) {  
          groupedCategories[row.category_name] = {
            id: row.category_id,
            category_name: row.category_name,
            created_at: row.category_created_at,
            updated_at: row.category_updated_at,
            subcategories: [],
          }
        }
        if (row.subcategory_id && row.subcategory_name) {
          groupedCategories[row.category_name].subcategories.push({
            id: row.subcategory_id,
            subcategory_name: row.subcategory_name,
            created_at: row.subcategory_created_at,
            updated_at: row.subcategory_updated_at,
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

  async getOfferCategories(req, res) {
    try {
      // Fetch categories and their subcategories
      const offerCategoriesQuery = `
        SELECT 
          oc.id AS category_id,
          oc.offer_category_name,
          oc.offer_category_image,
          oc.created_at AS category_created_at,
          oc.updated_at AS category_updated_at,
          sc.id AS subcategory_id,
          sc.offer_subcategory_name,
          sc.offer_subcategory_image,
          sc.created_at AS subcategory_created_at,
          sc.updated_at AS subcategory_updated_at
        FROM tbl_offer_categories oc
        LEFT JOIN tbl_offer_subcategories sc
          ON oc.id = sc.offer_category_id
          AND sc.is_active = TRUE AND sc.is_deleted = FALSE
        WHERE oc.is_active = TRUE AND oc.is_deleted = FALSE
        ORDER BY oc.offer_category_name ASC, sc.offer_subcategory_name ASC
      `

      const { rows } = await pool.query(offerCategoriesQuery)

      // Group by category
      const groupedOfferTypes = {}
      rows.forEach((row) => {
        if (!groupedOfferTypes[row.offer_category_name]) {
          groupedOfferTypes[row.offer_category_name] = {
            id: row.category_id,
            offer_category_name: row.offer_category_name,
            offer_category_image: row.offer_category_image,
            created_at: row.category_created_at,
            updated_at: row.category_updated_at,
            subcategories: [],
          }
        }
        if (row.subcategory_id && row.offer_subcategory_name) {
          groupedOfferTypes[row.offer_category_name].subcategories.push({
            id: row.subcategory_id,
            offer_subcategory_name: row.offer_subcategory_name,
            offer_subcategory_image: row.offer_subcategory_image,
            created_at: row.subcategory_created_at,
            updated_at: row.subcategory_updated_at,
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

  async searchCategories(req, res) {
    try {
      const { query, limit = 20 } = req.body

      if (!query || query.trim().length < 2) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "query_too_short" }, {})
      }

      const searchTerm = `%${query.trim()}%`

      const searchQuery = `
        SELECT 
          c.id AS category_id,
          c.category_name,
          c.created_at AS category_created_at,
          c.updated_at AS category_updated_at,
          sc.id AS subcategory_id,
          sc.subcategory_name,
          sc.created_at AS subcategory_created_at,
          sc.updated_at AS subcategory_updated_at
        FROM tbl_business_categories c
        LEFT JOIN tbl_business_subcategories sc
          ON c.id = sc.category_id
          AND sc.is_active = TRUE AND sc.is_deleted = FALSE
        WHERE (
          c.category_name ILIKE $1 OR
          sc.subcategory_name ILIKE $1
        )
        AND c.is_active = TRUE AND c.is_deleted = FALSE
        ORDER BY 
          CASE 
            WHEN c.category_name ILIKE $1 THEN 1
            WHEN sc.subcategory_name ILIKE $1 THEN 2
            ELSE 3
          END,
          c.category_name ASC, sc.subcategory_name ASC
        LIMIT $2
      `

      const { rows } = await pool.query(searchQuery, [searchTerm, limit])

      // Group by category
      const groupedCategories = {}
      rows.forEach((row) => {
        if (!groupedCategories[row.category_name]) {
          groupedCategories[row.category_name] = {
            id: row.category_id,
            category_name: row.category_name,
            created_at: row.category_created_at,
            updated_at: row.category_updated_at,
            subcategories: [],
          }
        }
        if (row.subcategory_id && row.subcategory_name) {
          groupedCategories[row.category_name].subcategories.push({
            id: row.subcategory_id,
            subcategory_name: row.subcategory_name,
            created_at: row.subcategory_created_at,
            updated_at: row.subcategory_updated_at,
          })
        }
      })

      const results = Object.values(groupedCategories)

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          query,
          results,
        },
      )
    } catch (err) {
      console.error("Search Categories Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },
}

module.exports = category_model
