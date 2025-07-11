const { SELECT, INSERT, UPDATE } = require('../../utils/SQLWorker');
const { sendResponse } = require('../../middleware');
const { save_multiple_images, update_multiple_images } = require('../../utils/common');
const cryptoLib = require('cryptlib');
const shaKey = cryptoLib.getHashSha256(process.env.PASSWORD_ENC_KEY, 32);
const { events, EventEmitter } = require("../../utils/emitter");
const { COUNTRY_IMAGE_PATH, RESTAURANT_IMAGE_PATH, FEEDBACK_REVIEW_IMAGE_PATH } = require('../../config/constants');
const _ = require('lodash');
const each = require('async-each');
const moment = require('moment');

// worker functions --------------------------------------------
const get_restaurant = async (restaurant_id) => {
    try {

        let restaurant = await SELECT.One(`select id as restaurant_id, name, country, (select concat('${COUNTRY_IMAGE_PATH}', flag) from tbl_country where name = tbl_restaurants.country) as country_image, address, phone_number, is_dine_in, is_pick_up, is_carhop, is_delivery, image_ids, country, ex_restaurant_id, password, latitude, longitude, min_order_free_delivery, max_delivery_distance, created_by, updated_by, rider_daily_least_target, rider_daily_milestone, is_active, is_delete, created_at, updated_at from tbl_restaurants where id = ${parseInt(restaurant_id)} AND is_active = 1 AND is_delete = 0 order by id desc`);

        restaurant.ex_restaurant_id = cryptoLib.decrypt(restaurant.ex_restaurant_id, shaKey, process.env.PASSWORD_ENC_IV);
        restaurant.password = cryptoLib.decrypt(restaurant.password, shaKey, process.env.PASSWORD_ENC_IV);

        let images = restaurant.image_ids?.length > 0 ? await SELECT.All(`select concat('${RESTAURANT_IMAGE_PATH}', name) as image from tbl_media_files where id in (${restaurant.image_ids})`, false) : [];

        return {
            ...restaurant,
            images: images.map(image => image.image)
        };
    }
    catch (e) {
        throw e;
    }
}

// controller functions ----------------------------------------
const list_restaurants = async (req, res) => {
    try {
        let { country } = req.loginUser;

        let restaurants = await SELECT.All(`select id as restaurant_id, ex_restaurant_id, name, (select concat('${RESTAURANT_IMAGE_PATH}', tbl_media_files.name) from tbl_media_files where id in (tbl_restaurants.image_ids) limit 1) as image, country, (select concat('${COUNTRY_IMAGE_PATH}', flag) from tbl_country where name = tbl_restaurants.country) as country_image, address, latitude, longitude, phone_number, is_dine_in, is_pick_up, is_carhop, is_delivery, is_active from tbl_restaurants where is_active = 1 AND is_delete = 0 AND country = '${country}' order by id desc;`);

        restaurants = restaurants.map(restaurant => {
            restaurant.image = restaurant.image || `${RESTAURANT_IMAGE_PATH}default.png`;
            restaurant.ex_restaurant_id = cryptoLib.decrypt(restaurant.ex_restaurant_id, shaKey, process.env.PASSWORD_ENC_IV);
            return restaurant;
        });

        return sendResponse(req, res, 200, 1, { keyword: "success" }, restaurants);
    }
    catch (e) {
        return sendResponse(req, res, 200, 0, { keyword: e.message || "failed_to_fetch" });
    }
}

const live_orders = async (req, res) => {
    try {
        let { restaurant_id } = req.body;

        let orders = await SELECT.All(`select count(o.id) as count, service_type from tbl_order o where restaurant_branch_id = ${restaurant_id} group by service_type`, false);

        // Make sure all service types are represented, even if they have no orders
        const orderMap = {};

        // Initialize the orderMap with all service types set to 0
        ['dine_in', 'pick_up', 'carhop', 'delivery'].forEach(type => {
            orderMap[type] = 0;
        });

        // Update the orderMap with actual values from the query
        orders.forEach(order => {
            orderMap[order.service_type] = parseInt(order.count);
        });

        orders = null;

        return sendResponse(req, res, 200, 1, { keyword: "success" }, orderMap);
    }
    catch (e) {
        return sendResponse(req, res, 200, 0, { keyword: e.message || "failed_to_fetch" });
    }
}

