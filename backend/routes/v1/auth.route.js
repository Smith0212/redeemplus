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
    country_code: Joi.string().max(6).required(),
    password: Joi.string().required(),
    account_type: Joi.string().valid('individual', 'business').required(),
    signup_type: Joi.string().valid('s', 'g', 'a', 'f').required(), // s: standard, g: google, a: apple, f: facebook
    profile_image: Joi.string().optional(),
    social_id: Joi.string().max(255).optional(),
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
})), authModel.signup);

router.post("/verifyotp", checkApiKey, checkToken, validateJoi(Joi.object({
    otp: Joi.string().required()
})), authModel.verifyOtp);

// router.post("/verifyotpForgot", checkApiKey, validateJoi(Joi.object({
//     email: Joi.string().email().required(), // email have to send when forgot password otp verification is happaning
//     otp: Joi.string().required()
// })), authModel.verifyOtpForgot);


router.post("/editprofile", checkApiKey, checkToken, validateJoi(Joi.object({
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

router.post("/resendotp", checkApiKey, checkToken, authModel.resendOtp);

// router.post("/resendotpforgot", checkApiKey, authModel.resendOtpForgot);

router.post("/forgotpassword", checkApiKey, validateJoi(Joi.object({
    email: Joi.string().email().required()
})), authModel.forgotPassword);

router.post("/resetpassword", checkApiKey, validateJoi(Joi.object({
    new_password: Joi.string().required()
})), authModel.resetPassword);

router.post("/logout", checkApiKey, checkToken, authModel.logout);


// router.post("/access_account", checkApiKey, decryption, validateJoi(Joi.object({
//     email: Joi.string().required(),
//     password: Joi.string().required(),
//     country: Joi.string().valid(...COUNTRY).required(),
//     device_details: Joi.object({
//         device_name: Joi.string().optional(),
//         device_type: Joi.string().valid('A', 'I', 'W').required(),
//         device_token: Joi.string().required(),
//         model_name: Joi.string().optional(),
//         uuid: Joi.string().required(),
//         os_version: Joi.string().required(),
//         app_version: Joi.string().optional(),
//         ip: Joi.string().required(),
//         time_zone: Joi.string().required()
//     }).required()
// })), authModel.access_account);

// router.post("/change_password", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
//     old_password: Joi.string().required(),
//     new_password: Joi.string().required()
// })), authModel.change_password);

// router.post(["/get_details", "/get_role_permissions"], checkApiKey, checkToken, decryption, authModel.get_details);

// router.post("/edit_profile", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
//     name: Joi.string().required(),
//     email: Joi.string().required(),
//     contact_number: Joi.string().required(),
//     profile_image: Joi.string().required(),
//     user_type: Joi.string().valid('admin', 'sub_admin').required()
// })), authModel.edit_profile);

// router.post("/logout", checkApiKey, checkToken, decryption, authModel.logout);

// router.post("/admin_list", checkApiKey, checkToken, authModel.admin_list);

// router.post("/manage_role_permissions", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
//     admin_id: Joi.number().required(),
//     type: Joi.string().valid('add', 'remove').required(),
//     module: Joi.valid(...permissions).required()
// })), authModel.manage_role_permissions);

// router.post("/action_admins", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
//     type: Joi.string().valid("is_edit", "is_delete", "is_copy", "is_download", "is_view", "user_type", "profile_image", "password").required(),
//     value: Joi.when('type', {
//         switch: [
//             { is: 'is_edit', then: Joi.number().max(1).required() },
//             { is: 'is_delete', then: Joi.number().max(1).required() },
//             { is: 'is_copy', then: Joi.number().max(1).required() },
//             { is: 'is_download', then: Joi.number().max(1).required() },
//             { is: 'is_view', then: Joi.number().max(1).required() },
//             { is: 'user_type', then: Joi.string().valid('admin', 'sub_admin').required() },
//             { is: 'profile_image', then: Joi.string().required() },
//             { is: 'password', then: Joi.string().required() }
//         ],
//         otherwise: Joi.optional()
//     }),
//     admin_id: Joi.number().required()
// })), authModel.action_admins);

// router.post("/edit_user", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
//     admin_id: Joi.number().required(),
//     name: Joi.string().required(),
//     email: Joi.string().required(),
//     user_type: Joi.string().valid('admin', 'sub_admin').required(),
//     contact_number: Joi.string().required(),
//     alternative_contact_number: Joi.string().optional(),
//     country: Joi.string().valid(...COUNTRY).required(),
//     mac_address: Joi.string().optional(),
//     profile_image: Joi.string().optional(),
//     password: Joi.string().optional() 
// })), authModel.edit_user);

// router.post("/delete_user", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
//     admin_id: Joi.number().required()
// })), authModel.delete_user);

module.exports = router;