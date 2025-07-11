const constants = require('../../config/constants');
const { decryption, validateJoi, checkToken, checkRolePermission, checkApiKey } = require('../../middleware');
const menuModel = require('../../models/v1/menu.model');
const express = require('express');
const Joi = require('joi');
const router = express.Router();

//////////////////////////////////////////////////////////////////////
//                          Accompaniment                           //
//////////////////////////////////////////////////////////////////////

router.post("/accompaniment/add_item", checkApiKey, checkToken, checkRolePermission("accompaniment", "edit"), decryption, validateJoi(Joi.object({
    name: Joi.string().required(),
    price: Joi.number().required(),
    image: Joi.string().required(),
    country: Joi.string().valid(...constants.COUNTRY).required()
})), menuModel.accompaniment.add_item);

router.post("/accompaniment/edit_item", checkApiKey, checkToken, checkRolePermission("accompaniment", "edit"), decryption, validateJoi(Joi.object({
    accompaniment_id: Joi.number().required(),
    name: Joi.string().required(),
    price: Joi.number().required(),
    image: Joi.string().required(),
    country: Joi.string().valid(...constants.COUNTRY).required()
})), menuModel.accompaniment.edit_item);

router.post("/accompaniment/list_items", checkApiKey, checkToken, checkRolePermission("accompaniment", "view"), decryption, validateJoi(Joi.object({
    country: Joi.string().valid(...constants.COUNTRY).required()
})), menuModel.accompaniment.list_items);

router.post("/accompaniment/get_item", checkApiKey, checkToken, checkRolePermission("accompaniment", "view"), decryption, validateJoi(Joi.object({
    accompaniment_id: Joi.number().required()
})), menuModel.accompaniment.get_item);

router.post("/accompaniment/action", checkApiKey, checkToken, checkRolePermission("accompaniment", "edit"), decryption, validateJoi(Joi.object({
    accompaniment_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required(),
    is_active: Joi.number().valid(0, 1).required()
})), menuModel.accompaniment.action_item);

router.post("/accompaniment/delete_item", checkApiKey, checkToken, checkRolePermission("accompaniment", "delete"), decryption, validateJoi(Joi.object({
    accompaniment_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required()
})), menuModel.accompaniment.delete_item);

//////////////////////////////////////////////////////////////////////
//                             Add Ons                              //
//////////////////////////////////////////////////////////////////////

router.post("/add_ons/add_item", checkApiKey, checkToken, checkRolePermission("add_ons", "edit"), decryption, validateJoi(Joi.object({
    name: Joi.string().required(),
    price: Joi.number().required(),
    image: Joi.string().required(),
    country: Joi.string().valid(...constants.COUNTRY).required()
})), menuModel.add_ons.add_item);

router.post("/add_ons/edit_item", checkApiKey, checkToken, checkRolePermission("add_ons", "edit"), decryption, validateJoi(Joi.object({
    add_ons_id: Joi.number().required(),
    name: Joi.string().required(),
    price: Joi.number().required(),
    image: Joi.string().required(),
    country: Joi.string().valid(...constants.COUNTRY).required()
})), menuModel.add_ons.edit_item);

router.post("/add_ons/list_items", checkApiKey, checkToken, checkRolePermission("add_ons", "view"), decryption, validateJoi(Joi.object({
    country: Joi.string().valid(...constants.COUNTRY).required()
})), menuModel.add_ons.list_items);

router.post("/add_ons/get_item", checkApiKey, checkToken, checkRolePermission("add_ons", "view"), decryption, validateJoi(Joi.object({
    add_ons_id: Joi.number().required()
})), menuModel.add_ons.get_item);

router.post("/add_ons/action", checkApiKey, checkToken, checkRolePermission("add_ons", "edit"), decryption, validateJoi(Joi.object({
    add_ons_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required(),
    is_active: Joi.number().valid(0, 1).required()
})), menuModel.add_ons.action_item);

router.post("/add_ons/delete_item", checkApiKey, checkToken, checkRolePermission("add_ons", "delete"), decryption, validateJoi(Joi.object({
    add_ons_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required(),
})), menuModel.add_ons.delete_item);

//////////////////////////////////////////////////////////////////////
//                        Choice Catagories                         //
//////////////////////////////////////////////////////////////////////

router.post("/choice_catagories/add", checkApiKey, checkToken, checkRolePermission("menus", "edit"), decryption, validateJoi(Joi.object({
    name: Joi.string().required(),
    country: Joi.string().valid(...constants.COUNTRY).required()
})), menuModel.choice_catagories.add);