const view_restaurant = async (req, res) => {
    try {
        let { restaurant_id } = req.body;

        let restaurant = await get_restaurant(restaurant_id);

        const rider_weekly_milestone = await SELECT.All(`SELECT id as milestone_range_id, restaurant_id, from_milestone, to_milestone, amount FROM tbl_rider_weekly_milestone WHERE restaurant_id = ${restaurant_id} AND is_delete = 0`, false);

        let rider_order_counts = await SELECT.All(`select id as riders, (select count(id) from tbl_order where rider_id = ru.id AND admin_approval_status = 'approved' AND order_status = 'delivered' AND delivered_date_time = current_date()) as order_count from tbl_rider_users as ru where branch_id = '${restaurant_id}' AND is_active = 1 AND is_delete = 0`, false);

        let milestone = {}, least_target = {};
        if (rider_order_counts?.length > 0) {
            least_target.total_riders = rider_order_counts?.length;
            milestone.total_riders = rider_order_counts?.length;
            least_target.achieved_riders = restaurant.rider_daily_least_target != 0 ? rider_order_counts.reduce((acc, rider) => {
                return acc + (rider.order_count >= restaurant.rider_daily_least_target ? 1 : 0);
            }, 0) : 0;
            milestone.achieved_riders = restaurant.rider_daily_least_target != 0 ? rider_order_counts.reduce((acc, rider) => {
                return acc + (rider.order_count >= restaurant.rider_daily_milestone ? 1 : 0);
            }, 0) : 0;
        };

        restaurant = {
            ...restaurant,
            rider_weekly_milestone: rider_weekly_milestone?.map(milestone => {
                const ridersAchieved = rider_order_counts.reduce((count, rider) => {
                    if (rider.week_order_count >= milestone.from_milestone &&
                        rider.week_order_count <= milestone.to_milestone) {
                        return count + 1;
                    }
                    return count;
                }, 0);
                return {
                    ...milestone,
                    rider_achieved: ridersAchieved
                }
            }),
            rider_target_milestone: {
                "daily_least_target": restaurant.rider_daily_least_target,
                "daily_milestone": restaurant.rider_daily_milestone,
                "least_target": {
                    "achieved": least_target.achieved_riders,
                    "total": least_target.total_riders
                },
                "milestone": {
                    "achieved": milestone.achieved_riders,
                    "total": milestone.total_riders
                }
            },
        }

        EventEmitter.emit(events.ADD_RESTAURANT, {
            type: events.ADD_RESTAURANT,
            data: restaurant
        });

        return sendResponse(req, res, 200, 1, { keyword: "success" }, restaurant);
    }
    catch (e) {
        return sendResponse(req, res, 200, 0, { keyword: e.message || "failed_to_fetch" });
    }
}

