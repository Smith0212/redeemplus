const { SELECT, INSERT, UPDATE, DELETE } = require('../../utils/SQLWorker');
const { sendResponse } = require('../../middleware');
const constants = require('../../config/constants');
const { save_multiple_images, update_multiple_images, category_or_sub_category } = require('../../utils/common');
const _ = require('lodash');
const each = require('async-each');

let menu_model = {

    accompaniment: {
        add_item: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { name, price, image, country } = req.body;

                let data = {
                    name: name,
                    price: price,
                    image: image,
                    country: country,
                    currency: (country == 'Kenya') ? 'KES' : 'UGX',
                    created_by: admin_id
                };

                let insert_id = await INSERT(`INSERT INTO tbl_accompaniments SET ?`, data);

                return sendResponse(req, res, 200, 1, { keyword: "added", components: {} }, {
                    accompaniment_id: insert_id,
                    ...data,
                    image: constants.MENU_ACCOMPANIMENTS_IMAGE_PATH + image
                });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_add", components: {} });
            }
        },

        edit_item: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { accompaniment_id, name, price, image, country } = req.body;

                let data = {
                    name: name,
                    price: price,
                    image: image,
                    country: country,
                    currency: (country == 'Kenya') ? 'KES' : 'UGX',
                    updated_by: admin_id
                };

                await UPDATE(`UPDATE tbl_accompaniments SET ? WHERE id = ?`, [data, accompaniment_id]);

                return sendResponse(req, res, 200, 1, { keyword: "edited", components: {} }, {
                    accompaniment_id: accompaniment_id,
                    ...data,
                    image: constants.MENU_ACCOMPANIMENTS_IMAGE_PATH + image
                });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_edit", components: {} });
            }
        },

        list_items: async (req, res) => {
            try {
                let { country } = req.body;

                let accompaniments = await SELECT.All(`SELECT id as accompaniment_id, name, price, concat('${constants.MENU_ACCOMPANIMENTS_IMAGE_PATH}', image) as image, country, currency, is_active, created_at FROM tbl_accompaniments WHERE country = '${country}' AND is_delete = 0`);

                return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, accompaniments);
            } catch (e) {
                return sendResponse(req, res, 200, 2, { keyword: e?.message || "failed_to_fetch", components: {} });
            }
        },

        get_item: async (req, res) => {
            try {
                let { accompaniment_id } = req.body;

                let accompaniment = await SELECT.One(`SELECT id as accompaniment_id, name, price, concat('${constants.MENU_ACCOMPANIMENTS_IMAGE_PATH}', image) as image, country, currency, is_active, created_at FROM tbl_accompaniments WHERE id = ${accompaniment_id} AND is_delete = 0`);

                return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, accompaniment);
            } catch (e) {
                return sendResponse(req, res, 200, 2, { keyword: e?.message || "failed_to_fetch", components: {} });
            }
        },

        action_item: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { accompaniment_id, is_active } = req.body;

                await UPDATE(`UPDATE tbl_accompaniments SET is_active = ${is_active}, updated_by = ${admin_id} WHERE id in (${accompaniment_id})`);

                return sendResponse(req, res, 200, 1, { keyword: "status_updated", components: {} });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_update_status", components: {} });
            }
        },

        delete_item: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { accompaniment_id } = req.body;

                await UPDATE(`UPDATE tbl_accompaniments SET is_delete = 1, updated_by = ${admin_id} WHERE id in (${accompaniment_id})`);

                return sendResponse(req, res, 200, 1, { keyword: "deleted", components: {} });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_delete", components: {} });
            }
        }
    },

    add_ons: {
        add_item: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { name, price, image, country } = req.body;

                let data = {
                    name: name,
                    price: price,
                    image: image,
                    country: country,
                    currency: (country == 'Kenya') ? 'KES' : 'UGX',
                    created_by: admin_id
                };

                let insert_id = await INSERT(`INSERT INTO tbl_add_ons SET ?`, data);

                return sendResponse(req, res, 200, 1, { keyword: "added", components: {} }, {
                    add_ons_id: insert_id,
                    ...data,
                    image: constants.MENU_ADD_ONS_IMAGE_PATH + image
                });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_add", components: {} });
            }
        },

        edit_item: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { add_ons_id, name, price, image, country } = req.body;

                let data = {
                    name: name,
                    price: price,
                    image: image,
                    country: country,
                    currency: (country == 'Kenya') ? 'KES' : 'UGX',
                    updated_by: admin_id
                };

                await UPDATE(`UPDATE tbl_add_ons SET ? WHERE id = ?`, [data, add_ons_id]);

                return sendResponse(req, res, 200, 1, { keyword: "edited", components: {} }, {
                    add_ons_id: add_ons_id,
                    ...data,
                    image: constants.MENU_ADD_ONS_IMAGE_PATH + image
                });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_edit", components: {} });
            }
        },

        list_items: async (req, res) => {
            try {
                let { country } = req.body;

                let accompaniments = await SELECT.All(`SELECT id as add_ons_id, name, price, concat('${constants.MENU_ADD_ONS_IMAGE_PATH}', image) as image, country, currency, is_active, created_at FROM tbl_add_ons WHERE country = '${country}' AND is_delete = 0`);

                return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, accompaniments);
            } catch (e) {
                return sendResponse(req, res, 200, 2, { keyword: e?.message || "failed_to_fetch", components: {} });
            }
        },

        get_item: async (req, res) => {
            try {
                let { add_ons_id } = req.body;

                let add_ons = await SELECT.One(`SELECT id as add_ons_id, name, price, concat('${constants.MENU_ADD_ONS_IMAGE_PATH}', image) as image, country, currency, is_active, created_at FROM tbl_add_ons WHERE id = ${add_ons_id} AND is_delete = 0`);

                return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, add_ons);
            } catch (e) {
                return sendResponse(req, res, 200, 2, { keyword: e?.message || "failed_to_fetch", components: {} });
            }
        },

        action_item: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { add_ons_id, is_active } = req.body;

                await UPDATE(`UPDATE tbl_add_ons SET is_active = ${is_active}, updated_by = ${admin_id} WHERE id in (${add_ons_id})`);

                return sendResponse(req, res, 200, 1, { keyword: "status_updated", components: {} });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_update_status", components: {} });
            }
        },

        delete_item: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { add_ons_id } = req.body;

                await UPDATE(`UPDATE tbl_add_ons SET is_delete = 1, updated_by = ${admin_id} WHERE id in (${add_ons_id})`);

                return sendResponse(req, res, 200, 1, { keyword: "deleted", components: {} });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_delete", components: {} });
            }
        }
    },

    choice_catagories: {
        add: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { name, country } = req.body;

                let data = {
                    name: name,
                    country: country,
                    currency: (country == 'Kenya') ? 'KES' : 'UGX',
                    created_by: admin_id
                };

                let insert_id = await INSERT(`INSERT INTO tbl_choice_categories SET ?`, data);

                return sendResponse(req, res, 200, 1, { keyword: "added", components: {} }, {
                    choice_category_id: insert_id,
                    ...data
                });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_add", components: {} });
            }
        },

        edit: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { choice_category_id, name, country } = req.body;

                let data = {
                    name: name,
                    country: country,
                    currency: (country == 'Kenya') ? 'KES' : 'UGX',
                    updated_by: admin_id
                };

                await UPDATE(`UPDATE tbl_choice_categories SET ? WHERE id = ?`, [data, choice_category_id]);

                return sendResponse(req, res, 200, 1, { keyword: "edited", components: {} }, {
                    choice_category_id: choice_category_id,
                    ...data
                });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_edit", components: {} });
            }
        },

        get: async (req, res) => {
            try {
                let { choice_category_id } = req.body;

                let choice_catagory = await SELECT.One(`SELECT id as choice_category_id, name, country, currency, (select count(id) from tbl_choice_items where choice_category_id = tbl_choice_categories.id AND is_delete = 0) as choice_items_count, is_active, created_at FROM tbl_choice_categories WHERE id = ${choice_category_id} AND is_delete = 0`);

                return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, choice_catagory);
            } catch (e) {
                return sendResponse(req, res, 200, 2, { keyword: e?.message || "failed_to_fetch", components: {} });
            }
        },

        list: async (req, res) => {
            try {
                let { country } = req.body;

                let choice_catagories = await SELECT.All(`SELECT id as choice_category_id, name, country, currency, (select count(id) from tbl_choice_items where choice_category_id = tbl_choice_categories.id AND is_delete = 0) as choice_items_count, is_combo, is_active, created_at FROM tbl_choice_categories WHERE country = '${country}' AND is_delete = 0`);

                return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, choice_catagories);
            } catch (e) {
                return sendResponse(req, res, 200, 2, { keyword: e?.message || "failed_to_fetch", components: {} });
            }
        },

        action: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { choice_category_id, is_active } = req.body;

                await UPDATE(`UPDATE tbl_choice_categories SET is_active = ${is_active}, updated_by = ${admin_id} WHERE id in (${choice_category_id})`);

                return sendResponse(req, res, 200, 1, { keyword: "status_updated", components: {} });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_update_status", components: {} });
            }
        },

        delete: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { choice_category_id } = req.body;

                await UPDATE(`UPDATE tbl_choice_categories SET is_delete = 1, updated_by = ${admin_id} WHERE id in (${choice_category_id})`);

                return sendResponse(req, res, 200, 1, { keyword: "deleted", components: {} });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_delete", components: {} });
            }
        },
    },

    choice_items: {
        add_item: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { choice_category_id, name, price, country, image } = req.body;

                let data = {
                    choice_category_id: choice_category_id,
                    name: name,
                    price: price,
                    country: country,
                    currency: (country == 'Kenya') ? 'KES' : 'UGX',
                    image: image,
                    created_by: admin_id
                };

                let insert_id = await INSERT(`INSERT INTO tbl_choice_items SET ?`, data);

                return sendResponse(req, res, 200, 1, { keyword: "added", components: {} }, {
                    choice_item_id: insert_id,
                    ...data,
                    image: constants.MENU_CHOICE_ITEMS_IMAGE_PATH + image
                });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_add", components: {} });
            }
        },

        edit_item: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { choice_item_id, choice_category_id, name, price, country, image } = req.body;

                let data = {
                    choice_category_id: choice_category_id,
                    name: name,
                    price: price,
                    country: country,
                    currency: (country == 'Kenya') ? 'KES' : 'UGX',
                    image: image,
                    updated_by: admin_id
                };

                await UPDATE(`UPDATE tbl_choice_items SET ? WHERE id = ?`, [data, choice_item_id]);

                return sendResponse(req, res, 200, 1, { keyword: "edited", components: {} }, {
                    choice_item_id: choice_item_id,
                    ...data,
                    image: constants.MENU_CHOICE_ITEMS_IMAGE_PATH + image
                });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_edit", components: {} });
            }
        },

        list_items: async (req, res) => {
            try {
                let { country, choice_category_id } = req.body;

                let addWhere = '';
                if (choice_category_id) {
                    addWhere = `ci.choice_category_id = ${choice_category_id} AND`;
                }

                let choice_items = await SELECT.All(`SELECT ci.id as choice_item_id, choice_category_id, cc.name as choice_category_name, ci.name, price, ci.country, ci.currency, concat('${constants.MENU_CHOICE_ITEMS_IMAGE_PATH}', image) as image, ci.is_active, ci.created_at FROM tbl_choice_items ci JOIN tbl_choice_categories cc ON ci.choice_category_id = cc.id WHERE ${addWhere} ci.country = '${country}' AND ci.is_delete = 0 AND cc.is_delete = 0`);

                return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, choice_items);
            } catch (e) {
                return sendResponse(req, res, 200, 2, { keyword: e?.message || "failed_to_fetch", components: {} });
            }
        },

        get_item: async (req, res) => {
            try {
                let { choice_item_id } = req.body;

                let choice_item = await SELECT.One(`SELECT ci.id as choice_item_id, ci.choice_category_id, cc.name as choice_category_name, ci.name, ci.price, ci.country, ci.currency, concat('${constants.MENU_CHOICE_ITEMS_IMAGE_PATH}', image) as image, ci.is_active, ci.created_at FROM tbl_choice_items ci JOIN tbl_choice_categories cc ON ci.choice_category_id = cc.id WHERE ci.id = ${choice_item_id} AND ci.is_delete = 0 AND cc.is_delete = 0`);

                return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, choice_item);
            } catch (e) {
                return sendResponse(req, res, 200, 2, { keyword: e?.message || "failed_to_fetch", components: {} });
            }
        },

        action_item: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { choice_item_id, is_active } = req.body;

                await UPDATE(`UPDATE tbl_choice_items SET is_active = ${is_active}, updated_by = ${admin_id} WHERE id in (${choice_item_id})`);

                return sendResponse(req, res, 200, 1, { keyword: "status_updated", components: {} });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_update_status", components: {} });
            }
        },

        delete_item: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { choice_item_id } = req.body;

                await UPDATE(`UPDATE tbl_choice_items SET is_delete = 1, updated_by = ${admin_id} WHERE id in (${choice_item_id})`);

                return sendResponse(req, res, 200, 1, { keyword: "deleted", components: {} });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_delete", components: {} });
            }
        }
    },

    complimentary: {
        add_item: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { name, price, image, country } = req.body;

                let data = {
                    name: name,
                    price: price,
                    image: image,
                    country: country,
                    currency: (country == 'Kenya') ? 'KES' : 'UGX',
                    created_by: admin_id
                };

                let insert_id = await INSERT(`INSERT INTO tbl_complimentary_items SET ?`, data);

                return sendResponse(req, res, 200, 1, { keyword: "added", components: {} }, {
                    complimentary_id: insert_id,
                    ...data,
                    image: constants.MENU_COMPLIMENTARY_IMAGE_PATH + image
                });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_add", components: {} });
            }
        },

        edit_item: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { complimentary_id, name, price, image, country } = req.body;

                let data = {
                    name: name,
                    price: price,
                    image: image,
                    country: country,
                    currency: (country == 'Kenya') ? 'KES' : 'UGX',
                    updated_by: admin_id
                };

                await UPDATE(`UPDATE tbl_complimentary_items SET ? WHERE id = ?`, [data, complimentary_id]);

                return sendResponse(req, res, 200, 1, { keyword: "edited", components: {} }, {
                    complimentary_id: complimentary_id,
                    ...data,
                    image: constants.MENU_COMPLIMENTARY_IMAGE_PATH + image
                });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_edit", components: {} });
            }
        },

        list_items: async (req, res) => {
            try {
                let { country } = req.body;

                let complimentary_items = await SELECT.All(`SELECT id as complimentary_id, name, price, concat('${constants.MENU_COMPLIMENTARY_IMAGE_PATH}', image) as image, country, currency, is_active, created_at FROM tbl_complimentary_items WHERE country = '${country}' AND is_delete = 0`);

                return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, complimentary_items);
            } catch (e) {
                return sendResponse(req, res, 200, 2, { keyword: e?.message || "failed_to_fetch", components: {} });
            }
        },

        get_item: async (req, res) => {
            try {
                let { complimentary_id } = req.body;

                let complimentary = await SELECT.One(`SELECT id as complimentary_id, name, price, concat('${constants.MENU_COMPLIMENTARY_IMAGE_PATH}', image) as image, country, currency, is_active, created_at FROM tbl_complimentary_items WHERE id = ${complimentary_id} AND is_delete = 0`);

                return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, complimentary);
            } catch (e) {
                return sendResponse(req, res, 200, 2, { keyword: e?.message || "failed_to_fetch", components: {} });
            }
        },

        action_item: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { complimentary_id, is_active } = req.body;

                await UPDATE(`UPDATE tbl_complimentary_items SET is_active = ${is_active}, updated_by = ${admin_id} WHERE id in (${complimentary_id})`);

                return sendResponse(req, res, 200, 1, { keyword: "status_updated", components: {} });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_update_status", components: {} });
            }
        },

        delete_item: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { complimentary_id } = req.body;

                await UPDATE(`UPDATE tbl_complimentary_items SET is_delete = 1, updated_by = ${admin_id} WHERE id in (${complimentary_id})`);

                return sendResponse(req, res, 200, 1, { keyword: "deleted", components: {} });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_delete", components: {} });
            }
        }
    },

    menu_items: {
        top_selling_list: async (req, res) => {
            try {
                let { country } = req.loginUser;
                let { date, category_id, type } = req.body;
                
                let foodWhere = '';
                let drinkWhere = '';
                let dessertWhere = '';

                if (category_id && type == 'food') {
                    foodWhere = `AND c.id = ${category_id}`;
                } else if (category_id && type == 'drink') {
                    drinkWhere = `AND c.id = ${category_id}`;
                } else if (category_id && type == 'dessert') {
                    dessertWhere = `AND c.id = ${category_id}`;
                }

                if(date && type == 'food') {
                    foodWhere += ` AND DATE(o.order_date_time) = '${date}'`;
                } else if(date && type == 'drink') {
                    drinkWhere += ` AND DATE(o.order_date_time) = '${date}'`;
                } else if(date && type == 'dessert') {
                    dessertWhere += ` AND DATE(o.order_date_time) = '${date}'`;
                }


                // food items
                let food_items = await SELECT.All(`SELECT mi.name AS Food_Item, SUM(oi.quantity) AS Orders FROM tbl_order_items oi join tbl_categories c ON oi.category_id = c.id JOIN tbl_order o ON oi.order_id = o.id JOIN tbl_menu_items mi ON oi.menu_item_id = mi.id WHERE mi.country = '${country}' AND mi.is_active = 1 AND mi.is_delete = 0 AND o.order_status = 'delivered' ${foodWhere} AND c.is_drink = 0 AND c.is_dessert = 0 AND c.is_active = 1 AND c.is_delete = 0 GROUP BY mi.name ORDER BY Orders DESC LIMIT 3;`, false);

                // drinks items
                let drinks_items = await SELECT.All(`SELECT mi.name AS Food_Item, SUM(oi.quantity) AS Orders FROM tbl_order_items oi join tbl_categories c ON oi.category_id = c.id JOIN tbl_order o ON oi.order_id = o.id JOIN tbl_menu_items mi ON oi.menu_item_id = mi.id WHERE mi.country = '${country}' AND mi.is_active = 1 AND mi.is_delete = 0 AND o.order_status = 'delivered' ${drinkWhere} AND c.is_drink = 1 AND c.is_dessert = 0 AND c.is_active = 1 AND c.is_delete = 0 GROUP BY mi.name ORDER BY Orders DESC LIMIT 3;`, false);

                // desserts items
                let desserts_items = await SELECT.All(`SELECT mi.name AS Food_Item, SUM(oi.quantity) AS Orders FROM tbl_order_items oi join tbl_categories c ON oi.category_id = c.id JOIN tbl_order o ON oi.order_id = o.id JOIN tbl_menu_items mi ON oi.menu_item_id = mi.id WHERE mi.country = '${country}' AND mi.is_active = 1 AND mi.is_delete = 0 AND o.order_status = 'delivered' ${dessertWhere} AND c.is_drink = 0 AND c.is_dessert = 1 AND c.is_active = 1 AND c.is_delete = 0 GROUP BY mi.name ORDER BY Orders DESC LIMIT 3;`, false);

                return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, {
                    food_items: food_items,
                    drinks_items: drinks_items,
                    desserts_items: desserts_items
                });
            } catch (e) {
                return sendResponse(req, res, 200, 2, { keyword: e?.message || "failed_to_fetch", components: {} });
            }
        },

        add_item: async (req, res) => {
            let { admin_id } = req.loginUser;
            try {
                let body = req.body;

                let product_images = body?.images?.product_images.map(image => ({ image_name: image, type: "product" }));

                body.product_image_ids = await save_multiple_images([{
                    image_name: body.images.thumbnail_image,
                    type: "thumbnail"
                }, {
                    image_name: body.images.cover_image,
                    type: "cover"
                }, ...product_images]);

                delete body.images;

                let menu_item_id = await insert_menu(body);

                const tasks = [];

                if (body.is_selected_size_options == 1 && body.sizes.length > 0) {
                    let size_names = body.sizes.map(size => size.size);
                    let unique_size_names = [...new Set(size_names)];
                    if (size_names.length !== unique_size_names.length) {
                        return sendResponse(req, res, 200, 0, { keyword: "duplicate_sizes", components: {} });
                    }
                }

                if (body.is_selected_size_options == 1) tasks.push(insert_sizes(menu_item_id, body.sizes));
                if (body.is_selected_accompaniments == 1) tasks.push(insert_accompaniments(menu_item_id, body.accompaniments));
                if (body.is_selected_add_ons == 1) tasks.push(insert_add_ons(menu_item_id, body.add_ons));
                if (body.is_selected_choices == 1) tasks.push(insert_choices(menu_item_id, body.choices));
                if (body.allergy_ids.length > 0) tasks.push(INSERT(`INSERT INTO tbl_menu_allergies (menu_item_id, allergy_id) VALUES ?`, [body.allergy_ids.map(id => [menu_item_id, id])]));

                await Promise.all(tasks);

                return sendResponse(req, res, 200, 1, { keyword: "added", components: {} });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_add", components: {} }, e.message || 'other error');
            }

            async function insert_menu(data) {

                await category_or_sub_category(data.category_id, data.sub_category_id);

                let insert_data = {
                    category_id: data.category_id,
                    sub_category_id: data.sub_category_id,
                    name: data.name,
                    customer_type: data.customer_type || 'all',
                    combo_option_name: data.combo_option_name || null, // temporary
                    is_create_combo: data.is_create_combo,
                    is_view_purpose_only: data.is_view_purpose_only,
                    is_mark_as_new: data.is_mark_as_new,
                    start_date: data.start_date,
                    end_date: data.end_date,
                    preparation_time: data.preparation_time,
                    is_mark_you_may_like: data.is_mark_you_may_like,
                    product_image_ids: data.product_image_ids.toString(),
                    description: data.description,
                    is_selected_size_options: data.is_selected_size_options,
                    country: data.country,
                    currency: data.currency,
                    price: data.price,
                    serve_start_time: data.serve_start_time,
                    serve_end_time: data.serve_end_time,
                    is_selected_choices: data.is_selected_choices,
                    is_selected_accompaniments: data.is_selected_accompaniments,
                    is_selected_add_ons: data.is_selected_add_ons,
                    created_by: admin_id
                }

                try {
                    let menu_item_id = await INSERT(`INSERT INTO tbl_menu_items SET ?`, insert_data);

                    return menu_item_id;
                }
                catch (e) {
                    throw new Error("Failed to insert menu item");
                }
            }

            async function insert_sizes(menu_item_id, sizes) {
                try {
                    let insertObj = sizes.map(size => [
                        menu_item_id,
                        size.size,
                        size.price
                    ]);

                    await INSERT(`INSERT INTO tbl_menu_size_options (menu_item_id, size, price) VALUES ?`, [insertObj]);

                    return;
                } catch (err) {
                    throw new Error("Failed to insert sizes");
                }
            }

            async function insert_choices(menu_item_id, choices) {
                try {

                    let insert_choices = choices.flatMap(category =>
                        category.choice_items.map(item => [
                            menu_item_id,
                            item.choice_item_id,
                            item.sequence || 0,
                        ])
                    );

                    await INSERT(`INSERT INTO tbl_menu_choices (menu_item_id, choice_item_id, sequence) VALUES ?`, [insert_choices]);

                    return;
                } catch (err) {
                    throw new Error("Failed to insert choices");
                }
            }

            async function insert_accompaniments(menu_item_id, accompaniments) {
                try {
                    let insertObj = accompaniments.map(accompaniment => [
                        menu_item_id,
                        accompaniment.accompaniment_id,
                        accompaniment.sequence
                    ]);

                    await INSERT(`INSERT INTO tbl_menu_accompaniments (menu_item_id, accompaniment_id, sequence) VALUES ?`, [insertObj]);

                    return;
                } catch (err) {
                    throw new Error("Failed to insert accompaniments");
                }
            }

            async function insert_add_ons(menu_item_id, add_ons) {
                try {
                    let insertObj = add_ons.map(item => [
                        menu_item_id,
                        item.add_ons_id,
                        item.sequence
                    ]);

                    await INSERT(`INSERT INTO tbl_menu_add_ons (menu_item_id, add_ons_id, sequence) VALUES ?`, [insertObj]);

                    return;
                } catch (err) {
                    throw new Error("Failed to insert add ons");
                }
            }
        },

        get_item: async (req, res) => {
            try {
                const { menu_item_id } = req.body;

                let menu_item = await SELECT.One(`select id as menu_item_id, category_id, (SELECT name FROM tbl_categories WHERE id = tbl_menu_items.category_id) as category_name, sub_category_id, (SELECT name FROM tbl_sub_categories WHERE id = tbl_menu_items.sub_category_id) as sub_category_name, name, is_create_combo, is_view_purpose_only, if(current_date() between start_date AND end_date, 1, 0) as is_mark_as_new, start_date, end_date, preparation_time, is_mark_you_may_like, product_image_ids, description, country, currency, price, serve_start_time, serve_end_time, is_selected_size_options, is_selected_choices, is_selected_accompaniments, is_selected_add_ons, is_serviceable, is_available_dine_in, is_available_pick_up, is_available_carhop, is_available_delivery, created_at, updated_at from tbl_menu_items where id = ${menu_item_id} AND is_delete = 0`, true, {
                    no_data_msg: "menu_item_not_found"
                });

                let sizes = await SELECT.All(`SELECT id as size_id, size, price FROM tbl_menu_size_options WHERE menu_item_id = ${menu_item_id}`, false);

                let choices = await SELECT.All(`SELECT ci.choice_category_id, cc.name as choice_category_name, mc.id as menu_choice_item_id, mc.choice_item_id, ci.name as choice_item_name, ci.price as price, concat('${constants.MENU_CHOICE_ITEMS_IMAGE_PATH}', ci.image) as image, ci.country, ci.currency, mc.sequence FROM tbl_menu_choices as mc join tbl_choice_items as ci on mc.choice_item_id = ci.id JOIN tbl_choice_categories as cc ON ci.choice_category_id = cc.id where mc.menu_item_id = ${menu_item_id} AND cc.is_delete = 0 AND ci.is_delete = 0 order by mc.sequence`, false);

                choices = _(choices).groupBy('choice_category_id').map((items, categoryId) => ({
                    choice_category_id: parseInt(categoryId),
                    choice_category_name: items[0].choice_category_name,
                    choice_items: items.map((item, index) => ({
                        menu_choice_item_id: item.menu_choice_item_id,
                        choice_item_id: item.choice_item_id,
                        choice_item_name: item.choice_item_name,
                        price: item.price,
                        image: item.image,
                        sequence: item.sequence,
                        country: item.country,
                        currency: item.currency
                    }))
                })).value();

                choices = _.map(choices, (category) => ({
                    ...category,
                    choice_items: _.orderBy(category.choice_items, ['sequence'], ['asc'])
                }));

                let accompaniments = await SELECT.All(`SELECT a.id as accompaniment_id, a.name, a.price, concat('${constants.MENU_ACCOMPANIMENTS_IMAGE_PATH}', a.image) as image, ma.sequence, a.country, a.currency from tbl_menu_accompaniments as ma join tbl_accompaniments as a on ma.accompaniment_id = a.id where ma.menu_item_id = ${menu_item_id} AND a.is_delete = 0 order by sequence;`, false);

                let add_ons = await SELECT.All(`SELECT a.id as add_ons_id, a.name, a.price, concat('${constants.MENU_ADD_ONS_IMAGE_PATH}', a.image) as image, ma.sequence, a.country, a.currency from tbl_menu_add_ons as ma join tbl_add_ons as a on ma.add_ons_id = a.id where ma.menu_item_id = ${menu_item_id} AND a.is_delete = 0 order by sequence;`, false);

                let allergies = await SELECT.All(`SELECT a.id as allergy_id, a.name from tbl_menu_allergies as ma join tbl_allergies as a on ma.allergy_id = a.id where ma.menu_item_id = ${menu_item_id} AND a.is_delete = 0;`, false);

                let images = await SELECT.All(`SELECT id as image_id, concat('${constants.MENU_IMAGE_PATH}', name) as image, type FROM tbl_media_files WHERE id in (${menu_item.product_image_ids.split(',')}) order by type desc`, false);

                return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, {
                    ...menu_item,
                    images,
                    sizes,
                    choices,
                    accompaniments,
                    add_ons,
                    allergies
                });
            }
            catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: e.message, components: {} }, e.message || 'other error');
            }
        },

        edit_item: async (req, res) => {
            try {
                let menu_item_id = req.body.menu_item_id;
                let body = req.body;
                body.admin_id = req.loginUser.admin_id;

                if (body.is_selected_size_options == 1 && body.sizes.length > 0) {
                    let size_names = body.sizes.map(size => size.size);
                    let unique_size_names = [...new Set(size_names)];
                    if (size_names.length !== unique_size_names.length) {
                        return sendResponse(req, res, 200, 0, { keyword: "duplicate_sizes", components: {} });
                    }
                }

                await Promise.all([
                    updateMenu(body, menu_item_id),
                    updateImages(body.images, menu_item_id),
                    updateSizes(body.sizes, menu_item_id),
                    updateChoices(body.choices, menu_item_id),
                    updateAcconpaniments(body.accompaniments, menu_item_id),
                    updateAddOns(body.add_ons, menu_item_id),
                    updateAllergies(body.allergy_ids, menu_item_id)
                ]);

                return sendResponse(req, res, 200, 1, { keyword: "edited", components: {} });
            }
            catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_edit", components: {} });
            }
        },

        normal_edit_item_old: async (req, res) => {
            let { admin_id } = req.loginUser;
            try {

                let { menu_item_id, type, value } = req.body;
                if (type == 'service_switch') {
                    await updateSwitch(value, menu_item_id);
                } else if (type == 'image_remove') {
                    await removeImage(value, menu_item_id);
                } else if (type == 'allergens') {
                    await DELETE(`DELETE FROM tbl_menu_allergies WHERE menu_item_id = ${menu_item_id} AND allergy_id = ${value}`);
                } else if (type == 'choices') {
                    await updateChoices(value, menu_item_id);
                } else if (type == 'accompaniment') {
                    await updateAcconpaniments(value, menu_item_id);
                } else if (type == 'add_ons') {
                    await updateAddOns(value, menu_item_id);
                }

                return sendResponse(req, res, 200, 1, { keyword: "menu_item_updated", components: {} });
            }
            catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed", components: {} });
            }

            async function updateSwitch(body, menu_item_id) {
                try {

                    await UPDATE(`UPDATE tbl_menu_items SET updated_by = ${admin_id}, ${body.key} = ${body.value} WHERE id = ${menu_item_id}`);

                    return true;
                }
                catch (e) {
                    throw new Error("Failed to update menu service switch");
                }
            }

            async function removeImage(image_id, menu_item_id) {
                try {
                    await UPDATE(`UPDATE tbl_menu_items SET updated_by = ${admin_id}, product_image_ids = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', product_image_ids, ','), ',${image_id},', ',')) WHERE id = ${menu_item_id}`);

                    await DELETE(`DELETE FROM tbl_media_files WHERE id = ${image_id}`);

                    return true;
                }
                catch (e) {
                    throw new Error("Failed to remove image");
                }
            }
        },

        normal_edit_item: async (req, res) => {
            let { admin_id } = req.loginUser;
            try {

                let { menu_item_id, type, value } = req.body;
                if (type == 'service_switch') {
                    await updateSwitch(value, menu_item_id);
                } else if (type == 'image_remove') {
                    await removeImage(value, menu_item_id);
                } else if (type == 'allergens') {
                    await DELETE(`DELETE FROM tbl_menu_allergies WHERE menu_item_id = ${menu_item_id} AND allergy_id = ${value}`);
                } else if (type == 'choices') {
                    await removeChoiceItem(value, menu_item_id);
                } else if (type == 'accompaniment') {
                    await removeAcconpaniments(value, menu_item_id);
                } else if (type == 'add_ons') {
                    await removeAddOns(value, menu_item_id);
                }

                return sendResponse(req, res, 200, 1, { keyword: "edited", components: {} });
            }
            catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_edit", components: {} }, e.message || 'other error');
            }

            async function updateSwitch(body, menu_item_id) {
                try {

                    await UPDATE(`UPDATE tbl_menu_items SET updated_by = ${admin_id}, ${body.key} = ${body.value} WHERE id = ${menu_item_id}`);

                    return true;
                }
                catch (e) {
                    throw new Error("Failed to update menu service switch");
                }
            }

            async function removeImage(image_id, menu_item_id) {
                try {
                    await UPDATE(`UPDATE tbl_menu_items SET updated_by = ${admin_id}, product_image_ids = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', product_image_ids, ','), ',${image_id},', ',')) WHERE id = ${menu_item_id}`);

                    await DELETE(`DELETE FROM tbl_media_files WHERE id = ${image_id}`);

                    return true;
                }
                catch (e) {
                    throw new Error("Failed to remove image");
                }
            }

            async function removeChoiceItem(body, menu_item_id) {
                try {
                    choiceItemIds = _.flatMap(body, (category) => category.choice_items.map((item) => item.choice_item_id));

                    await DELETE(`DELETE FROM tbl_menu_choices WHERE menu_item_id = ${menu_item_id} AND choice_item_id in (${choiceItemIds})`);

                    return true;
                }
                catch (e) {
                    throw new Error("Failed to remove choice item");
                }
            }

            async function removeAcconpaniments(body, menu_item_id) {
                try {
                    let accompanimentIds = body.map(item => item.accompaniment_id);

                    await DELETE(`DELETE FROM tbl_menu_accompaniments WHERE menu_item_id = ${menu_item_id} AND accompaniment_id in (${accompanimentIds})`);

                    return true;
                }
                catch (e) {
                    throw new Error("Failed to remove accompaniments");
                }
            }

            async function removeAddOns(body, menu_item_id) {
                try {
                    let addOnsIds = body.map(item => item.add_ons_id);

                    await DELETE(`DELETE FROM tbl_menu_add_ons WHERE menu_item_id = ${menu_item_id} AND add_ons_id in (${addOnsIds})`);

                    return true;
                }
                catch (e) {
                    throw new Error("Failed to remove add ons");
                }
            }
        },

        list_items: async (req, res) => {
            try {

                let { country } = req.loginUser;
                let { category_id, sub_category_id } = req.body;

                let addWhere = '';
                if (category_id && sub_category_id) {
                    addWhere = `AND mi.category_id = ${category_id} AND mi.sub_category_id = ${sub_category_id}`;
                }

                let list = await SELECT.All(`SELECT mi.id AS menu_item_id, mi.name, mi.category_id, (select name from tbl_categories where id = mi.category_id) as category_name, mi.sub_category_id, (select name from tbl_sub_categories where id = mi.sub_category_id) as sub_category_name, mi.preparation_time, if(current_date() between mi.start_date AND mi.end_date, 1, 0) as is_mark_as_new, mi.price, mi.country, mi.currency, concat('${constants.MENU_IMAGE_PATH}', (SELECT mf.name FROM tbl_media_files mf WHERE FIND_IN_SET(mf.id, mi.product_image_ids) AND mf.type = 'cover' LIMIT 1)) AS image, mi.is_active FROM tbl_menu_items mi WHERE mi.country = '${country}' ${addWhere} AND mi.is_delete = 0 Order by sequence asc`);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, list);
            }
            catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: e?.message || "failed_to_fetch" });
            }
        },

        action_item: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { menu_item_id, is_active } = req.body;

                await UPDATE(`UPDATE tbl_menu_items SET is_active = ${is_active}, updated_by = ${admin_id} WHERE id in (${menu_item_id})`);

                return sendResponse(req, res, 200, 1, { keyword: "status_updated", components: {} });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_update_status", components: {} });
            }
        },

        delete_item: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { menu_item_id } = req.body;

                await UPDATE(`UPDATE tbl_menu_items SET is_delete = 1, updated_by = ${admin_id} WHERE id in (${menu_item_id})`);

                return sendResponse(req, res, 200, 1, { keyword: "deleted", components: {} });
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_delete", components: {} });
            }
        },

        set_deactivate_item: async (req, res) => {
            try {
                let body = req.body;

                const conditions = body.menu_item_ids.map(menu_item_id => body.restaurant_ids.map(branch_id => `(menu_item_id = ${menu_item_id} AND branch_id = ${branch_id})`)).flat();

                // Join the conditions with OR
                const whereClause = conditions.join(' OR ');

                let dbData = await SELECT.All(`SELECT menu_item_id, branch_id FROM tbl_menu_deactivate_items WHERE ${whereClause}`, false);

                const result = _.flatMap(body.menu_item_ids, (menuItemId) => {
                    return _.map(body.restaurant_ids, (restaurantId) => {
                        const existingEntry = _.find(dbData, { menu_item_id: menuItemId, branch_id: restaurantId });
                        if (!existingEntry) {
                            return [
                                menuItemId,
                                body.start_date,
                                body.end_date,
                                body.start_time,
                                body.end_time,
                                restaurantId,
                                'admin'
                            ];
                        }
                    }).filter(i => i !== undefined);
                });

                await INSERT(`INSERT INTO tbl_menu_deactivate_items (menu_item_id, start_date, end_date, start_time, end_time, branch_id, deactivate_by) VALUES ?`, [result]);

                return sendResponse(req, res, 200, 1, { keyword: "saved", components: {} }, result);
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_save", components: {} });
            }
        },

        deactive_items_list: async (req, res) => {
            try {

                let list = await SELECT.All(`select mi.id as menu_item_id, (select name from tbl_restaurants where id = mdi.branch_id) as restaurant_name, mi.name, mdi.start_date, mdi.start_time, mdi.end_date, mdi.end_time, mdi.created_at, concat('${constants.MENU_IMAGE_PATH}', (SELECT mf.name FROM tbl_media_files mf WHERE FIND_IN_SET(mf.id, mi.product_image_ids) AND mf.type = 'cover' LIMIT 1)) AS image from tbl_menu_items as mi join tbl_menu_deactivate_items as mdi on mi.id = mdi.menu_item_id where mi.is_active = 1 and mi.is_delete = 0 order by mdi.id desc`);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, list);
            } catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_fetch" });
            }
        }
    },

    allergies_list: async (req, res) => {
        try {
            let allergies = await SELECT.All(`SELECT id as allergy_id, name FROM tbl_allergies WHERE is_delete = 0 Order by name`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, allergies);
        }
        catch (e) {
            return sendResponse(req, res, 200, 2, { keyword: e?.message || "failed_to_fetch" });
        }
    },

    delivery_charges: {
        restaurant_list: async (req, res) => {
            try {
                let restaurants = await SELECT.All(`SELECT id as restaurant_id, name, country, (select currency from tbl_country where name = tbl_restaurants.country) as currency FROM tbl_restaurants WHERE id not in (select restaurant_id from tbl_admin_delivery_charges) AND is_delete = 0 ORDER BY name ASC`);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, restaurants);
            }
            catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: e.message || "failed" });
            }
        },

        get: async (req, res) => {
            try {
                let { restaurant_id } = req.body;

                let delivery_charges = await SELECT.All(`SELECT id as delivery_charge_id, distance_from_km, distance_to_km, delivery_charge FROM tbl_admin_delivery_charges WHERE restaurant_id = ${restaurant_id}`);

                let restaurant = await SELECT.One(`SELECT id as restaurant_id, name, min_order_free_delivery, country, (select currency from tbl_country where name = tbl_restaurants.country) as currency, (select concat('${constants.RESTAURANT_IMAGE_PATH}', name) from tbl_media_files where id in (tbl_restaurants.image_ids) limit 1) as image FROM tbl_restaurants WHERE id = ${restaurant_id} AND is_delete = 0`);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, { restaurant, delivery_charges });
            }
            catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: e?.message || "failed_to_fetch" });
            }
        },

        add: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { restaurant_id, min_order_free_delivery, delivery_charges } = req.body;

                await validateDeliveryCharges({ delivery_charges });

                await UPDATE(`UPDATE tbl_restaurants SET min_order_free_delivery = ${min_order_free_delivery}, updated_by = ${admin_id} WHERE id = ${restaurant_id}`);

                let insertObj = delivery_charges.map(charge => [
                    restaurant_id,
                    charge.distance_from_km,
                    charge.distance_to_km,
                    charge.delivery_charge
                ]);

                await INSERT(`INSERT INTO tbl_admin_delivery_charges (restaurant_id, distance_from_km, distance_to_km, delivery_charge) VALUES ?`, [insertObj]);

                return sendResponse(req, res, 200, 1, { keyword: "added" });
            }
            catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_add" });
            }
        },

        edit: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;

                let { restaurant_id, min_order_free_delivery, delivery_charges } = req.body;

                await validateDeliveryCharges({ delivery_charges });

                let dbData = await SELECT.All(`SELECT id as delivery_charge_id, distance_from_km, distance_to_km, delivery_charge FROM tbl_admin_delivery_charges WHERE restaurant_id = ${restaurant_id}`, false);

                await UPDATE(`UPDATE tbl_restaurants SET min_order_free_delivery = ${min_order_free_delivery}, updated_by = ${admin_id} WHERE id = ${restaurant_id}`);

                // Create sets for easier comparison
                const dbIds = dbData.map((item) => item.delivery_charge_id);
                const apiIds = delivery_charges.map((item) => parseInt(item.delivery_charge_id));

                // Update existing records or add new ones
                for (const apiRecord of delivery_charges) {
                    if (dbIds.includes(parseInt(apiRecord.delivery_charge_id))) {

                        // Update record in the database
                        await UPDATE("UPDATE tbl_admin_delivery_charges SET distance_from_km = ?, distance_to_km = ?, delivery_charge = ? WHERE id = ? AND restaurant_id = ?", [apiRecord.distance_from_km, apiRecord.distance_to_km, apiRecord.delivery_charge, apiRecord.delivery_charge_id, restaurant_id]);

                    } else if (!apiRecord.delivery_charge_id) {

                        // Add new record to the database
                        await INSERT("INSERT INTO tbl_admin_delivery_charges (restaurant_id, distance_from_km, distance_to_km, delivery_charge) VALUES (?, ?, ?, ?)", [restaurant_id, apiRecord.distance_from_km, apiRecord.distance_to_km, apiRecord.delivery_charge]);

                    }
                }

                // Remove records that are in the database but not in the API data
                for (const dbRecord of dbData) {
                    if (!apiIds.includes(parseInt(dbRecord.delivery_charge_id))) {
                        await DELETE("DELETE FROM tbl_admin_delivery_charges WHERE id = ? AND restaurant_id = ?", [dbRecord.delivery_charge_id, restaurant_id]);
                    }
                }

                return sendResponse(req, res, 200, 1, { keyword: "edited" });
            }
            catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_edit" });
            }
        },

        list: async (req, res) => {
            try {
                let delivery_charges = await SELECT.All(`SELECT dc.id as delivery_charge_id, dc.restaurant_id, r.name as restaurant_name, dc.distance_from_km, dc.distance_to_km, dc.delivery_charge FROM tbl_admin_delivery_charges dc JOIN tbl_restaurants r ON dc.restaurant_id = r.id`);

                let restaurant_ids = _.uniq(delivery_charges.map(charge => charge.restaurant_id));

                let restaurant_list = await SELECT.All(`SELECT id as restaurant_id, name, min_order_free_delivery, country, (select currency from tbl_country where name = tbl_restaurants.country) as currency, (select concat('${constants.RESTAURANT_IMAGE_PATH}', name) from tbl_media_files where id in (tbl_restaurants.image_ids) limit 1) as image FROM tbl_restaurants WHERE id in (${restaurant_ids}) AND is_delete = 0`);

                let grouped_charges = _.map(restaurant_list, restaurant => {
                    let charges = _.filter(delivery_charges, charge => charge.restaurant_id == restaurant.restaurant_id);
                    restaurant.max_km = _.maxBy(charges, 'distance_to_km').distance_to_km;
                    restaurant.delivery_charges = charges.sort((a, b) => a.distance_from_km - b.distance_from_km);
                    return restaurant;
                });

                return sendResponse(req, res, 200, 1, { keyword: "success" }, grouped_charges);
            }
            catch (e) {
                return sendResponse(req, res, 200, 0, { keyword: e?.message || "failed_to_fetch" });
            }
        }
    }
};

