const { decryption, validateJoi, checkToken, checkApiKey } = require('../../middleware');
const authModel = require('../../models/v1/auth.model');
const express = require('express');
const Joi = require('joi');
const router = express.Router();
const { COUNTRY, permissions } = require('../../config/constants');

//////////////////////////////////////////////////////////////////////
//                              Auth                                //
//////////////////////////////////////////////////////////////////////

router.post("/signup", checkApiKey, validateJoi(Joi.object({
    username: Joi.string().max(32).required(),
    email: Joi.string().email().max(255).required(),
    phone: Joi.string().max(20).required(),
    country_code_id: Joi.string().max(6).required(),
    password: Joi.string().required(),
    account_type: Joi.string().valid('individual', 'business').required(),
    signup_type: Joi.string().valid('s', 'g', 'a', 'f').required(), // s: standard, g: google, a: apple, f: facebook
    profile_image: Joi.string().optional(),
    social_id: Joi.string().max(255).optional(),
    business_subcategory_id: Joi.number().optional(),
    instagram_url: Joi.string().uri().optional(),
    tiktok_url: Joi.string().uri().optional(),
    whatsapp_url: Joi.string().uri().optional(),
    business_address: Joi.string().optional(),
    street: Joi.string().max(16).optional(),
    postal_code: Joi.string().max(16).optional(),
    zone: Joi.string().max(16).optional(),
    latitude: Joi.string().max(16).optional(),
    longitude: Joi.string().max(16).optional()
})), authModel.signup);

router.post("/verifyOtp", checkApiKey, checkToken, validateJoi(Joi.object({
    otp: Joi.string().required()
})), authModel.verifyOtp);

router.post("/editProfile", checkApiKey, checkToken, validateJoi(Joi.object({
    username: Joi.string().max(32).optional(),
    email: Joi.string().email().max(255).optional(),
    phone: Joi.string().max(20).optional(),
    country_code: Joi.string().max(6).optional(),
    profile_image: Joi.string().optional(),
    business_category_id: Joi.number().optional(),
    instagram_url: Joi.string().uri().optional(),
    tiktok_url: Joi.string().uri().optional(),
    whatsapp_url: Joi.string().uri().optional(),
    business_address: Joi.string().optional(),
    street: Joi.string().max(16).optional(),
    postal_code: Joi.string().max(16).optional(),
    zone: Joi.string().max(16).optional(),
    latitude: Joi.string().max(16).optional(),
    longitude: Joi.string().max(16).optional()
})), authModel.editProfile);

router.post("/login", checkApiKey, validateJoi(Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
    device_type: Joi.string().valid('A', 'I', 'W').required(),
    device_name: Joi.string().max(64).optional(),
    os_version: Joi.string().max(8).required(),
    app_version: Joi.string().max(8).optional(),
    ip: Joi.string().max(45).required(),
    device_token: Joi.string().required(),
    timezone: Joi.string().max(32).required(),
})), authModel.login);

router.post("/resendOtp", checkApiKey, checkToken, authModel.resendOtp);

router.post("/forgotPassword", checkApiKey, validateJoi(Joi.object({
    email: Joi.string().email().required()
})), authModel.forgotPassword);

router.post("/resetPassword", checkApiKey, validateJoi(Joi.object({
    new_password: Joi.string().required()
})), authModel.resetPassword);

router.post("/logout", checkApiKey, checkToken, authModel.logout);

module.exports = router;