const view_live_orders_updates = async (req, res) => {
    try {

        let { country } = req.loginUser;
        let { restaurant_id, live_order_type } = req.body;

        let total_orders_promise = SELECT.One(`SELECT SUM(CASE WHEN service_type = 'dine_in' THEN 1 ELSE 0 END) AS dine_in, SUM(CASE WHEN service_type = 'pick_up' THEN 1 ELSE 0 END) AS pick_up, SUM(CASE WHEN service_type = 'delivery' THEN 1 ELSE 0 END) AS delivery, SUM(CASE WHEN service_type = 'carhop' THEN 1 ELSE 0 END) AS carhop FROM tbl_order WHERE restaurant_branch_id = ${restaurant_id}`, false).catch(() => { });

        let addWhere = '';
        if (live_order_type == 'in_packaging') {
            addWhere = `AND o.restaurant_status = 'in_packaging'`;
        } else if (live_order_type == 'in_preparation') {
            addWhere = `AND o.restaurant_status = 'in_preparation'`;
        } else if (live_order_type == 'completed') {
            addWhere = `AND o.order_status = 'delivered'`;
        } else if (live_order_type == 'replacement') {
            addWhere = `AND o.order_status = 'delivered' AND (select count(*) from tbl_order_items where order_id = o.id and is_replace = 1) > 0`;
        }

        let live_orders_promise = SELECT.One(`SELECT IFNULL(SUM(if(o.service_type = 'delivery', 1, 0)), 0) as is_delivery, IFNULL(SUM(if(o.service_type = 'pick_up', 1, 0)), 0) as is_pickup, IFNULL(SUM(if(o.service_type = 'dine_in', 1, 0)), 0) as is_dine_in, IFNULL(SUM(if(o.service_type = 'carhop', 1, 0)), 0) as is_carhop, count(*) as total_orders from tbl_order o where o.admin_approval_status = 'approved' ${addWhere}`, false).catch(() => { });

        let available_riders_promise = SELECT.One(`SELECT COUNT(*) as count FROM tbl_rider_users WHERE is_active = 1 AND is_delete = 0`, false).catch(() => { });

        let detective_items_promise = SELECT.One(`SELECT COUNT(mdi.id) AS count FROM tbl_menu_deactivate_items mdi JOIN tbl_menu_items mi ON mdi.menu_item_id = mi.id WHERE mdi.branch_id = ${restaurant_id} AND mi.is_active = 1 AND mi.is_delete = 0 AND mdi.is_active = 1 AND CURDATE() BETWEEN mdi.start_date AND mdi.end_date`, false).catch(() => { });

        let live_kitchen_bar_orders_promise = SELECT.All(`select o.id as order_id, o.order_no, o.service_type, ifnull(TIMESTAMPDIFF(MINUTE, o.preparation_start_time, IFNULL(preparation_time, now())), 0) as time_kitchen, ifnull(TIMESTAMPDIFF(MINUTE, o.bar_preparation_start_time, IFNULL(bar_preparation_time, now())), 0) as time_bar, is_bar_item as is_bar, is_kitchen_item as is_kitchen from tbl_order o where restaurant_branch_id = ${restaurant_id} AND o.order_status = 'in_preparation' AND o.restaurant_status = 'in_preparation'`, false).catch(() => ([]));

        let { setting_value } = await SELECT.One(`select setting_value from tbl_app_setting where setting_key = 'order_approval' AND country_name = '${country}'`);

        let { grace_time } = await SELECT.One(`select setting_value as grace_time from tbl_app_setting where setting_key = 'grace_time'`);

        let max_delays_promises = SELECT.One(`select SUM(TIMESTAMPDIFF(MINUTE, o.preparation_time, o.preparation_start_time) > ${Number(setting_value.maximum_kitchen_preparation_time) + Number(grace_time.order_preparation)}) as preparation_time, SUM(TIMESTAMPDIFF(MINUTE, o.bar_preparation_start_time, o.bar_preparation_time) > ${Number(setting_value.maximum_kitchen_preparation_time) + Number(grace_time.order_preparation)}) as bar_preparation_time, SUM(TIMESTAMPDIFF(MINUTE, o.packaging_time, o.rider_assign_time) > ${Number(setting_value.rider_assigning_time) + Number(grace_time.assigning)}) as rider_assign_time, SUM(TIMESTAMPDIFF(MINUTE, o.preparation_time, o.packaging_time) > ${Number(setting_value.order_packaging_time) + Number(grace_time.packaging)}) as packaging_time, SUM(TIMESTAMPDIFF(MINUTE, o.out_of_delivery_time, o.delivered_date_time) > (delivery_duration + ${Number(grace_time.rider_delivery_time)})) as rider_delayed from tbl_order as o where o.restaurant_branch_id = ${restaurant_id} AND o.admin_approval_status = 'approved' AND is_cancel_order = 0`, false);

        const [total_orders, live_orders, available_riders, detective_items, live_kitchen_bar_orders, max_delays] = await Promise.all([
            total_orders_promise,
            live_orders_promise,
            available_riders_promise,
            detective_items_promise,
            live_kitchen_bar_orders_promise,
            max_delays_promises
        ]);

        let send_data = {
            total_orders: total_orders || { dine_in: 0, pick_up: 0, delivery: 0, carhop: 0 },
            live_orders: live_orders || { is_delivery: 0, is_pickup: 0, is_dine_in: 0, is_carhop: 0, total_orders: 0 },
            available_riders: available_riders?.count || 0,
            detective_items: detective_items?.count || 0,
            live_kitchen_bar_orders,
            max_delays: {
                kitchen: max_delays.preparation_time || 0,
                bar: max_delays.bar_preparation_time || 0,
                cashier: max_delays.rider_assign_time || 0,
                controller: max_delays.packaging_time || 0,
                rider: max_delays.rider_delayed || 0
            }
        }

        return sendResponse(req, res, 200, 1, { keyword: "success" }, send_data);

    }
    catch (e) {
        return sendResponse(req, res, 200, 0, { keyword: e.message || "failed_to_fetch" });
    }
}