async function validateDeliveryCharges(data) {
    const errors = [];

    // Check each delivery charge for both conditions
    for (let i = 0; i < data.delivery_charges.length; i++) {
        const current = data.delivery_charges[i];
        const from1 = parseFloat(current.distance_from_km);
        const to1 = parseFloat(current.distance_to_km);

        // Check if distance_from_km is less than distance_to_km
        if (from1 >= to1) {
            errors.push(
                `Delivery Charge (${current.delivery_charge}): Distance From Km (${from1}) must be less than Distance To Km (${to1}).`
            );
        }

        // Check for overlapping ranges with all other charges
        for (let j = i + 1; j < data.delivery_charges.length; j++) {
            const other = data.delivery_charges[j];
            const from2 = parseFloat(other.distance_from_km);
            const to2 = parseFloat(other.distance_to_km);

            if (
                (from1 < to2 && to1 > from2) || // Overlap condition
                (from2 < to1 && to2 > from1)
            ) {
                errors.push(
                    `Overlap detected between Delivery Charge ${current.delivery_charge} (${from1} - ${to1}) and Delivery Charge ${other.delivery_charge} (${from2} - ${to2}).`
                );
            }
        }
    }

    // Return errors if any
    if (errors.length > 0) {
        throw new Error(errors?.[0] || "Please check the delivery charges values.");
    } else {
        return "Validation passed!";
    }
}

