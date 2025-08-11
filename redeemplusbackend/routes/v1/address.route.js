const { validateJoi, checkToken, checkApiKey } = require("../../middleware")
const addressModel = require("../../models/v1/address.model")
const express = require("express")
const Joi = require("joi")
const router = express.Router()

// Add address
router.post(
  "/addAddress",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      address: Joi.string().required(),
      street: Joi.string().max(16).optional(),
      postal_code: Joi.string().max(16).optional(),
      zone: Joi.string().max(16).optional(),
      latitude: Joi.string().max(16).optional(),
      longitude: Joi.string().max(16).optional(),
      country_code: Joi.string().max(6).optional(),
      phone_number: Joi.string().max(20).optional(),
      is_default: Joi.boolean().optional(),
    }),
  ),
  addressModel.addAddress,
)

// Get addresses
router.post("/getAddresses", checkApiKey, checkToken, addressModel.getAddresses)

// Update address
router.post(
  "/updateAddress",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      address_id: Joi.number().required(),
      address: Joi.string().optional(),
      street: Joi.string().max(16).optional(),
      postal_code: Joi.string().max(16).optional(),
      zone: Joi.string().max(16).optional(),
      latitude: Joi.string().max(16).optional(),
      longitude: Joi.string().max(16).optional(),
      country_code: Joi.string().max(6).optional(),
      phone_number: Joi.string().max(20).optional(),
      is_default: Joi.boolean().optional(),
    }),
  ),
  addressModel.updateAddress,
)

// Delete address
router.post(
  "/deleteaddress",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      address_id: Joi.number().required(),
    }),
  ),
  addressModel.deleteAddress,
)

// Set default address
router.post(
  "/setdefaultaddress",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      address_id: Joi.number().required(),
    }),
  ),
  addressModel.setDefaultAddress,
)

module.exports = router