const action = async (req, res) => {
    try {
        let { restaurant_id, type, value } = req.body;

        if (type == 'rider_daily_least_target') {
            await UPDATE(`UPDATE tbl_restaurants SET rider_daily_least_target = ${value} WHERE id = ${restaurant_id}`);
        } else if (type == 'rider_daily_milestone') {
            await UPDATE(`UPDATE tbl_restaurants SET rider_daily_milestone = ${value} WHERE id = ${restaurant_id}`);
        }

        return sendResponse(req, res, 200, 1, { keyword: "success" });
    }
    catch (e) {
        return sendResponse(req, res, 200, 0, { keyword: e.message || "failed_to_fetch" });
    }
}

const add_restaurant = async (req, res) => {
    let image_ids = [];
    try {
        let { admin_id, country } = req.loginUser;

        let body = req.body;

        let images = body.images;
        delete body.images;

        let enc_ex_restaurant_id = cryptoLib.encrypt(body.ex_restaurant_id, shaKey, process.env.PASSWORD_ENC_IV);
        let en_password = cryptoLib.encrypt(body.password, shaKey, process.env.PASSWORD_ENC_IV);

        let restaurant_id = await INSERT('INSERT INTO tbl_restaurants SET ?', {
            name: body.name,
            latitude: body.latitude,
            longitude: body.longitude,
            address: body.address,
            country: country,
            // country_code: body.country_code,
            phone_number: body.phone_number,
            is_dine_in: body.is_dine_in,
            is_pick_up: body.is_pick_up,
            is_carhop: body.is_carhop,
            is_delivery: body.is_delivery,
            ex_restaurant_id: enc_ex_restaurant_id,
            password: en_password,
            wallet_payment_mode: JSON.stringify({
                "card": 1,
                "cash_on_delivery": 1,
                "airtel_money": 1,
                "momo_pay": 1,
                "mpesa": 1
            }),
            created_by: admin_id
        });

        if (images.length > 0) {
            image_ids = await save_multiple_images(images);

            if (image_ids.length > 0) {
                await UPDATE(`UPDATE tbl_restaurants SET image_ids = '${image_ids.toString()}' WHERE id = ${restaurant_id}`);
            }
        }

        return sendResponse(req, res, 200, 1, { keyword: "added" });
    }
    catch (err) {
        let keyword = "failed_to_add";
        if (err.message == 'duplicate_entry') {
            keyword = "restaurant_id_already_exist";
        }

        return sendResponse(req, res, 200, 0, { keyword });
    }
}