// edit menu item functions
async function updateMenu(data, menu_item_id) {
    try {
        let update_data = {
            category_id: data.category_id,
            sub_category_id: data.sub_category_id,
            name: data.name,
            customer_type: data.customer_type || 'all',
            combo_option_name: data.combo_option_name || null, // temporary
            is_create_combo: data.is_create_combo,
            is_view_purpose_only: data.is_view_purpose_only,
            is_mark_as_new: data.is_mark_as_new,
            start_date: data.start_date,
            end_date: data.end_date,
            preparation_time: data.preparation_time,
            is_mark_you_may_like: data.is_mark_you_may_like,
            description: data.description,
            is_selected_size_options: data.is_selected_size_options,
            country: data.country,
            currency: data.currency,
            price: data.price,
            serve_start_time: data.serve_start_time,
            serve_end_time: data.serve_end_time,
            is_selected_choices: data.is_selected_choices,
            is_selected_accompaniments: data.is_selected_accompaniments,
            is_selected_add_ons: data.is_selected_add_ons,
            updated_by: data.admin_id
        };

        await UPDATE(`UPDATE tbl_menu_items SET ? WHERE id = ?`, [update_data, menu_item_id]);

        return;
    }
    catch (e) {
        throw e;
    }
}

async function updateImages(images, menu_item_id) {
    try {
        let dbImages = await SELECT.All(`SELECT id as image_id, name as image_name, type FROM tbl_media_files WHERE FIND_IN_SET(id, (SELECT product_image_ids FROM tbl_menu_items WHERE id = ${menu_item_id} AND is_delete = 0));`, false);

        images = _.concat(
            { image_name: images.thumbnail_image, type: 'thumbnail' },
            { image_name: images.cover_image, type: 'cover' },
            _.map(images.product_images, (image) => ({
                image_name: image,
                type: 'product'
            }))
        );

        let product_image_ids = await update_multiple_images(dbImages, images);

        await UPDATE(`UPDATE tbl_menu_items SET product_image_ids = '${product_image_ids.toString()}' WHERE id = ${menu_item_id}`);

        return true;
    } catch (e) {
        throw new Error("images_failed");
    }
}

