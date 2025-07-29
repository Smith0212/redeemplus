const { validateJoi, checkToken, checkApiKey } = require("../../middleware")
const staticModel = require("../../models/v1/static.model")
const express = require("express")
const Joi = require("joi")
const router = express.Router()

// Get specific static page
router.post(
  "/getstaticpage",
  checkApiKey,
  validateJoi(
    Joi.object({
      page_key: Joi.string().required(),
    }),
  ),
  staticModel.getStaticPage,
)

// Get all static pages
router.post("/getallstaticpages", checkApiKey, staticModel.getAllStaticPages)

// Get terms and conditions
router.post("/gettermsandconditions", checkApiKey, staticModel.getTermsAndConditions)

// Get privacy policy
router.post("/getprivacypolicy", checkApiKey, staticModel.getPrivacyPolicy)

// Get help and support
router.post("/gethelpsupport", checkApiKey, staticModel.getHelpAndSupport)

// Get about us
router.post("/getaboutus", checkApiKey, staticModel.getAboutUs)

// Get FAQs
router.post("/getfaqs", checkApiKey, staticModel.getFAQs)

// Get app info
router.post("/getappinfo", checkApiKey, staticModel.getAppInfo)

// Get contact info
router.post("/getcontactinfo", checkApiKey, staticModel.getContactInfo)

module.exports = router