const edit_restaurant = async (req, res) => {
    try {
        let body = req.body;
        let restaurant_id = req.body.restaurant_id;

        let restaurant = await SELECT.One(`SELECT image_ids, (select ex_restaurant_id from tbl_restaurants where id != ${restaurant_id} AND ex_restaurant_id = '${body.ex_restaurant_id}') as ex_restaurant_id FROM tbl_restaurants WHERE id = ${restaurant_id} AND is_delete = 0`);

        if (restaurant.length == 0) {
            return sendResponse(req, res, 200, 2, { keyword: "restaurant_not_found" });
        } else if (restaurant.ex_restaurant_id) {
            return sendResponse(req, res, 200, 0, { keyword: "restaurant_id_already_exist" });
        }

        let enc_ex_restaurant_id = cryptoLib.encrypt(body.ex_restaurant_id, shaKey, process.env.PASSWORD_ENC_IV);
        let enc_password = cryptoLib.encrypt(body.password, shaKey, process.env.PASSWORD_ENC_IV);

        await UPDATE(`UPDATE tbl_restaurants SET ? WHERE id = ${restaurant_id}`, {
            name: body.name,
            latitude: body.latitude,
            longitude: body.longitude,
            address: body.address,
            // country_code: body.country_code,
            phone_number: body.phone_number,
            is_dine_in: body.is_dine_in,
            is_pick_up: body.is_pick_up,
            is_carhop: body.is_carhop,
            is_delivery: body.is_delivery,
            ex_restaurant_id: enc_ex_restaurant_id,
            password: enc_password,
            updated_by: req.loginUser.admin_id
        });

        let updated_images_ids = [];
        let newImages = body.images;
        delete body.images;
        let old_images = [];

        if (restaurant.image_ids != '' && restaurant.image_ids?.split(',')?.length > 0) {
            old_images = await SELECT.All(`SELECT id as image_id, name as image_name FROM tbl_media_files WHERE id IN (${restaurant.image_ids.split(',')})`);
        }

        updated_images_ids = await update_multiple_images(old_images, newImages.map(image => ({ image_name: image, type: null })));

        if (restaurant.image_ids != updated_images_ids.toString()) {
            await UPDATE(`UPDATE tbl_restaurants SET image_ids = '${updated_images_ids.toString()}' WHERE id = ${restaurant_id}`);
        }

        return sendResponse(req, res, 200, 1, { keyword: "edited" });
    }
    catch (e) {
        return sendResponse(req, res, 200, 0, { keyword: "failed_to_edit" });
    }
}

const delete_restaurant = async (req, res) => {
    try {
        let { restaurant_id } = req.body;

        await UPDATE(`UPDATE tbl_restaurants SET is_delete = 1 WHERE id = ${restaurant_id}`);

        return sendResponse(req, res, 200, 1, { keyword: "deleted" });
    }
    catch (e) {
        return sendResponse(req, res, 200, 0, { keyword: "failed_to_delete" });
    }
}

const feedback_and_comments = async (req, res) => {
    try {
        let { restaurant_id } = req.body;

        let feedbacks = await SELECT.All(`select f.id as feedback_id, f.rating, f.comment, (select group_concat(mf.name) as names from tbl_media_files mf where FIND_IN_SET(mf.id, f.media_ids)) as media_files, f.created_at, o.id as order_id, o.order_no, o.service_type from tbl_feedback f join tbl_order o on f.order_id = o.id where o.restaurant_branch_id = ${restaurant_id} AND f.is_delete = 0 order by f.id desc`);

        feedbacks = feedbacks.map(feedback => {
            feedback.images = feedback.media_files?.split(',').map(name => `${FEEDBACK_REVIEW_IMAGE_PATH}${name}`) || [];
            delete feedback.media_files;
            return feedback;
        });

        return sendResponse(req, res, 200, 1, { keyword: "success" }, feedbacks);
    }
    catch (e) {
        return sendResponse(req, res, 200, 0, { keyword: e.message || "failed_to_fetch" });
    }
}

const set_delivery_distance = async (req, res) => {
    try {
        let { restaurant_id, max_delivery_distance } = req.body;

        await UPDATE(`UPDATE tbl_restaurants SET max_delivery_distance = ${max_delivery_distance} WHERE id = ${restaurant_id}`);

        return sendResponse(req, res, 200, 1, { keyword: "saved" });
    }
    catch (e) {
        return sendResponse(req, res, 200, 0, { keyword: "failed_to_save" });
    }
}

//restaurant select option list
const select_option_list = async (req, res) => {
    try {
        let { country } = req.loginUser;

        let restaurants = await SELECT.All(`SELECT id as restaurant_id, name, country, (select currency from tbl_country where name = tbl_restaurants.country) as currency FROM tbl_restaurants WHERE is_active = 1 AND is_delete = 0 AND country = '${country}' ORDER BY name ASC`);

        return sendResponse(req, res, 200, 1, { keyword: "success" }, restaurants);
    }
    catch (e) {
        return sendResponse(req, res, 200, 0, { keyword: e.message || "failed_to_fetch" });
    }
}