async function updateSizes(bodySizes, menu_item_id) {
    try {

        bodySizes = (bodySizes?.length > 0) ? bodySizes : [];

        let dbData = await SELECT.All(`SELECT id as size_id, size, price FROM tbl_menu_size_options WHERE menu_item_id = ${menu_item_id}`, false);

        // Arrays to hold insert, update, and delete sizes
        let insertSizes = [];
        let updateSizes = [];
        let deleteSizes = [];

        // Check each new data entry
        _.forEach(bodySizes, (bodySize) => {
            if (!bodySize.size_id) {
                // Insert if size_id is null
                insertSizes.push(bodySize);
            } else {
                // Otherwise update
                let dbMatch = _.find(dbData, { size_id: bodySize.size_id });
                if (dbMatch) {
                    updateSizes.push(bodySize);
                }
            }
        });

        // Check for entries in dbData that are not in bodySizes to move them to deleteSizes
        _.forEach(dbData, (dbSize) => {
            let newSizeMatch = _.find(bodySizes, { size_id: dbSize.size_id });
            if (!newSizeMatch) {
                deleteSizes.push(dbSize);
            }
        });

        if (insertSizes.length > 0) {
            await INSERT(`INSERT INTO tbl_menu_size_options (menu_item_id, size, price) VALUES ?`, [insertSizes.map(size => [menu_item_id, size.size, size.price])]);
        }

        if (updateSizes.length > 0) {
            await each(updateSizes, async (size, callback) => {
                try {
                    await UPDATE(`UPDATE tbl_menu_size_options SET size = ?, price = ? WHERE id = ? AND menu_item_id = ?`, [size.size, size.price, size.size_id, menu_item_id]);
                    callback();
                } catch (err) {
                    callback(err);
                }
            }, async (err) => {
                if (err) throw err;
            });
        }

        if (deleteSizes.length > 0) {
            await DELETE(`DELETE FROM tbl_menu_size_options WHERE menu_item_id = ${menu_item_id} AND id IN (${deleteSizes.map(size => size.size_id)})`);
        }

        return;
    } catch (e) {
        throw new Error("sizes_failed");
    }
}

