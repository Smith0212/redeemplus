const { decryption, validateJoi, checkToken, checkApiKey } = require('../../middleware');
const authModel = require('../../models/v1/auth.model');
const express = require('express');
const Joi = require('joi');
const router = express.Router();
const { COUNTRY, permissions } = require('../../config/constants');

//////////////////////////////////////////////////////////////////////
//                              Auth                                //
//////////////////////////////////////////////////////////////////////

router.post("/create_user", checkApiKey, decryption, validateJoi(Joi.object({
    name: Joi.string().required(),
    email: Joi.string().required(),
    password: Joi.string().required(),
    user_type: Joi.string().valid('admin', 'sub_admin').required(),
    contact_number: Joi.string().required(),
    alternative_contact_number: Joi.string().optional(),
    country: Joi.string().valid(...COUNTRY).required(),
    mac_address: Joi.string().required(),
    profile_image: Joi.string().optional()
})), authModel.create_user);

router.post("/access_account", checkApiKey, decryption, validateJoi(Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required(),
    country: Joi.string().valid(...COUNTRY).required(),
    device_details: Joi.object({
        device_name: Joi.string().optional(),
        device_type: Joi.string().valid('A', 'I', 'W').required(),
        device_token: Joi.string().required(),
        model_name: Joi.string().optional(),
        uuid: Joi.string().required(),
        os_version: Joi.string().required(),
        app_version: Joi.string().optional(),
        ip: Joi.string().required(),
        time_zone: Joi.string().required()
    }).required()
})), authModel.access_account);

router.post("/change_password", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    old_password: Joi.string().required(),
    new_password: Joi.string().required()
})), authModel.change_password);

router.post(["/get_details", "/get_role_permissions"], checkApiKey, checkToken, decryption, authModel.get_details);

router.post("/edit_profile", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    name: Joi.string().required(),
    email: Joi.string().required(),
    contact_number: Joi.string().required(),
    profile_image: Joi.string().required(),
    user_type: Joi.string().valid('admin', 'sub_admin').required()
})), authModel.edit_profile);

router.post("/logout", checkApiKey, checkToken, decryption, authModel.logout);

router.post("/admin_list", checkApiKey, checkToken, authModel.admin_list);

router.post("/manage_role_permissions", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    admin_id: Joi.number().required(),
    type: Joi.string().valid('add', 'remove').required(),
    module: Joi.valid(...permissions).required()
})), authModel.manage_role_permissions);

router.post("/action_admins", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    type: Joi.string().valid("is_edit", "is_delete", "is_copy", "is_download", "is_view", "user_type", "profile_image", "password").required(),
    value: Joi.when('type', {
        switch: [
            { is: 'is_edit', then: Joi.number().max(1).required() },
            { is: 'is_delete', then: Joi.number().max(1).required() },
            { is: 'is_copy', then: Joi.number().max(1).required() },
            { is: 'is_download', then: Joi.number().max(1).required() },
            { is: 'is_view', then: Joi.number().max(1).required() },
            { is: 'user_type', then: Joi.string().valid('admin', 'sub_admin').required() },
            { is: 'profile_image', then: Joi.string().required() },
            { is: 'password', then: Joi.string().required() }
        ],
        otherwise: Joi.optional()
    }),
    admin_id: Joi.number().required()
})), authModel.action_admins);

router.post("/edit_user", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    admin_id: Joi.number().required(),
    name: Joi.string().required(),
    email: Joi.string().required(),
    user_type: Joi.string().valid('admin', 'sub_admin').required(),
    contact_number: Joi.string().required(),
    alternative_contact_number: Joi.string().optional(),
    country: Joi.string().valid(...COUNTRY).required(),
    mac_address: Joi.string().optional(),
    profile_image: Joi.string().optional(),
    password: Joi.string().optional() 
})), authModel.edit_user);

router.post("/delete_user", checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    admin_id: Joi.number().required()
})), authModel.delete_user);

module.exports = router;