router.post("/choice_catagories/edit", checkApiKey, checkToken, checkRolePermission("menus", "edit"), decryption, validateJoi(Joi.object({
    choice_category_id: Joi.number().required(),
    name: Joi.string().required(),
    country: Joi.string().valid(...constants.COUNTRY).required()
})), menuModel.choice_catagories.edit);

router.post("/choice_catagories/get", checkApiKey, checkToken, checkRolePermission("menus", "view"), decryption, validateJoi(Joi.object({
    choice_category_id: Joi.number().required()
})), menuModel.choice_catagories.get);

router.post("/choice_catagories/list", checkApiKey, checkToken, checkRolePermission("menus", "view"), decryption, validateJoi(Joi.object({
    country: Joi.string().valid(...constants.COUNTRY).required()
})), menuModel.choice_catagories.list);

router.post("/choice_catagories/action", checkApiKey, checkToken, checkRolePermission("menus", "edit"), decryption, validateJoi(Joi.object({
    choice_category_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required(),
    is_active: Joi.number().valid(0, 1).required()
})), menuModel.choice_catagories.action);

router.post("/choice_catagories/delete", checkApiKey, checkToken, checkRolePermission("menus", "delete"), decryption, validateJoi(Joi.object({
    choice_category_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required()
})), menuModel.choice_catagories.delete);

//////////////////////////////////////////////////////////////////////
//                          Choice Items                            //
//////////////////////////////////////////////////////////////////////

router.post("/choice_items/add_item", checkApiKey, checkToken, checkRolePermission("menus", "edit"), decryption, validateJoi(Joi.object({
    choice_category_id: Joi.number().required(),
    name: Joi.string().required(),
    price: Joi.number().required(),
    image: Joi.string().required(),
    country: Joi.string().valid(...constants.COUNTRY).required()
})), menuModel.choice_items.add_item);

router.post("/choice_items/edit_item", checkApiKey, checkToken, checkRolePermission("menus", "edit"), decryption, validateJoi(Joi.object({
    choice_item_id: Joi.number().required(),
    choice_category_id: Joi.number().required(),
    name: Joi.string().required(),
    price: Joi.number().required(),
    image: Joi.string().required(),
    country: Joi.string().valid(...constants.COUNTRY).required()
})), menuModel.choice_items.edit_item);

router.post("/choice_items/list_items", checkApiKey, checkToken, checkRolePermission("menus", "view"), decryption, validateJoi(Joi.object({
    country: Joi.string().valid(...constants.COUNTRY).required(),
    choice_category_id: Joi.number().optional()
})), menuModel.choice_items.list_items);

router.post("/choice_items/get_item", checkApiKey, checkToken, checkRolePermission("menus", "view"), decryption, validateJoi(Joi.object({
    choice_item_id: Joi.number().required()
})), menuModel.choice_items.get_item);

router.post("/choice_items/action", checkApiKey, checkToken, checkRolePermission("menus", "edit"), decryption, validateJoi(Joi.object({
    choice_item_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required(),
    is_active: Joi.number().valid(0, 1).required()
})), menuModel.choice_items.action_item);

router.post("/choice_items/delete_item", checkApiKey, checkToken, checkRolePermission("menus", "delete"), decryption, validateJoi(Joi.object({
    choice_item_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required()
})), menuModel.choice_items.delete_item);

//////////////////////////////////////////////////////////////////////
//                        Complimentary Items                       //
//////////////////////////////////////////////////////////////////////

router.post("/complimentary/add_item", checkApiKey, checkToken, checkRolePermission("menus", "edit"), decryption, validateJoi(Joi.object({
    name: Joi.string().required(),
    price: Joi.number().required(),
    image: Joi.string().required(),
    country: Joi.string().valid(...constants.COUNTRY).required()
})), menuModel.complimentary.add_item);

router.post("/complimentary/edit_item", checkApiKey, checkToken, checkRolePermission("menus", "edit"), decryption, validateJoi(Joi.object({
    complimentary_id: Joi.number().required(),
    name: Joi.string().required(),
    price: Joi.number().required(),
    image: Joi.string().required(),
    country: Joi.string().valid(...constants.COUNTRY).required()
})), menuModel.complimentary.edit_item);

router.post("/complimentary/list_items", checkApiKey, checkToken, checkRolePermission("menus", "view"), decryption, validateJoi(Joi.object({
    country: Joi.string().valid(...constants.COUNTRY).required()
})), menuModel.complimentary.list_items);

router.post("/complimentary/get_item", checkApiKey, checkToken, checkRolePermission("menus", "view"), decryption, validateJoi(Joi.object({
    complimentary_id: Joi.number().required()
})), menuModel.complimentary.get_item);