async function updateChoices(bodyChoices, menu_item_id) {
    try {

        bodyChoices = (bodyChoices?.length > 0) ? bodyChoices : [];

        let dbData = await SELECT.All(`SELECT id as menu_choice_id, menu_item_id, choice_item_id, sequence from tbl_menu_choices where menu_item_id = ${menu_item_id}`, false);

        bodyChoices = bodyChoices.flatMap(category =>
            category.choice_items.map(item => ({
                menu_item_id: menu_item_id,
                choice_item_id: item.choice_item_id,
                sequence: item.sequence || 0
            }))
        );

        let insertChoice = [];
        let updateChoice = [];
        let deleteChoice = [];

        // Check for insert and update
        bodyChoices.forEach(newItem => {
            let existingItem = _.find(dbData, dbItem =>
                dbItem.menu_item_id == newItem.menu_item_id &&
                dbItem.choice_item_id == newItem.choice_item_id
            );

            if (existingItem) {
                // If item exists, it means we want to update it
                updateChoice.push(newItem);
            } else {
                // If item doesn't exist, we want to insert it
                insertChoice.push(newItem);
            }
        });

        // Check for delete
        dbData.forEach(dbItem => {
            let existsInNewData = _.find(bodyChoices, newItem =>
                newItem.menu_item_id == dbItem.menu_item_id &&
                newItem.choice_item_id == dbItem.choice_item_id
            );

            if (!existsInNewData) {
                // If item in db doesn't exist in new data, mark it for deletion
                deleteChoice.push(dbItem);
            }
        });

        if (insertChoice.length > 0) {
            await INSERT(`INSERT INTO tbl_menu_choices (menu_item_id, choice_item_id, sequence) VALUES ?`, [insertChoice.map(choice => [choice.menu_item_id, choice.choice_item_id, choice.sequence])]);
        }

        if (updateChoice.length > 0) {
            await each(updateChoice, async (choice, callback) => {
                try {
                    await UPDATE(`UPDATE tbl_menu_choices SET sequence = ? WHERE menu_item_id = ? AND choice_item_id = ?`, [choice.sequence, choice.menu_item_id, choice.choice_item_id]);
                    callback();
                } catch (err) {
                    callback(err);
                }
            }, async (err) => {
                if (err) throw err;
            });
        }

        if (deleteChoice.length > 0) {
            await DELETE(`DELETE FROM tbl_menu_choices WHERE menu_item_id = ${menu_item_id} AND id IN (${deleteChoice.map(choice => choice.menu_choice_id)})`);
        }

        return;

    } catch (e) {
        throw new Error("choices_failed");
    }
}

