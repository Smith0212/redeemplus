const { decryption, checkToken, checkApiKey, checkRolePermission, validateJoi } = require('../../middleware');
const { loyaltyPointModel, membershipModel, rewardModel } = require('../../models/v1/loyalty.model');
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { CURRENCY } = require('../../config/constants');

//////////////////////////////////////////////////////////////////////
//                            Loyalty                              //
//////////////////////////////////////////////////////////////////////

router.post('/loyalty_point/save_setting', checkApiKey, checkToken, checkRolePermission("loyalty_points", "edit"), decryption, validateJoi(Joi.object({
    type: Joi.string().valid("expiry_day", "point_value", "max_redemption", "max_credit_percentage", "expiring_alert_notification").required(),
    value: Joi.number().required()
})), loyaltyPointModel.save_setting);

router.post('/loyalty_point/view_setting', checkApiKey, checkToken, checkRolePermission("loyalty_points", "view"), loyaltyPointModel.view_setting);

router.post('/loyalty_point/criteria_list', checkApiKey, checkToken, checkRolePermission("loyalty_points", "view"), decryption, loyaltyPointModel.criteria_list);

router.post('/loyalty_point/criteria_action', checkApiKey, checkToken, checkRolePermission("loyalty_points", "edit"), decryption, validateJoi(Joi.object({
    is_active: Joi.number().valid(0, 1).required(),
    criteria_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required()
})), loyaltyPointModel.criteria_action);

router.post('/loyalty_point/total_listing', checkApiKey, checkToken, checkRolePermission("loyalty_points", "view"), decryption, validateJoi(Joi.object({
    date: Joi.string().optional(),
    year: Joi.number().optional(),
})), loyaltyPointModel.total_listing);

router.post('/loyalty_point/history', checkApiKey, checkToken, checkRolePermission("loyalty_points", "view"), decryption, validateJoi(Joi.object({
    date: Joi.string().optional(),
    year: Joi.number().optional(),
})), loyaltyPointModel.history);

router.post('/loyalty_point/users_balance_list', checkApiKey, checkToken, checkRolePermission("loyalty_points", "view"), decryption, validateJoi(Joi.object({
    date: Joi.string().optional(),
    year: Joi.number().optional(),
})), loyaltyPointModel.users_balance_list);

router.post('/loyalty_point/user_profile', checkApiKey, checkToken, checkRolePermission("loyalty_points", "view"), decryption, validateJoi(Joi.object({
    user_id: Joi.number().required()
})), loyaltyPointModel.user_profile);

router.post('/loyalty_point/adjust_points', checkApiKey, checkToken, checkRolePermission("loyalty_points", "edit"), decryption, validateJoi(Joi.object({
    user_id: Joi.number().required(),
    points: Joi.number().required(),
    type: Joi.string().valid("add", "deduct").required(),
    comment: Joi.string().optional()
})), loyaltyPointModel.adjust_points);

//////////////////////////////////////////////////////////////////////
//                            Membership                            //
//////////////////////////////////////////////////////////////////////

router.post('/membership/user_list', checkApiKey, checkToken, checkRolePermission("membership", "edit"), decryption, validateJoi(Joi.object({
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional()
})), membershipModel.user_list);

router.post('/membership/user_count', checkApiKey, checkToken, checkRolePermission("membership", "view"), decryption, validateJoi(Joi.object({
    start_date: Joi.string().optional(),
    end_date: Joi.string().optional()
})), membershipModel.user_count);

router.post('/membership/edit', checkApiKey, checkToken, checkRolePermission("membership", "edit"), decryption, validateJoi(Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    current_benefits_ids: Joi.array().items(Joi.number()).min(1).required(),
})), membershipModel.edit);

router.post('/membership/view', checkApiKey, checkToken, checkRolePermission("membership", "view"), decryption, membershipModel.view);

//Membership benefits

router.post('/membership/benefit/add', checkApiKey, checkToken, checkRolePermission("membership", "edit"), decryption, validateJoi(Joi.object({
    name: Joi.string().required(),
    image: Joi.string().optional()
})), membershipModel.benefit.add_edit);

router.post('/membership/benefit/edit', checkApiKey, checkToken, checkRolePermission("membership", "edit"), decryption, validateJoi(Joi.object({
    benefit_id: Joi.number().required(),
    name: Joi.string().required(),
    image: Joi.string().optional()
})), membershipModel.benefit.add_edit);

router.post('/membership/benefit/view', checkApiKey, checkToken, checkRolePermission("membership", "view"), decryption, validateJoi(Joi.object({
    benefit_id: Joi.number().optional()
})), membershipModel.benefit.view);