///////////////////////////// Weekly Rider Pay Range //////////////////////////////////////
const weekly_rider_pay_range = {

    add: async (req, res) => {
        try {
            let { restaurant_id, from_milestone, to_milestone, amount } = req.body;

            if (from_milestone > to_milestone) {
                return sendResponse(req, res, 200, 0, { keyword: "invalid_range" });
            }

            let { count } = await SELECT.One(`SELECT count(*) as count FROM tbl_rider_weekly_milestone WHERE restaurant_id = ${restaurant_id} AND is_delete = 0 AND ( (from_milestone BETWEEN ${from_milestone} AND ${to_milestone}) OR (to_milestone BETWEEN ${from_milestone} AND ${to_milestone}) OR (${from_milestone} BETWEEN from_milestone AND to_milestone) OR (${to_milestone} BETWEEN from_milestone AND to_milestone))`);

            if (count > 0) {
                return sendResponse(req, res, 200, 0, { keyword: 'overlap_values', components: { "type": "Milestone" } });
            }

            await INSERT('INSERT INTO tbl_rider_weekly_milestone SET ?', {
                restaurant_id: restaurant_id,
                from_milestone: from_milestone,
                to_milestone: to_milestone,
                amount: amount
            });

            return sendResponse(req, res, 200, 1, { keyword: "added" });
        }
        catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_add" });
        }
    },

    edit: async (req, res) => {
        try {
            let { milestone_range_id, restaurant_id, from_milestone, to_milestone, amount } = req.body;

            if (from_milestone > to_milestone) {
                return sendResponse(req, res, 200, 0, { keyword: "invalid_range" });
            }

            let { count } = await SELECT.One(`SELECT count(*) as count FROM tbl_rider_weekly_milestone WHERE restaurant_id = ${restaurant_id} AND is_delete = 0 AND id != ${milestone_range_id} AND ( (from_milestone BETWEEN ${from_milestone} AND ${to_milestone}) OR (to_milestone BETWEEN ${from_milestone} AND ${to_milestone}) OR (${from_milestone} BETWEEN from_milestone AND to_milestone) OR (${to_milestone} BETWEEN from_milestone AND to_milestone))`);

            if (count > 0) {
                return sendResponse(req, res, 200, 0, { keyword: 'overlap_values', components: { "type": "Milestone" } });
            }

            await UPDATE(`UPDATE tbl_rider_weekly_milestone SET ? WHERE id = ${milestone_range_id} AND restaurant_id = ${restaurant_id}`, {
                from_milestone: from_milestone,
                to_milestone: to_milestone,
                amount: amount
            });

            return sendResponse(req, res, 200, 1, { keyword: "edited" });
        }
        catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_edit" });
        }
    },

    view: async (req, res) => {
        try {
            let { restaurant_id, milestone_range_id } = req.body;

            let data = '';
            if (milestone_range_id) {
                data = await SELECT.One(`SELECT id as milestone_range_id, restaurant_id, from_milestone, to_milestone, amount, 0 as rider_achieved FROM tbl_rider_weekly_milestone WHERE id = ${milestone_range_id} AND restaurant_id = ${restaurant_id} AND is_delete = 0`);
            } else {
                data = await SELECT.All(`SELECT id as milestone_range_id, restaurant_id, from_milestone, to_milestone, amount FROM tbl_rider_weekly_milestone WHERE restaurant_id = ${restaurant_id} AND is_delete = 0`);

                const weekStart = moment().utc().clone().startOf('week').format('YYYY-MM-DD');
                const weekEnd = moment().utc().clone().endOf('week').format('YYYY-MM-DD');

                const rider_order_counts = await SELECT.All(`select id as riders, (select count(id) from tbl_order where rider_id = ru.id AND admin_approval_status = 'approved' AND order_status = 'delivered' AND delivered_date_time = current_date()) as order_count, (select count(id) from tbl_order where rider_id = ru.id AND admin_approval_status = 'approved' AND order_status = 'delivered' AND delivered_date_time between '${weekStart}' AND '${weekEnd}') as week_order_count from tbl_rider_users as ru where branch_id = '${restaurant_id}' AND is_active = 1 AND is_delete = 0`, false);

                data = data?.map(milestone => {
                    const ridersAchieved = rider_order_counts.reduce((count, rider) => {
                        if (rider.week_order_count >= milestone.from_milestone &&
                            rider.week_order_count <= milestone.to_milestone) {
                            return count + 1;
                        }
                        return count;
                    }, 0);
                    return {
                        ...milestone,
                        rider_achieved: ridersAchieved
                    }
                });
            }

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
        }
        catch (e) {
            return sendResponse(req, res, 200, 2, { keyword: e.message || "failed_to_fetch" });
        }
    },

    delete: async (req, res) => {
        try {
            let { milestone_range_id } = req.body;

            await UPDATE(`UPDATE tbl_rider_weekly_milestone SET is_delete = 1 WHERE id = ${milestone_range_id}`);

            return sendResponse(req, res, 200, 1, { keyword: "deleted" });
        }
        catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_delete" });
        }
    }
}