async function updateAcconpaniments(newAccompaniments, menu_item_id) {
    try {
        newAccompaniments = (newAccompaniments?.length > 0) ? newAccompaniments : [];

        let dbData = await SELECT.All(`SELECT id as menu_accompaniment_id, accompaniment_id, sequence from tbl_menu_accompaniments where menu_item_id = ${menu_item_id}`, false);

        // Arrays to hold the results
        let insertAccompaniments = [];
        let updateAccompaniments = [];
        let deleteAccompaniments = [];

        // Logic for insert and update
        newAccompaniments.forEach(newItem => {
            const dbItem = _.find(dbData, { accompaniment_id: newItem.accompaniment_id });

            if (!dbItem) {
                // If accompaniment_id in newAccompaniments does not exist in dbData, insert it
                insertAccompaniments.push(newItem);
            } else if (newItem.accompaniment_id !== null) {
                // If accompaniment_id is not null and exists, prepare it for update
                updateAccompaniments.push({
                    menu_accompaniment_id: dbItem.menu_accompaniment_id, // use the ID from dbData
                    accompaniment_id: newItem.accompaniment_id,
                    sequence: newItem.sequence
                });
            }
        });

        // Logic for delete
        dbData.forEach(dbItem => {
            const newItem = _.find(newAccompaniments, { accompaniment_id: dbItem.accompaniment_id });

            if (!newItem) {
                // If dbData accompaniment_id doesn't exist in newAccompaniments, mark it for deletion
                deleteAccompaniments.push(dbItem);
            }
        });

        if (insertAccompaniments.length > 0) {
            await INSERT(`INSERT INTO tbl_menu_accompaniments (menu_item_id, accompaniment_id, sequence) VALUES ?`, [insertAccompaniments.map(accompaniment => [menu_item_id, accompaniment.accompaniment_id, accompaniment.sequence])]);
        }

        if (updateAccompaniments.length > 0) {
            await each(updateAccompaniments, async (accompaniment, callback) => {
                try {
                    await UPDATE(`UPDATE tbl_menu_accompaniments SET accompaniment_id = ?, sequence = ? WHERE id = ? AND menu_item_id = ?`, [accompaniment.accompaniment_id, accompaniment.sequence, accompaniment.menu_accompaniment_id, menu_item_id]);
                    callback();
                } catch (err) {
                    callback(err);
                }
            }, async (err) => {
                if (err) throw err;
            });
        }

        if (deleteAccompaniments.length > 0) {
            await DELETE(`DELETE FROM tbl_menu_accompaniments WHERE menu_item_id = ${menu_item_id} AND id IN (${deleteAccompaniments.map(accompaniment => accompaniment.menu_accompaniment_id)})`);
        }

        return;

    } catch (e) {
        throw new Error("accompaniments_failed");
    }
}