router.post("/complimentary/action_item", checkApiKey, checkToken, checkRolePermission("menus", "edit"), decryption, validateJoi(Joi.object({
    complimentary_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required(),
    is_active: Joi.number().valid(0, 1).required()
})), menuModel.complimentary.action_item);

router.post("/complimentary/delete_item", checkApiKey, checkToken, checkRolePermission("menus", "delete"), decryption, validateJoi(Joi.object({
    complimentary_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required()
})), menuModel.complimentary.delete_item);

//////////////////////////////////////////////////////////////////////
//                            Menu Items                            //
//////////////////////////////////////////////////////////////////////

router.post("/menu_items/top_selling_list", checkApiKey, checkToken, checkRolePermission("menus", "edit"), decryption, validateJoi(Joi.object({
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD format
    category_id: Joi.number().optional(),
    type: Joi.when('category_id', {
        is: Joi.exist(),
        then: Joi.string().valid('food', 'dessert', 'drink').required(),
        otherwise: Joi.when('date', {
            is: Joi.exist(),
            then: Joi.string().valid('food', 'dessert', 'drink').required(),
            otherwise: Joi.optional()
        }),
    }),
})), menuModel.menu_items.top_selling_list);

router.post("/menu_items/add_item", checkApiKey, checkToken, checkRolePermission("menus", "edit"), decryption, validateJoi(Joi.object({
    category_id: Joi.number().required(),
    sub_category_id: Joi.number().required(),
    is_create_combo: Joi.number().valid(0, 1).required(),
    is_view_purpose_only: Joi.number().valid(0, 1).required(),
    is_mark_as_new: Joi.number().valid(0, 1).required(),
    customer_type: Joi.string().valid('all', 'premium').default('all'),
    start_date: Joi.when('is_mark_as_new', {
        is: 1,
        then: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(), // YYYY-MM-DD format
        otherwise: Joi.optional()
    }),
    end_date: Joi.when('is_mark_as_new', {
        is: 1,
        then: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(), // YYYY-MM-DD format
        otherwise: Joi.optional()
    }),
    name: Joi.string().allow(''),
    preparation_time: Joi.number().required(),
    is_mark_you_may_like: Joi.number().valid(0, 1).required(),
    images: Joi.object({
        thumbnail_image: Joi.string().required(),
        cover_image: Joi.string().required(),
        product_images: Joi.array().items(Joi.string()).min(1).required()
    }).required(),
    description: Joi.string(),
    allergy_ids: Joi.array().items(Joi.number()).default([]),
    serve_start_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).message('serve_end_time must be in HH:mm:ss format'),
    serve_end_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).message('serve_end_time must be in HH:mm:ss format'),
    country: Joi.string().valid(...constants.COUNTRY).optional(),
    currency: Joi.string().valid(...constants.CURRENCY).required(),
    price: Joi.number().required(),
    is_selected_size_options: Joi.number().valid(0, 1).required(),
    sizes: Joi.when('is_selected_size_options', {
        is: 1,
        then: Joi.array().items(Joi.object({
            size: Joi.string().required(),
            price: Joi.string().required()
        })).min(1).required(),
        otherwise: Joi.optional()
    }),
    is_selected_choices: Joi.number().valid(0, 1).required(),
    choices: Joi.when('is_selected_choices', {
        is: 1,
        then: Joi.array().items(Joi.object({
            choice_category_id: Joi.number().integer().required(),
            choice_items: Joi.array().items(Joi.object({
                choice_item_id: Joi.number().integer().required(),
                sequence: Joi.number().integer().required()
            })).min(1).required()
        })).min(1).required(),
        otherwise: Joi.optional()
    }),
    is_selected_accompaniments: Joi.number().valid(0, 1).required(),
    accompaniments: Joi.when('is_selected_accompaniments', {
        is: 1,
        then: Joi.array().items(Joi.object({
            accompaniment_id: Joi.number().integer().required(),
            sequence: Joi.number().integer().required()
        })).min(1).required(),
        otherwise: Joi.optional()
    }),
    is_selected_add_ons: Joi.number().valid(0, 1).required(),
    add_ons: Joi.when('is_selected_add_ons', {
        is: 1,
        then: Joi.array().items(Joi.object({
            add_ons_id: Joi.number().integer().required(),
            sequence: Joi.number().integer().required()
        })).min(1).required(),
        otherwise: Joi.optional()
    })
})), menuModel.menu_items.add_item);

