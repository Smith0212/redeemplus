const { sendResponse } = require("../../middleware")
const pool = require("../../config/database")
const responseCode = require("../../config/responseCode")

const static_model = {
  async getStaticPage(req, res) {
    try {
      const { page_key } = req.body

      if (!page_key) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_page_key" }, {})
      }

      const pageQuery = `
                SELECT id, page_key, title, content, updated_at 
                FROM tbl_static_pages 
                WHERE page_key = $1 AND is_active = TRUE
            `

      const { rows } = await pool.query(pageQuery, [page_key])

      if (rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "page_not_found" }, {})
      }

      const page = rows[0]

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, page)
    } catch (err) {
      console.error("Get Static Page Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getAllStaticPages(req, res) {
    try {
      const pagesQuery = `
                SELECT id, page_key, title, updated_at 
                FROM tbl_static_pages 
                WHERE is_active = TRUE
                ORDER BY page_key ASC
            `

      const { rows } = await pool.query(pagesQuery)

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, { pages: rows })
    } catch (err) {
      console.error("Get All Static Pages Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getTermsAndConditions(req, res) {
    try {
      const pageQuery = `
                SELECT id, title, content, updated_at 
                FROM tbl_static_pages 
                WHERE page_key = 'terms_conditions' AND is_active = TRUE
            `

      const { rows } = await pool.query(pageQuery)

      if (rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "page_not_found" }, {})
      }

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, rows[0])
    } catch (err) {
      console.error("Get Terms and Conditions Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getPrivacyPolicy(req, res) {
    try {
      const pageQuery = `
                SELECT id, title, content, updated_at 
                FROM tbl_static_pages 
                WHERE page_key = 'privacy_policy' AND is_active = TRUE
            `

      const { rows } = await pool.query(pageQuery)

      if (rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "page_not_found" }, {})
      }

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, rows[0])
    } catch (err) {
      console.error("Get Privacy Policy Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getHelpAndSupport(req, res) {
    try {
      const pageQuery = `
                SELECT id, title, content, updated_at 
                FROM tbl_static_pages 
                WHERE page_key = 'help_support' AND is_active = TRUE
            `

      const { rows } = await pool.query(pageQuery)

      if (rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "page_not_found" }, {})
      }

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, rows[0])
    } catch (err) {
      console.error("Get Help and Support Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getAboutUs(req, res) {
    try {
      const pageQuery = `
                SELECT id, title, content, updated_at 
                FROM tbl_static_pages 
                WHERE page_key = 'about_us' AND is_active = TRUE
            `

      const { rows } = await pool.query(pageQuery)

      if (rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "page_not_found" }, {})
      }

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, rows[0])
    } catch (err) {
      console.error("Get About Us Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getFAQs(req, res) {
    try {
      const pageQuery = `
                SELECT id, title, content, updated_at 
                FROM tbl_static_pages 
                WHERE page_key = 'faqs' AND is_active = TRUE
            `

      const { rows } = await pool.query(pageQuery)

      if (rows.length === 0) {
        // Return default FAQ structure if not found
        const defaultFAQs = {
          title: "Frequently Asked Questions",
          content: JSON.stringify([
            {
              category: "General",
              questions: [
                {
                  question: "What is RedeemPlus?",
                  answer:
                    "RedeemPlus is a platform that connects businesses with customers through exclusive offers and deals.",
                },
                {
                  question: "How do I create an account?",
                  answer: "You can create an account by downloading the app and following the signup process.",
                },
              ],
            },
            {
              category: "Offers",
              questions: [
                {
                  question: "How do I redeem an offer?",
                  answer:
                    "You can redeem offers either by using the PIN code in-store or by requesting delivery through the app.",
                },
                {
                  question: "Can I save offers for later?",
                  answer: "Yes, you can add offers to your wishlist and redeem them before they expire.",
                },
              ],
            },
            {
              category: "Membership",
              questions: [
                {
                  question: "What are the different membership plans?",
                  answer:
                    "We offer Bronze (free), Silver ($15/year), and Gold ($30/year) membership plans with different benefits.",
                },
                {
                  question: "How do I upgrade my membership?",
                  answer: "You can upgrade your membership through the app's membership section.",
                },
              ],
            },
          ]),
          updated_at: new Date().toISOString(),
        }

        return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, defaultFAQs)
      }

      // Parse content if it's JSON
      let content = rows[0].content
      try {
        content = JSON.parse(content)
      } catch (e) {
        // Keep as string if not valid JSON
      }

      return sendResponse(
        req,
        res,
        200,
        responseCode.SUCCESS,
        { keyword: "success" },
        {
          ...rows[0],
          content,
        },
      )
    } catch (err) {
      console.error("Get FAQs Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getAppInfo(req, res) {
    try {
      // Return app information
      const appInfo = {
        app_name: "RedeemPlus",
        version: "1.0.0",
        build_number: "1",
        supported_languages: ["en", "ar", "es", "fr", "de", "it", "pt", "ru", "zh", "ja", "ko"],
        contact_email: "support@redeemplus.com",
        website: "https://redeemplus.com",
        social_media: {
          facebook: "https://facebook.com/redeemplus",
          twitter: "https://twitter.com/redeemplus",
          instagram: "https://instagram.com/redeemplus",
          linkedin: "https://linkedin.com/company/redeemplus",
        },
        features: [
          "Exclusive offers and deals",
          "PIN code and delivery redemption",
          "Business subscriptions",
          "Wishlist functionality",
          "Review and rating system",
          "Multiple membership tiers",
        ],
        last_updated: new Date().toISOString(),
      }

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, appInfo)
    } catch (err) {
      console.error("Get App Info Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },

  async getContactInfo(req, res) {
    try {
      const contactInfo = {
        support_email: "support@redeemplus.com",
        business_email: "business@redeemplus.com",
        general_email: "info@redeemplus.com",
        phone_numbers: {
          support: "+1-800-REDEEM-1",
          business: "+1-800-REDEEM-2",
        },
        office_address: {
          street: "123 Business Street",
          city: "Tech City",
          state: "CA",
          zip_code: "12345",
          country: "United States",
        },
        business_hours: {
          monday_friday: "9:00 AM - 6:00 PM PST",
          saturday: "10:00 AM - 4:00 PM PST",
          sunday: "Closed",
        },
        emergency_contact: "+1-800-URGENT-1",
        social_media: {
          facebook: "https://facebook.com/redeemplus",
          twitter: "https://twitter.com/redeemplus",
          instagram: "https://instagram.com/redeemplus",
          linkedin: "https://linkedin.com/company/redeemplus",
        },
      }

      return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "success" }, contactInfo)
    } catch (err) {
      console.error("Get Contact Info Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },
}

module.exports = static_model
