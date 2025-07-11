const { decryption, validateJoi, checkToken, checkRolePermission, checkApiKey } = require('../../middleware');
const categoryModel = require('../../models/v1/category.model');
const express = require('express');
const Joi = require('joi');
const router = express.Router();

//////////////////////////////////////////////////////////////////////
//                            category                              //
//////////////////////////////////////////////////////////////////////

router.post("/add_category", checkApiKey, checkToken, checkRolePermission("category", "edit"), decryption, validateJoi(Joi.object({
    name: Joi.string().required(),
    available_all_day: Joi.number().max(1).required(),
    is_drink: Joi.valid(0, 1).required(),
    is_dessert: Joi.valid(0, 1).required(),
    time_from: Joi.when('available_all_day', {
        is: 0,        // When available_all_day is false
        then: Joi.string().required(),  // time_from is required
        otherwise: Joi.string().allow(null).default(null)  // Else default to null
    }),
    time_upto: Joi.when('available_all_day', {
        is: 0,        // When available_all_day is false
        then: Joi.string().required(),  // time_upto is required
        otherwise: Joi.string().allow(null).default(null)  // Else default to null
    }),
    images: Joi.array().items(Joi.string()).required()
})), categoryModel.add_category);

router.post("/edit_category", checkApiKey, checkToken, checkRolePermission("category", "edit"), decryption, validateJoi(Joi.object({
    name: Joi.string().required(),
    available_all_day: Joi.number().max(1).required(),
    is_drink: Joi.valid(0, 1).required(),
    is_dessert: Joi.valid(0, 1).required(),
    time_from: Joi.when('available_all_day', {
        is: 0,        // When available_all_day is false
        then: Joi.string().required(),  // time_from is required
        otherwise: Joi.string().allow(null).default(null)  // Else default to null
    }),
    time_upto: Joi.when('available_all_day', {
        is: 0,        // When available_all_day is false
        then: Joi.string().required(),  // time_upto is required
        otherwise: Joi.string().allow(null).default(null)  // Else default to null
    }),
    images: Joi.array().items(Joi.string()).default([])
})), categoryModel.edit_category);

router.get("/list_categories", checkApiKey, checkToken, checkRolePermission("category", "view"), decryption, categoryModel.list_categories);

router.post("/get_category", checkApiKey, checkToken, checkRolePermission("category", "view"), decryption, validateJoi(Joi.object({
    category_id: Joi.number().required()
})), categoryModel.get_category);

router.post("/action_category", checkApiKey, checkToken, checkRolePermission("category", "edit"), decryption, validateJoi(Joi.object({
    category_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required(),
    is_active: Joi.number().valid(0, 1).required()
})), categoryModel.action_category);

router.post("/delete_category", checkApiKey, checkToken, decryption, checkRolePermission("category", "delete"), validateJoi(Joi.object({
    category_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required()
})), categoryModel.delete_category);

//////////////////////////////////////////////////////////////////////
//                          sub category                            //
//////////////////////////////////////////////////////////////////////

router.post("/add_sub_category", checkApiKey, checkToken, checkRolePermission("sub_category", "edit"), decryption, validateJoi(Joi.object({
    category_id: Joi.number().required(),
    name: Joi.string().required(),
    images: Joi.array().items(Joi.string()).required()
})), categoryModel.add_sub_category);

router.post("/edit_sub_category", checkApiKey, checkToken, checkRolePermission("sub_category", "edit"), decryption, validateJoi(Joi.object({
    sub_category_id: Joi.number().required(),
    category_id: Joi.number().required(),
    name: Joi.string().required(),
    images: Joi.array().items(Joi.string()).default([])
})), categoryModel.edit_sub_category);

router.post("/list_sub_categories", checkApiKey, checkToken, checkRolePermission("sub_category", "view"), decryption, validateJoi(Joi.object({
    category_id: Joi.number().optional()
})), categoryModel.list_sub_categories);

router.post("/get_sub_category", checkApiKey, checkToken, checkRolePermission("sub_category", "view"), decryption, validateJoi(Joi.object({
    sub_category_id: Joi.number().required()
})), categoryModel.get_sub_category);

router.post("/action_sub_category", checkApiKey, checkToken, checkRolePermission("sub_category", "edit"), decryption, validateJoi(Joi.object({
    sub_category_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required(),
    is_active: Joi.number().valid(0, 1).required()
})), categoryModel.action_sub_category);

router.post("/delete_sub_category", checkApiKey, checkToken, checkRolePermission("sub_category", "delete"), decryption, validateJoi(Joi.object({
    sub_category_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required()
})), categoryModel.delete_sub_category);

module.exports = router;