router.post("/menu_items/edit_item", checkApiKey, checkToken, checkRolePermission("menus", "edit"), decryption, validateJoi(Joi.object({
    menu_item_id: Joi.number().required(),
    category_id: Joi.number().required(),
    sub_category_id: Joi.number().required(),
    customer_type: Joi.string().valid('all', 'premium').default('all'),
    is_create_combo: Joi.number().valid(0, 1).required(),
    is_view_purpose_only: Joi.number().valid(0, 1).required(),
    is_mark_as_new: Joi.number().valid(0, 1).required(),
    start_date: Joi.when('is_mark_as_new', {
        is: 1,
        then: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(), // YYYY-MM-DD format
        otherwise: Joi.optional()
    }),
    end_date: Joi.when('is_mark_as_new', {
        is: 1,
        then: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(), // YYYY-MM-DD format
        otherwise: Joi.optional()
    }),
    name: Joi.string().allow(''),
    preparation_time: Joi.number().required(),
    is_mark_you_may_like: Joi.number().valid(0, 1).required(),
    images: Joi.object({
        thumbnail_image: Joi.string().required(),
        cover_image: Joi.string().required(),
        product_images: Joi.array().items(Joi.string()).min(1).required()
    }).required(),
    description: Joi.string(),
    allergy_ids: Joi.array().items(Joi.number()).default([]),
    serve_start_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).message('serve_end_time must be in HH:mm:ss format'),
    serve_end_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).message('serve_end_time must be in HH:mm:ss format'),
    country: Joi.string().valid(...constants.COUNTRY).optional(),
    currency: Joi.string().valid(...constants.CURRENCY).required(),
    price: Joi.number().required(),
    is_selected_size_options: Joi.number().valid(0, 1).required(),
    sizes: Joi.when('is_selected_size_options', {
        is: 1,
        then: Joi.array().items(Joi.object({
            size: Joi.string().required(),
            price: Joi.string().required()
        })).min(1).required(),
        otherwise: Joi.optional()
    }),
    is_selected_choices: Joi.number().valid(0, 1).required(),
    choices: Joi.when('is_selected_choices', {
        is: 1,
        then: Joi.array().items(Joi.object({
            choice_category_id: Joi.number().integer().required(),
            choice_items: Joi.array().items(Joi.object({
                choice_item_id: Joi.number().integer().required(),
                sequence: Joi.number().integer().required()
            })).min(1).required()
        })).min(1).required(),
        otherwise: Joi.optional()
    }),
    is_selected_accompaniments: Joi.number().valid(0, 1).required(),
    accompaniments: Joi.when('is_selected_accompaniments', {
        is: 1,
        then: Joi.array().items(Joi.object({
            accompaniment_id: Joi.number().integer().required(),
            sequence: Joi.number().integer().required()
        })).min(1).required(),
        otherwise: Joi.optional()
    }),
    is_selected_add_ons: Joi.number().valid(0, 1).required(),
    add_ons: Joi.when('is_selected_add_ons', {
        is: 1,
        then: Joi.array().items(Joi.object({
            add_ons_id: Joi.number().integer().required(),
            sequence: Joi.number().integer().required()
        })).min(1).required(),
        otherwise: Joi.optional()
    })
})), menuModel.menu_items.edit_item);

router.post("/menu_items/normal_edit_item", checkApiKey, checkToken, checkRolePermission("menus", "edit"), decryption, validateJoi(Joi.object({
    menu_item_id: Joi.number().required(),
    type: Joi.string().valid('service_switch', 'image_remove', 'allergens', 'choices', 'accompaniment', 'add_ons').required(),
    value: Joi.when('type', {
        is: 'service_switch',
        then: Joi.object({
            key: Joi.string().valid('is_serviceable', 'is_available_dine_in', 'is_available_pick_up', 'is_available_carhop', 'is_available_delivery').required(),
            value: Joi.number().valid(0, 1).required()
        }).required(),
        otherwise: Joi.when('type', {
            is: 'image_remove',
            then: Joi.string().required(),
            otherwise: Joi.when('type', {
                is: 'allergens',
                then: Joi.number().required(),
                otherwise: Joi.when('type', {
                    is: 'choices',
                    then: Joi.array().items(Joi.object({
                        choice_category_id: Joi.number().integer().required(),
                        choice_items: Joi.array().items(Joi.object({
                            choice_item_id: Joi.number().integer().required(),
                            sequence: Joi.number().integer().required()
                        })).min(1).required()
                    })).min(1).required(),
                    otherwise: Joi.when('type', {
                        is: 'accompaniment',
                        then: Joi.array().items(Joi.object({
                            accompaniment_id: Joi.number().integer().required(),
                            sequence: Joi.number().integer().required()
                        })).min(1).required(),
                        otherwise: Joi.when('type', {
                            is: 'add_ons',
                            then: Joi.array().items(Joi.object({
                                add_ons_id: Joi.number().integer().required(),
                                sequence: Joi.number().integer().required()
                            })).min(1).required(),
                            otherwise: Joi.any()
                        })
                    })
                })
            })
        })
    })
})), menuModel.menu_items.normal_edit_item);