async function updateAddOns(add_ons, menu_item_id) {
    try {
        add_ons = (add_ons?.length > 0) ? add_ons : [];

        let dbData = await SELECT.All(`SELECT id as menu_add_ons_id, add_ons_id, sequence from tbl_menu_add_ons where menu_item_id = ${menu_item_id}`, false);

        let insertAddOns = [];
        let updateAddOns = [];
        let deleteAddOns = [];

        add_ons.forEach(newItem => {
            const dbItem = _.find(dbData, { add_ons_id: newItem.add_ons_id });

            if (!dbItem) {
                insertAddOns.push(newItem);
            } else {
                updateAddOns.push({
                    menu_add_ons_id: dbItem.menu_add_ons_id,
                    add_ons_id: newItem.add_ons_id,
                    sequence: newItem.sequence
                });
            }
        });

        dbData.forEach(dbItem => {
            const newItem = _.find(add_ons, { add_ons_id: dbItem.add_ons_id });

            if (!newItem) {
                deleteAddOns.push(dbItem);
            }
        });

        if (insertAddOns.length > 0) {
            await INSERT(`INSERT INTO tbl_menu_add_ons (menu_item_id, add_ons_id, sequence) VALUES ?`, [insertAddOns.map(addOn => [menu_item_id, addOn.add_ons_id, addOn.sequence])]);
        }

        if (updateAddOns.length > 0) {
            await each(updateAddOns, async (addOn, callback) => {
                try {
                    await UPDATE(`UPDATE tbl_menu_add_ons SET add_ons_id = ?, sequence = ? WHERE id = ? AND menu_item_id = ?`, [addOn.add_ons_id, addOn.sequence, addOn.menu_add_ons_id, menu_item_id]);
                    callback();
                } catch (err) {
                    callback(err);
                }
            }, async (err) => {
                if (err) throw err;
            });
        }

        if (deleteAddOns.length > 0) {
            await DELETE(`DELETE FROM tbl_menu_add_ons WHERE menu_item_id = ${menu_item_id} AND id IN (${deleteAddOns.map(addOn => addOn.menu_add_ons_id)})`);
        }

        return;

    } catch (e) {
        throw new Error("add_ons_failed");
    }
}