router.post('/membership/benefit/action', checkApiKey, checkToken, checkRolePermission("membership", "edit"), decryption, validateJoi(Joi.object({
    is_active: Joi.number().valid(0, 1).required(),
    benefit_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required()
})), membershipModel.benefit.action);

router.post('/membership/benefit/delete', checkApiKey, checkToken, checkRolePermission("membership", "delete"), decryption, validateJoi(Joi.object({
    benefit_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required()
})), membershipModel.benefit.delete);

//Membership plan

router.post('/membership/plan/add', checkApiKey, checkToken, checkRolePermission("membership", "edit"), decryption, validateJoi(Joi.object({
    title: Joi.string().required(),
    valid_range: Joi.number().required(),
    price: Joi.number().required()
})), membershipModel.plan.add_edit);

router.post('/membership/plan/edit', checkApiKey, checkToken, checkRolePermission("membership", "edit"), decryption, validateJoi(Joi.object({
    plan_id: Joi.number().required(),
    title: Joi.string().required(),
    valid_range: Joi.number().required(),
    price: Joi.number().required()
})), membershipModel.plan.add_edit);

router.post('/membership/plan/view', checkApiKey, checkToken, checkRolePermission("membership", "view"), decryption, validateJoi(Joi.object({
    plan_id: Joi.number().optional()
})), membershipModel.plan.view);

router.post('/membership/plan/action', checkApiKey, checkToken, checkRolePermission("membership", "edit"), decryption, validateJoi(Joi.object({
    is_active: Joi.number().valid(0, 1).required(),
    plan_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required()
})), membershipModel.plan.action);

router.post('/membership/plan/delete', checkApiKey, checkToken, checkRolePermission("membership", "delete"), decryption, validateJoi(Joi.object({
    plan_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required()
})), membershipModel.plan.delete);

//////////////////////////////////////////////////////////////////////
//                             Rewards                              //
//////////////////////////////////////////////////////////////////////

//Rewards Benefits

router.post('/rewards/benefit/add', checkApiKey, checkToken, checkRolePermission("rewards", "edit"), decryption, validateJoi(Joi.object({
    name: Joi.string().required(),
    price: Joi.number().required(),
    currency: Joi.string().valid(...CURRENCY).required(),
    image: Joi.string().optional()
})), rewardModel.benefit.add_edit);

router.post('/rewards/benefit/edit', checkApiKey, checkToken, checkRolePermission("rewards", "edit"), decryption, validateJoi(Joi.object({
    benefit_id: Joi.number().required(),
    name: Joi.string().required(),
    price: Joi.number().required(),
    currency: Joi.string().valid(...CURRENCY).required(),
    image: Joi.string().optional()
})), rewardModel.benefit.add_edit);

router.post('/rewards/benefit/view', checkApiKey, checkToken, checkRolePermission("rewards", "view"), decryption, validateJoi(Joi.object({
    benefit_id: Joi.number().optional()
})), rewardModel.benefit.view);

router.post('/rewards/benefit/action', checkApiKey, checkToken, checkRolePermission("rewards", "edit"), decryption, validateJoi(Joi.object({
    is_active: Joi.number().valid(0, 1).required(),
    benefit_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required()
})), rewardModel.benefit.action);

router.post('/rewards/benefit/delete', checkApiKey, checkToken, checkRolePermission("rewards", "delete"), decryption, validateJoi(Joi.object({
    benefit_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required()
})), rewardModel.benefit.delete);

//Rewards Tiers

router.post('/rewards/tier/add', checkApiKey, checkToken, checkRolePermission("rewards", "edit"), decryption, validateJoi(Joi.object({
    name: Joi.string().required(),
    from_credits: Joi.number().min(0).required(),
    upto_credits: Joi.number().min(1).required(),
    benefit_ids: Joi.array().items(Joi.number()).min(1).required()
})), rewardModel.tier.add_edit);

router.post('/rewards/tier/edit', checkApiKey, checkToken, checkRolePermission("rewards", "edit"), decryption, validateJoi(Joi.object({
    tier_id: Joi.number().required(),
    name: Joi.string().required(),
    from_credits: Joi.number().min(0).required(),
    upto_credits: Joi.number().min(1).required(),
    benefit_ids: Joi.array().items(Joi.number()).min(1).required()
})), rewardModel.tier.add_edit);

router.post('/rewards/tier/view', checkApiKey, checkToken, checkRolePermission("rewards", "view"), decryption, validateJoi(Joi.object({
    tier_id: Joi.number().required()
})), rewardModel.tier.view);

router.post('/rewards/tier/list', checkApiKey, checkToken, checkRolePermission("rewards", "view"), decryption, validateJoi(Joi.object({
    tier_id: Joi.number().optional()
})), rewardModel.tier.list);

module.exports = router;