router.post("/menu_items/get_item", checkApiKey, checkToken, checkRolePermission("menus", "view"), decryption, validateJoi(Joi.object({
    menu_item_id: Joi.number().required()
})), menuModel.menu_items.get_item);

router.post("/menu_items/list_items", checkApiKey, checkToken, checkRolePermission("menus", "view"), decryption, validateJoi(Joi.object({
    category_id: Joi.number().optional(),
    sub_category_id: Joi.when('category_id', {
        is: Joi.exist(),
        then: Joi.number().required(),
        otherwise: Joi.number().optional()
    }),
})), menuModel.menu_items.list_items);

router.post("/menu_items/action", checkApiKey, checkToken, checkRolePermission("menus", "edit"), decryption, validateJoi(Joi.object({
    menu_item_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required(),
    is_active: Joi.number().valid(0, 1).required()
})), menuModel.menu_items.action_item);

router.post("/menu_items/delete_item", checkApiKey, checkToken, checkRolePermission("menus", "delete"), decryption, validateJoi(Joi.object({
    menu_item_id: Joi.alternatives().try(
        Joi.number().min(1),
        Joi.array().items(Joi.number()).min(1)
    ).required()
})), menuModel.menu_items.delete_item);

router.post("/menu_items/set_deactivate_item", checkApiKey, checkToken, checkRolePermission("menus", "edit"), decryption, validateJoi(Joi.object({
    menu_item_ids: Joi.array().items(Joi.number()).min(1).required(),
    start_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(), // YYYY-MM-DD format
    end_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(), // YYYY-MM-DD format
    start_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).message('start_time must be in HH:mm format'),
    end_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).message('end_time must be in HH:mm format'),
    restaurant_ids: Joi.array().items(Joi.number()).min(1).required()
})), menuModel.menu_items.set_deactivate_item);

router.post("/menu_items/deactive_items_list", checkApiKey, checkToken, checkRolePermission("menus", "view"), decryption, menuModel.menu_items.deactive_items_list);

//////////////////////////////////////////////////////////////////////
//                            Allergies                             //
//////////////////////////////////////////////////////////////////////

router.get("/allergies/list", checkApiKey, checkToken, checkRolePermission("menus", "view"), menuModel.allergies_list);

//////////////////////////////////////////////////////////////////////
//                         delivery charges                         //
//////////////////////////////////////////////////////////////////////

router.post('/delivery_charges/option/restaurant_list', checkApiKey, checkToken, menuModel.delivery_charges.restaurant_list);

router.post('/delivery_charges/list', checkApiKey, checkToken, checkRolePermission("delivery_charges", "view"), menuModel.delivery_charges.list);

router.post('/delivery_charges/get', checkApiKey, checkToken, checkRolePermission("delivery_charges", "view"), decryption, validateJoi(Joi.object({
    restaurant_id: Joi.number().required()
})), menuModel.delivery_charges.get);

router.post('/delivery_charges/add', checkApiKey, checkToken, checkRolePermission("delivery_charges", "edit"), decryption, validateJoi(Joi.object({
    restaurant_id: Joi.number().min(0).required(),
    min_order_free_delivery: Joi.number().required(),
    delivery_charges: Joi.array().items(Joi.object({
        distance_from_km: Joi.number().min(0).required(),
        distance_to_km: Joi.number().min(0).required(),
        delivery_charge: Joi.number().min(0).required()
    })).required()
})), menuModel.delivery_charges.add);

router.post('/delivery_charges/edit', checkApiKey, checkToken, checkRolePermission("delivery_charges", "edit"), decryption, validateJoi(Joi.object({
    restaurant_id: Joi.number().min(0).required(),
    min_order_free_delivery: Joi.number().required(),
    delivery_charges: Joi.array().items(Joi.object({
        delivery_charge_id: Joi.number().min(0).optional(),
        distance_from_km: Joi.number().min(0).required(),
        distance_to_km: Joi.number().min(0).required(),
        delivery_charge: Joi.number().min(0).required()
    })).required()
})), menuModel.delivery_charges.edit);

module.exports = router;