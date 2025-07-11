const { decryption, checkToken, checkApiKey, checkRolePermission, validateJoi } = require('../../middleware');
const otherModel = require('../../models/v1/other.model');
const express = require('express');
const { COUNTRY } = require('../../config/constants');
const router = express.Router();
const Joi = require('joi');

//////////////////////////////////////////////////////////////////////
//                           Setting                                //
//////////////////////////////////////////////////////////////////////

router.get('/credentials', checkApiKey, checkToken, decryption, otherModel.credentials);

router.post('/page_content/get', checkApiKey, checkToken, checkRolePermission("manage_pages", "view"), decryption, validateJoi(Joi.object({
    page_id: Joi.number().required()
})), otherModel.page_contents.get);

router.post('/page_content/create', checkApiKey, checkToken, checkRolePermission("manage_pages", "edit"), decryption, validateJoi(Joi.object({
    name: Joi.string().required(),
    user_type: Joi.valid('rider', 'user', 'branch', 'admin').required(),
})), otherModel.page_contents.create);

router.post('/page_content/update', checkApiKey, checkToken, checkRolePermission("manage_pages", "edit"), decryption, validateJoi(Joi.object({
    page_id: Joi.number().required(),
    content: Joi.required(),
    user_type: Joi.valid('rider', 'user', 'branch', 'admin').optional(),
})), otherModel.page_contents.update);

router.post('/page_content/list', checkApiKey, checkToken, checkRolePermission("manage_pages", "view"), otherModel.page_contents.list);
router.post('/page_content/delete', checkApiKey, checkToken, checkRolePermission("manage_pages", "delete"), decryption, validateJoi(Joi.object({
    page_id: Joi.number().required(),
})), otherModel.page_contents.delete);

//////////////////////////////////////////////////////////////////////
//                        Select Option List                        //
//////////////////////////////////////////////////////////////////////

router.post('/select_option_list', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    type: Joi.valid('rider', 'restaurant', 'customer', 'category', 'sub_category', 'inventory_category', 'inventory_sub_category').required(),
    country: Joi.string().optional(),
    search: Joi.string().optional(),
    category_id: Joi.when('type', {
        is: 'sub_category',
        then: Joi.number().required(),
        otherwise: Joi.optional()
    }),
})), otherModel.select_option_list);

router.post('/normal_option_list', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    type: Joi.valid('user_comment_preparation_issues', 'user_comment_rider_issues', 'user_comment_customer_issues', 'user_comment_admin_issues').required()
})), otherModel.normal_option_list);

router.post('/faq', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    language_code: Joi.valid('en').required(),
    user_type: Joi.valid('rider', 'user', 'branch', 'admin').required()
})), otherModel.faq);

router.post('/crud_faq', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    type: Joi.valid('create', 'update', 'delete', 'read', 'get').required(),
    value: Joi.when('type', {
        switch: [
            {
                is: 'create', then: Joi.object({
                    question: Joi.string().required(),
                    answer: Joi.string().required(),
                    language_code: Joi.valid('en').required(),
                    user_type: Joi.valid('rider', 'user', 'branch', 'admin').required(),
                    sort_order: Joi.number().optional()
                }).required()
            },
            {
                is: 'update', then: Joi.object({
                    faq_id: Joi.number().required(),
                    question: Joi.string().required(),
                    answer: Joi.string().required(),
                    sort_order: Joi.number().optional()
                }).required()
            },
            {
                is: 'delete', then: Joi.object({
                    faq_id: Joi.number().required()
                }).required()
            },
            {
                is: 'read', then: Joi.optional()
            },
            {
                is: 'get', then: Joi.object({
                    faq_id: Joi.number().required()
                })
            }
        ]
    }).required()
})), otherModel.crud_faq);

//////////////////////////////////////////////////////////////////////
//                              Agent                               //
//////////////////////////////////////////////////////////////////////

router.post('/agent/add', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    name: Joi.string().required(),
    email: Joi.string().required(),
    password: Joi.string().required(),
    user_type: Joi.string().valid('agent_admin', 'agent').required(),
    country_code: Joi.string().required(),
    contact_number: Joi.string().required(),
    alternative_contact: Joi.string().required(),
    country: Joi.string().valid(...COUNTRY).required(),
    mac_address: Joi.string().required(),
    shift_start_time: Joi.string().required(),
    shift_end_time: Joi.string().required(),
    ref_name: Joi.string().optional(),
    ref_contact: Joi.string().optional(),
    profile_image: Joi.string().optional()
})), otherModel.add_agent);

router.post('/agent/edit', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    agent_id: Joi.number().required(),
    name: Joi.string().required(),
    email: Joi.string().required(),
    password: Joi.string().optional(),
    user_type: Joi.string().valid('agent_admin', 'agent').required(),
    country_code: Joi.string().required(),
    contact_number: Joi.string().required(),
    alternative_contact: Joi.string().required(),
    country: Joi.string().valid(...COUNTRY).required(),
    mac_address: Joi.string().required(),
    shift_start_time: Joi.string().required(),
    shift_end_time: Joi.string().required(),
    ref_name: Joi.string().optional(),
    ref_contact: Joi.string().optional(),
    profile_image: Joi.string().optional()
})), otherModel.edit_agent);

router.post('/agent/list', checkApiKey, checkToken, otherModel.list_agents);

router.post('/agent/get', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    agent_id: Joi.number().required()
})), otherModel.get_agent);

router.post('/agent/delete', checkApiKey, checkToken, decryption, validateJoi(Joi.object({
    agent_id: Joi.number().required()
})), otherModel.delete_agent);

module.exports = router;