async function updateAllergies(allergy_ids, menu_item_id) {
    try {
        allergy_ids = (allergy_ids?.length > 0) ? allergy_ids : [];

        let dbData = await SELECT.All(`SELECT allergy_id from tbl_menu_allergies where menu_item_id = ${menu_item_id}`, false);

        let insertAllergies = [];
        let deleteAllergies = [];

        allergy_ids.forEach(newItem => {
            const dbItem = _.find(dbData, { allergy_id: newItem });

            if (!dbItem) {
                insertAllergies.push(newItem);
            }
        });

        dbData.forEach(dbItem => {
            const newItem = _.find(allergy_ids, (newItem) => newItem === dbItem.allergy_id);

            if (!newItem) {
                deleteAllergies.push(dbItem);
            }
        });

        if (insertAllergies.length > 0) {
            await INSERT(`INSERT INTO tbl_menu_allergies (menu_item_id, allergy_id) VALUES ?`, [insertAllergies.map(allergy_id => [menu_item_id, allergy_id])]);
        }

        if (deleteAllergies.length > 0) {
            await DELETE(`DELETE FROM tbl_menu_allergies WHERE menu_item_id = ${menu_item_id} AND allergy_id IN (${deleteAllergies.map(allergy_id => allergy_id.allergy_id)})`);
        }

        return;

    } catch (e) {
        throw new Error("allergies_failed");
    }
}

module.exports = menu_model;