const time_table = {
    add_v2: async (req, res) => {
        try {
            let body = req.body;
            let restaurant_id = req.body.restaurant_id;

            each(body.day_name, async (day, next) => {

                Promise.all([
                    INSERT('INSERT INTO tbl_restaurant_time_tables SET ?', {
                        restaurant_id: restaurant_id,
                        service_type: 'dine_in',
                        day_name: day,
                        open_time: body.dine_in_start_time,
                        close_time: body.dine_in_end_time
                    }).catch(e => { }),

                    INSERT('INSERT INTO tbl_restaurant_time_tables SET ?', {
                        restaurant_id: restaurant_id,
                        service_type: 'pick_up',
                        day_name: day,
                        open_time: body.pick_up_start_time,
                        close_time: body.pick_up_end_time
                    }).catch(e => { }),

                    INSERT('INSERT INTO tbl_restaurant_time_tables SET ?', {
                        restaurant_id: restaurant_id,
                        service_type: 'carhop',
                        day_name: day,
                        open_time: body.carhop_start_time,
                        close_time: body.carhop_end_time
                    }).catch(e => { }),

                    INSERT('INSERT INTO tbl_restaurant_time_tables SET ?', {
                        restaurant_id: restaurant_id,
                        service_type: 'delivery',
                        day_name: day,
                        open_time: body.delivery_start_time,
                        close_time: body.delivery_end_time
                    }).catch(e => { })
                ]).then(() => {
                    next();
                }).catch(e => {
                    next(e);
                });

            }, (err) => {
                if (err) {
                    return sendResponse(req, res, 200, 0, { keyword: "failed_to_add" });
                } else {
                    return sendResponse(req, res, 200, 1, { keyword: "added" });
                }
            });
        }
        catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_add" });
        }
    },

    add: async (req, res) => {
        try {
            let body = req.body;
            let restaurant_id = req.body.restaurant_id;

            await Promise.all([
                INSERT('INSERT INTO tbl_restaurant_time_tables SET ?', {
                    restaurant_id: restaurant_id,
                    service_type: 'dine_in',
                    day_name: body.day_name,
                    open_time: body.dine_in_start_time,
                    close_time: body.dine_in_end_time
                }),
                INSERT('INSERT INTO tbl_restaurant_time_tables SET ?', {
                    restaurant_id: restaurant_id,
                    service_type: 'pick_up',
                    day_name: body.day_name,
                    open_time: body.pick_up_start_time,
                    close_time: body.pick_up_end_time
                }),
                INSERT('INSERT INTO tbl_restaurant_time_tables SET ?', {
                    restaurant_id: restaurant_id,
                    service_type: 'carhop',
                    day_name: body.day_name,
                    open_time: body.carhop_start_time,
                    close_time: body.carhop_end_time
                }),
                INSERT('INSERT INTO tbl_restaurant_time_tables SET ?', {
                    restaurant_id: restaurant_id,
                    service_type: 'delivery',
                    day_name: body.day_name,
                    open_time: body.delivery_start_time,
                    close_time: body.delivery_end_time
                })
            ]);

            return sendResponse(req, res, 200, 1, { keyword: "added" });
        }
        catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_add" });
        }
    },

    edit_v2: async (req, res) => {
        try {
            let body = req.body;
            let restaurant_id = req.body.restaurant_id;

            each(body.day_name, async (day, next) => {

                Promise.all([
                    UPDATE(`UPDATE tbl_restaurant_time_tables SET ? WHERE restaurant_id = '${restaurant_id}' AND service_type = 'dine_in' AND day_name = '${day}'`, {
                        open_time: body.dine_in_start_time,
                        close_time: body.dine_in_end_time
                    }),

                    UPDATE(`UPDATE tbl_restaurant_time_tables SET ? WHERE restaurant_id = '${restaurant_id}' AND service_type = 'pick_up' AND day_name = '${day}'`, {
                        open_time: body.pick_up_start_time,
                        close_time: body.pick_up_end_time
                    }),

                    UPDATE(`UPDATE tbl_restaurant_time_tables SET ? WHERE restaurant_id = '${restaurant_id}' AND service_type = 'carhop' AND day_name = '${day}'`, {
                        open_time: body.carhop_start_time,
                        close_time: body.carhop_end_time
                    }),

                    UPDATE(`UPDATE tbl_restaurant_time_tables SET ? WHERE restaurant_id = '${restaurant_id}' AND service_type = 'delivery' AND day_name = '${day}'`, {
                        open_time: body.delivery_start_time,
                        close_time: body.delivery_end_time
                    })
                ]).then(() => {
                    next();
                }).catch(e => {
                    next(e);
                });
            }, (err) => {
                if (err) {
                    return sendResponse(req, res, 200, 0, { keyword: "failed_to_edit" });
                } else {
                    return sendResponse(req, res, 200, 1, { keyword: "edited" });
                }
            });
        }
        catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_edit" });
        }
    },

    edit: async (req, res) => {
        try {
            let body = req.body;
            let restaurant_id = req.body.restaurant_id;

            await Promise.all([
                UPDATE(`UPDATE tbl_restaurant_time_tables SET ? WHERE restaurant_id = '${restaurant_id}' AND service_type = 'dine_in' AND day_name = '${body.day_name}'`, {
                    open_time: body.dine_in_start_time,
                    close_time: body.dine_in_end_time
                }),

                UPDATE(`UPDATE tbl_restaurant_time_tables SET ? WHERE restaurant_id = '${restaurant_id}' AND service_type = 'pick_up' AND day_name = '${body.day_name}'`, {
                    open_time: body.pick_up_start_time,
                    close_time: body.pick_up_end_time
                }),

                UPDATE(`UPDATE tbl_restaurant_time_tables SET ? WHERE restaurant_id = '${restaurant_id}' AND service_type = 'carhop' AND day_name = '${body.day_name}'`, {
                    open_time: body.carhop_start_time,
                    close_time: body.carhop_end_time
                }),

                UPDATE(`UPDATE tbl_restaurant_time_tables SET ? WHERE restaurant_id = '${restaurant_id}' AND service_type = 'delivery' AND day_name = '${body.day_name}'`, {
                    open_time: body.delivery_start_time,
                    close_time: body.delivery_end_time
                })
            ]);

            return sendResponse(req, res, 200, 1, { keyword: "edited" });
        }
        catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_edit" });
        }
    },

    view: async (req, res) => {
        try {
            let { restaurant_id, day_name } = req.body;

            let data = await SELECT.All(`SELECT restaurant_id, service_type, day_name, open_time, close_time FROM tbl_restaurant_time_tables WHERE restaurant_id = ${restaurant_id}`);

            // Days of the week
            const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

            // Order of service types
            const sortOrder = ["dine_in", "pick_up", "carhop", "delivery"];

            // Generate the array object
            let send_data = _.map(days, (day) => {
                const time_table = _.chain(data)
                    .filter({ day_name: day })
                    .map((item) => _.omit(item, ["restaurant_id", "day_name"]))
                    .sortBy((item) => sortOrder.indexOf(item.service_type))
                    .value();

                return {
                    day_name: day,
                    restaurant_id: restaurant_id,
                    time_table: time_table
                };
            });

            if (day_name) {
                send_data = send_data.find(item => item.day_name == day_name);
            }

            return sendResponse(req, res, 200, 1, { keyword: "success" }, send_data);
        }
        catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: e.message || "failed_to_fetch" });
        }
    }
}

module.exports = {
    view_restaurant,
    live_orders,
    list_restaurants,
    feedback_and_comments,
    view_live_orders_updates,
    add_restaurant,
    edit_restaurant,
    delete_restaurant,
    select_option_list,
    set_delivery_distance,
    action,

    weekly_rider_pay_range,
    time_table
};