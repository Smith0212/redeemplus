const { validateJoi, checkToken, checkApiKey } = require("../../middleware")
const reportModel = require("../../models/v1/report.model")
const express = require("express")
const Joi = require("joi")
const router = express.Router()

// Create report
router.post(
  "/createreport",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      report_type: Joi.string().valid("user", "offer", "problem").required(),
      reported_user_id: Joi.number().optional(),
      reported_offer_id: Joi.number().optional(),
      reason: Joi.string().required(),
      additional_details: Joi.string().max(1000).optional(),
      voice_notes: Joi.array()
        .items(
          Joi.object({
            audio_url: Joi.string().required(),
            duration_seconds: Joi.number().min(1).max(60).required(),
          }),
        )
        .max(3)
        .optional(),
    }),
  ),
  reportModel.createReport,
)

// Get my reports
router.post(
  "/getmyreports",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      status_filter: Joi.string().valid("all", "pending", "reviewed", "resolved", "dismissed").optional(),
      report_type_filter: Joi.string().valid("all", "user", "offer", "problem").optional(),
    }),
  ),
  reportModel.getMyReports,
)

// Get report details
router.post(
  "/getreportdetails",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      report_id: Joi.number().required(),
    }),
  ),
  reportModel.getReportDetails,
)

// Get report reasons
router.post(
  "/getreportreasons",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      report_type: Joi.string().valid("user", "offer", "problem").required(),
    }),
  ),
  reportModel.getReportReasons,
)

// Get report statistics
router.post("/getreportstats", checkApiKey, checkToken, reportModel.getReportStats)

// Update report
router.post(
  "/updatereport",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      report_id: Joi.number().required(),
      additional_details: Joi.string().max(1000).required(),
    }),
  ),
  reportModel.updateReport,
)

// Cancel report
router.post(
  "/cancelreport",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      report_id: Joi.number().required(),
    }),
  ),
  reportModel.cancelReport,
)

module.exports = router
