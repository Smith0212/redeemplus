const { SELECT, INSERT, UPDATE, DELETE } = require('../../utils/SQLWorker');
const { sendResponse, checkRolePermissionInModel } = require('../../middleware');
const { TaxPercentage, ADMIN_IMAGE_PATH, RIDER_IMAGE_PATH, RESTAURANT_IMAGE_PATH, MENU_IMAGE_PATH, USER_IMAGE_PATH, MENU_COMPLIMENTARY_IMAGE_PATH, ORDER_REPORT_IMAGE_PATH } = require('../../config/constants');
const _ = require('lodash');
const moment = require('moment');
const each = require('async-each');
const sendPush = require('../../utils/configNotification');
const XLSX = require('xlsx');
const path = require('path');

let commonModel = {

    webhook: async (req, res) => {
        try {

            await INSERT(`INSERT INTO tbl_webhook_logs SET ?`, {
                type: 'order',
                request: JSON.stringify(req.body)
            });

            return sendResponse(req, res, 200, 1, { keyword: "success" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    new_orders_counts: async (req, res) => {
        try {
            let { country } = req.loginUser;

            let current_time = moment().utc().format('YYYY-MM-DD HH:mm:ss');
            let hour_after_1 = moment().add(1, 'hours').utc().format('YYYY-MM-DD HH:mm:ss');

            let counts = await SELECT.One(`SELECT SUM(CASE WHEN o.service_type = 'delivery' THEN 1 ELSE 0 END) AS delivery, SUM(CASE WHEN o.service_type = 'dine_in' THEN 1 ELSE 0 END) AS dine_in, SUM(CASE WHEN o.service_type = 'carhop' THEN 1 ELSE 0 END) AS carhop, SUM(CASE WHEN o.service_type = 'pick_up' THEN 1 ELSE 0 END) AS pick_up FROM tbl_order o join tbl_user_select_service uss on o.service_id = uss.id join tbl_users u on o.user_id = u.id WHERE o.country = '${country}' AND o.order_status = 'pending' AND ((uss.order_type = 'order_now' AND date(o.order_date_time) = CURDATE()) OR (uss.order_type = 'schedule_order' AND timestamp(concat(uss.schedule_date, ' ', uss.schedule_time)) BETWEEN '${current_time}' AND '${hour_after_1}')) AND (o.payment_status = 'paid' OR o.payment_method = 'cash on delivery') AND date(o.order_date_time) = CURDATE() AND o.is_active = 1 AND o.is_delete = 0 AND u.is_active = 1 AND u.is_delete = 0 AND restaurant_branch_id not in (select id from tbl_restaurants where is_delete = 1 AND is_active = 0)`);

            counts = _.mapValues(counts, (value, key) => value === null ? 0 : value);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, counts);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    rider_tracking: async (req, res) => {
        try {
            let { order_id } = req.body;

            let { order_status, rider_id, delivery_address_id, restaurant_branch_id } = await SELECT.One(`SELECT restaurant_branch_id, delivery_address_id, order_status, rider_id FROM tbl_order WHERE id = ${order_id}`);

            if (order_status != 'out_for_delivery' && order_status != 'delivered') {
                let err = new Error('order_ststus_not_valid');
                err.type = order_status;
                throw err;
            }

            let start = {};
            let end = {};
            let type = 'live';
            let history = [];
            if (order_status == 'out_for_delivery') {
                let { current_latitude, current_longitude } = await SELECT.One(`SELECT current_latitude, current_longitude FROM tbl_rider_users WHERE id = ${rider_id}`);

                start = {
                    latitude: current_latitude,
                    longitude: current_longitude
                }

                let { delivery_latitude, delivery_longitude } = await SELECT.One(`SELECT delivery_latitude, delivery_longitude FROM tbl_user_delivery_address WHERE id = ${delivery_address_id}`);

                end = {
                    latitude: delivery_latitude,
                    longitude: delivery_longitude
                }
            } else if (order_status == 'delivered') {
                type = 'completed';

                let { latitude, longitude } = await SELECT.One(`SELECT latitude, longitude FROM tbl_restaurants WHERE id = ${restaurant_branch_id}`);

                start = {
                    latitude: latitude,
                    longitude: longitude
                }

                let { delivered_latitude, delivered_longitude } = await SELECT.One(`SELECT delivered_latitude, delivered_longitude FROM tbl_order WHERE id = ${order_id}`);

                end = {
                    latitude: delivered_latitude,
                    longitude: delivered_longitude
                }

                history = await SELECT.All(`SELECT latitude, longitude, created_at from tbl_rider_lat_long_history where order_id = ${order_id} and rider_id = ${rider_id} order by created_at desc`);

            }


            return sendResponse(req, res, 200, 1, { keyword: "success" }, { type, start, end, history });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch', components: { type: err?.type } });
        }
    },

    list_counts: async (req, res) => {
        try {
            let { admin_id, country } = req.loginUser;
            let { service_type } = req.body;

            await checkRolePermissionInModel(admin_id, service_type, 'view');

            let current_time = moment().utc().format('YYYY-MM-DD HH:mm:ss');
            let hour_after_1 = moment().add(1, 'hours').utc().format('YYYY-MM-DD HH:mm:ss');

            let sql_q = `SELECT count(o.id) AS total,
       SUM(CASE
               WHEN o.order_status = 'pending' AND ((uss.order_type = 'order_now' AND date(o.order_date_time) = CURDATE()) OR (uss.order_type = 'schedule_order' AND timestamp(concat(uss.schedule_date, ' ', uss.schedule_time)) BETWEEN '${current_time}' AND '${hour_after_1}')) THEN 1
               ELSE 0
           END) AS new,
       SUM(CASE
               WHEN uss.order_type = 'schedule_order'
                    AND o.order_status = 'pending' THEN 1
               ELSE 0
           END) AS scheduled,
       SUM(CASE
               WHEN o.order_status = 'in_preparation'
                    AND o.restaurant_status IN ('in_preparation', 'in_packaging') THEN 1
               ELSE 0
           END) AS in_preparation,
       SUM(CASE
               WHEN o.order_status IN ('in_preparation', 'ready_for_pick_up', 'ready_for_serve')
                    AND o.restaurant_status IN ('is_packaged', 'ready_for_pick_up', 'ready_for_serve') THEN 1
               ELSE 0
           END) AS ready,
       SUM(CASE
               WHEN o.order_status IN ('out_for_delivery', 'ready_for_pick_up', 'ready_for_serve')
                    AND o.restaurant_status IN ('out_for_delivery', 'ready_for_pick_up', 'ready_for_serve') THEN 1
               ELSE 0
           END) AS picked_up,
       SUM(CASE
               WHEN o.order_status IN ('delivered', 'completed', 'served')
                    AND
                      (SELECT count(*)
                       FROM tbl_order_items
                       WHERE order_id = o.id
                         AND is_replace = 0) > 0 THEN 1
               ELSE 0
           END) AS completed,
       SUM(CASE
               WHEN o.is_replacement_order = 1 THEN 1
               ELSE 0
           END) AS replacements,
       SUM(CASE
               WHEN o.order_status IN ('cancelled', 'not_delivered')
                    AND o.is_cancel_order = 1 THEN 1
               ELSE 0
           END) AS cancelled
FROM tbl_order o
JOIN tbl_user_select_service uss ON o.service_id = uss.id
JOIN tbl_users u ON o.user_id = u.id
WHERE o.service_type = '${service_type}' AND o.country = '${country}'
  AND (o.payment_status = 'paid' OR o.payment_method = 'cash on delivery')
  AND o.admin_approval_status != 'rejected'
  AND restaurant_branch_id NOT IN
    (SELECT id
     FROM tbl_restaurants
     WHERE is_active = 0
       AND is_delete = 1)
  AND o.is_active = 1
  AND o.is_delete = 0
  AND u.is_active = 1
  AND u.is_delete = 0`;

            let counts = await SELECT.One(sql_q);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, _.mapValues(counts, (value, key) => value === null ? 0 : value));
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    order_live_status: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { service_type } = req.body;

            await checkRolePermissionInModel(admin_id, service_type, 'view');

            let counts = await SELECT.All(`SELECT o.restaurant_branch_id, (select name from tbl_restaurants where id = o.restaurant_branch_id) as branch_name, SUM(IF(o.restaurant_status = 'in_preparation', 1, 0)) as in_preparation, SUM(IF(o.restaurant_status = 'in_packaging', 1, 0)) as in_packaging, SUM(IF(o.restaurant_status = 'is_packaged', 1, 0)) as ready, count(o.id) as total FROM tbl_order o where o.service_type = '${service_type}' AND o.order_status = 'in_preparation' AND o.is_active = 1 AND o.is_delete = 0 group by o.restaurant_branch_id ORDER BY total DESC`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, counts);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    order_list: async (req, res) => {
        try {
            let { admin_id, country } = req.loginUser;
            let { page = 1, limit = 1, type = 'All', restaurant_branch_id, service_type } = req.body;

            await checkRolePermissionInModel(admin_id, service_type, 'view');

            let current_time = moment().utc().format('YYYY-MM-DD HH:mm:ss');
            let hour_after_1 = moment().add(1, 'hours').utc().format('YYYY-MM-DD HH:mm:ss');

            let addTypeWhere = '';
            if (type === 'new') {
                addTypeWhere = `AND o.order_status = 'pending' AND ((uss.order_type = 'order_now' AND date(o.order_date_time) = CURDATE()) OR (uss.order_type = 'schedule_order' AND timestamp(concat(uss.schedule_date, ' ', uss.schedule_time)) BETWEEN '${current_time}' AND '${hour_after_1}'))`;
            } else if (type === 'scheduled') {
                addTypeWhere = `AND uss.order_type = 'schedule_order' AND o.order_status = 'pending'`;
            } else if (type === 'in_preparation') {
                addTypeWhere = `AND o.order_status = 'in_preparation' AND o.restaurant_status in ('in_preparation', 'in_packaging')`;
            } else if (type === 'ready') {
                addTypeWhere = `AND o.order_status in ('in_preparation', 'ready_for_pick_up','ready_for_serve') AND o.restaurant_status in ('is_packaged', 'ready_for_pick_up','ready_for_serve')`;
            } else if (type === 'picked_up') {
                addTypeWhere = `AND o.order_status in ('out_for_delivery', 'ready_for_pick_up', 'ready_for_serve') AND o.restaurant_status in ('out_for_delivery', 'ready_for_pick_up', 'ready_for_serve')`;
            } else if (type === 'completed') {
                addTypeWhere = `AND o.order_status in ('delivered', 'completed', 'served') AND (select count(id) from tbl_order_items where order_id = o.id and is_replace = 0) > 0`;
            } else if (type === 'replacements') {
                // addTypeWhere = `AND o.order_status in ('delivered', 'completed', 'served') AND (select count(*) from tbl_order_items where order_id = o.id and is_replace = 1) > 0`;
                addTypeWhere = `AND o.is_replacement_order = 1`;
            } else if (type === 'cancelled') {
                addTypeWhere = `AND o.order_status in ('cancelled', 'not_delivered') AND o.is_cancel_order = 1`;
            }

            let addRestaurantWhere = '';
            if (restaurant_branch_id) {
                addRestaurantWhere = `AND o.restaurant_branch_id = ${restaurant_branch_id}`
            }

            let sql = `SELECT o.id as order_id, o.user_id, o.order_no, concat(u.first_name, ' ', u.last_name) as user_name, concat(u.country_code, ' ', u.phone) as user_phone, o.order_status, (select name from tbl_admin_users_color_codes as aucc where id = u.user_color_code_id) as user_type, (select color_code from tbl_admin_users_color_codes as aucc where id = u.user_color_code_id) as user_type_color_code, o.delivery_address_id, (select TRIM(CONCAT_WS(', ', NULLIF(delivery_flat, ''), NULLIF(delivery_area, ''), NULLIF(delivery_landmark, ''), NULLIF(delivery_city, ''), NULLIF(delivery_state, ''), NULLIF(delivery_country, ''))) AS full_address from tbl_user_delivery_address where id = o.delivery_address_id) as delivery_address, table_number, merged_table_number, (SELECT assign_waiter_id FROM tbl_dining_table WHERE (table_number = o.table_number OR group_name = o.table_number) AND branch_id = o.restaurant_branch_id LIMIT 1) AS waiter_id, (SELECT name FROM tbl_restaurant_staff_member WHERE id = waiter_id) AS waiter_name, (select name from tbl_restaurants where id = o.restaurant_branch_id) as restaurant_name, (select name from tbl_admin_users where id = o.admin_action_by) as approved_by, (CASE WHEN o.preparation_time IS NULL THEN (select sum(preparation_time) from tbl_order_items oi join tbl_menu_items mi on oi.menu_item_id = mi.id where oi.order_id = o.id) ELSE TIMESTAMPDIFF(MINUTE, o.admin_action_time, o.preparation_time) END) as in_preparation_time, o.is_priority_order, o.order_date_time, CASE WHEN uss.order_type = 'order_now' THEN o.service_time ELSE CAST(concat(uss.schedule_date, ' ', uss.schedule_time) AS DATETIME) END as delivery_date_time, o.admin_action_time, (select name from tbl_admin_users where id = o.admin_action_by) as approved_by, out_of_delivery_time, CASE WHEN o.preparation_time IS NULL THEN (select sum(preparation_time) from tbl_order_items oi join tbl_menu_items mi on oi.menu_item_id = mi.id where oi.order_id = o.id) ELSE TIMESTAMPDIFF(MINUTE, o.admin_action_time, o.preparation_time) END as in_preparation_time, TIMESTAMPDIFF(MINUTE, o.preparation_time, o.packaging_time) as in_packaging_time, TIMESTAMPDIFF(MINUTE, o.rider_assign_time, o.delivered_date_time) as in_delivered_time, o.cooking_instruction, o.delivery_instruction, o.payment_method, o.total_amount, (select concat(first_name, ' ', last_name) as name from tbl_rider_users where id = o.rider_id) as rider_name, TIMESTAMPDIFF(MINUTE, o.packaging_time, o.served_date_time) as served_time, o.service_time as delivery_time, o.rider_assign_time, 0 as return_time, MAX(orr.created_at) AS replacement_date_time, SUM(orr.total_amount) as replacement_amount, (select GROUP_CONCAT(item_name ORDER BY item_name SEPARATOR ', ') AS names from tbl_order_replace_or_refund_items WHERE order_id = o.id) AS replacement_items, o.cancelled_by, (select reason from tbl_cancellation_reason where id = o.cancel_reason_id) as cancel_reason, o.cancel_reason as cancel_reason_other FROM tbl_order as o JOIN tbl_users as u ON o.user_id = u.id join tbl_user_select_service uss on o.service_id = uss.id LEFT JOIN tbl_order_replace_or_refund AS orr ON o.id = orr.order_id WHERE o.service_type = '${service_type}' AND o.country = '${country}' AND (o.payment_status = 'paid' OR o.payment_method = 'cash on delivery') ${addTypeWhere} ${addRestaurantWhere} AND o.admin_approval_status != 'rejected' AND o.is_active = 1 AND o.is_delete = 0 AND u.is_active = 1 AND u.is_delete = 0 AND restaurant_branch_id not in (select id from tbl_restaurants where is_delete = 1 AND is_active = 0) GROUP BY o.id ORDER BY o.created_at DESC`;

            let orders = await SELECT.All(sql);

            let user_ids = orders.map(order => order.user_id);

            let comments = user_ids.length > 0 ? await SELECT.All(`SELECT id as comment_id, user_id, (select name from tbl_admin_users where id = tbl_admin_users_comments.created_by) as created_by, alert_to, title, description, status, created_at FROM tbl_admin_users_comments where user_id in (${user_ids}) AND status = 'pending'`, false) : 0

            let order_ids = orders.filter(o => o.order_id != null).map(order => order.order_id);

            let orders_items = (order_ids.length > 0) ? await SELECT.All(`select order_id, name, quantity from tbl_order_items where order_id in (${order_ids}) AND is_delete = 0`, false) : [];

            orders = orders.map(order => {
                order.items = orders_items.filter(item => item.order_id === order.order_id)
                order.comments = comments.filter(comment => comment.user_id === order.user_id)
                return order;
            });

            return sendResponse(req, res, 200, 1, { keyword: "success" }, orders);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    add_comment: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { order_id, comment, receiver_type } = req.body;

            let { user_id, restaurant_branch_id, rider_id, service_type } = await SELECT.One(`SELECT user_id, rider_id, service_type, restaurant_branch_id FROM tbl_order WHERE id = ${order_id}`);

            await checkRolePermissionInModel(admin_id, service_type, 'edit');

            await INSERT(`INSERT INTO tbl_order_comments SET ?`, {
                admin_id,
                order_id,
                user_id,
                rider_id,
                restaurant_branch_id,
                comment,
                sender_type: 'admin',
                receiver_type: receiver_type
            });

            await INSERT(`INSERT INTO tbl_admin_users_comments SET ?`, {
                order_id,
                user_id,
                alert_to: receiver_type,
                title: 'Order Comment',
                description: comment,
                status: 'pending',
                created_by: admin_id,
                role_created_by: 'admin',
            });

            return sendResponse(req, res, 200, 1, { keyword: "added" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_add' });
        }
    },

    order_update_address: async (req, res) => {
        try {
            let { order_id, delivery_address_id } = req.body;

            let { service_type } = await SELECT.One(`SELECT service_type FROM tbl_order WHERE id = ${order_id}`);

            await checkRolePermissionInModel(req.loginUser.admin_id, service_type, 'edit');

            await UPDATE(`UPDATE tbl_order SET delivery_address_id = ${delivery_address_id} WHERE id = ${order_id}`);

            return sendResponse(req, res, 200, 1, { keyword: "updated" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_update' });
        }
    },

    rider_list: async (req, res) => {
        try {
            let riders = await SELECT.All(`SELECT id as rider_id, concat(first_name, ' ', last_name) as name, phone, username_email, ifnull(concat('${RIDER_IMAGE_PATH}', profile_image), '${RIDER_IMAGE_PATH}default.png') as profile_image, 0 as km FROM tbl_rider_users WHERE is_active = 1 AND is_delete = 0`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, riders);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    assign_rider: async (req, res) => {
        let { admin_id } = req.loginUser;
        try {
            let { order_id, rider_id } = req.body;

            let { order_status, order_no, user_id, restaurant_branch_id, restaurant_status, service_type } = await SELECT.One(`SELECT order_no, restaurant_branch_id, order_status, user_id, service_type, restaurant_status FROM tbl_order WHERE id = ${order_id}`);

            await checkRolePermissionInModel(admin_id, service_type, 'edit');

            if (order_status != 'in_preparation') {
                let err = new Error('order_not_in_preparation');
                err.type = order_status;
                throw err;
            }

            if (restaurant_status == 'in_preparation') {
                throw new Error('order_currently_in_preparation');
            }

            if (restaurant_status == 'in_packaging') {
                throw new Error('order_currently_in_packaging');
            }

            await UPDATE(`UPDATE tbl_order SET rider_id = ${rider_id}, order_status = 'out_for_delivery', rider_assign_time = now(), restaurant_status = 'out_for_delivery' WHERE id = ${order_id} AND service_type = 'delivery'`);

            await UPDATE(`UPDATE tbl_order_comments SET rider_id = ${rider_id}, restaurant_branch_id = ${restaurant_branch_id} WHERE order_id = ${order_id}`);

            // send push notification to rider
            let push_params = {
                sender_id: admin_id,
                sender_type: "admin",
                receiver_id: rider_id,
                receiver_type: "rider",
                title: `Order Assigned`,
                body: `You have been assigned to deliver an order #${order_no}.`,
                tag: "order_assign_to_rider",
                is_read: 0,
                is_insert: 1,
                image_url: null,
                image: null,
                ref_id: order_id,
                ref_tbl_name: "order",
            };

            // send push notification to user
            let user_push_params = {
                sender_id: admin_id,
                sender_type: "admin",
                receiver_id: user_id,
                receiver_type: "customer",
                title: `Order Assigned to Rider`,
                body: `Your order #${order_no} has been assigned to a rider.`,
                tag: "order_assign_to_rider",
                is_read: 0,
                is_insert: 1,
                image_url: null,
                image: null,
                ref_id: order_id,
                ref_tbl_name: "order",
            };

            setTimeout(() => {
                sendPush(push_params);
                sendPush(user_push_params);
            }, 1000);

            return sendResponse(req, res, 200, 1, { keyword: "assign_order" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || "failed" });
        }
    },

    edit_pick_up_time: async (req, res) => {
        try {
            let { user_select_service_id, pick_up_time } = req.body;

            let date = moment(pick_up_time, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD');
            let time = moment(pick_up_time, 'YYYY-MM-DD HH:mm:ss').format('HH:mm:ss');

            await UPDATE(`UPDATE tbl_order SET schedule_date = '${date}', schedule_time = '${time}' WHERE id = ${user_select_service_id}`);

            return sendResponse(req, res, 200, 1, { keyword: "edited" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_edit' });
        }
    },

    near_by_restaurants: async (req, res) => {
        try {
            let { admin_id, country } = req.loginUser;
            let { order_id } = req.body;

            let { restaurant_branch_id, service_type } = await SELECT.One(`SELECT restaurant_branch_id, service_type FROM tbl_order WHERE id = ${order_id}`);

            await checkRolePermissionInModel(admin_id, service_type, 'view');

            let latitude, longitude;
            if (service_type == 'delivery') {
                let address_lat_long = await SELECT.One(`SELECT delivery_latitude as latitude, delivery_longitude as longitude FROM tbl_user_delivery_address WHERE id = (select delivery_address_id from tbl_order where id = ${order_id})`);

                latitude = address_lat_long.latitude;
                longitude = address_lat_long.longitude;
            } else if (service_type == 'carhop' || service_type == 'dine_in' || service_type == 'dine_in') {
                let address_lat_long = await SELECT.One(`SELECT latitude, longitude FROM tbl_restaurants WHERE id = (select restaurant_branch_id from tbl_order where id = ${order_id})`);

                latitude = address_lat_long.latitude;
                longitude = address_lat_long.longitude;
            }

            let restaurants = await SELECT.All(`SELECT id AS restaurant_branch_id, name, CAST((6371 * ACOS(COS(RADIANS('${latitude}')) * COS(RADIANS(latitude)) * COS(RADIANS(longitude) - RADIANS('${longitude}')) + SIN(RADIANS('${latitude}')) * SIN(RADIANS(latitude)))) AS DECIMAL(10, 2)) AS distance FROM tbl_restaurants where country = '${country}' AND is_active = 1 AND is_delete = 0 AND (SELECT COUNT(id) FROM tbl_restaurant_time_tables WHERE restaurant_id = tbl_restaurants.id AND service_type = '${service_type}' AND day_name = DAYNAME(CURDATE()) AND ((open_time < close_time AND CURRENT_TIME() BETWEEN open_time AND close_time) OR (open_time > close_time AND (CURRENT_TIME() >= open_time OR CURRENT_TIME() <= close_time))) AND is_active = 1 AND is_delete = 0) > 0`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, restaurants);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    action_order: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { order_id, action, restaurant_branch_id, service_time, reason, is_priority } = req.body;

            let { service_type, user_id, order_no, service_id, order_type, total_amount, loyalty_point } = await SELECT.One(`SELECT service_type, (select order_type from tbl_user_select_service where id = tbl_order.service_id) as order_type, user_id, order_no, service_id FROM tbl_order WHERE id = ${order_id}`);

            await checkRolePermissionInModel(admin_id, service_type, 'edit');

            if (!req.body?.is_edit) {
                let { admin_approval_status } = await SELECT.One(`SELECT admin_approval_status FROM tbl_order WHERE id = ${order_id}`);

                if (admin_approval_status != 'pending') {
                    let err = new Error('order_already_actioned');
                    err.type = admin_approval_status;
                    throw err;
                }
            }

            let keyword = '';
            if (action === 'approve') {
                keyword = "order_accepted";
                let update_details = {
                    admin_approval_status: 'approved',
                    restaurant_branch_id: restaurant_branch_id,
                    admin_action_time: new Date(),
                    admin_action_by: admin_id,
                    service_time: moment().add(service_time, 'minutes').format('YYYY-MM-DD HH:mm:00'),
                    service_minutes: service_time,
                    order_status: 'accepted',
                    is_priority_order: is_priority || 0
                }

                if (req.body?.is_edit == true) {
                    delete update_details.admin_approval_status;
                    delete update_details.admin_action_time;
                    delete update_details.order_status;
                }

                await UPDATE(`UPDATE tbl_order SET ? WHERE id = ${order_id} AND admin_approval_status in ('pending', 'approved')`, update_details);

                if (!req.body?.is_edit) {

                    let push_params_accepted = {
                        sender_id: admin_id,
                        sender_type: "admin",
                        receiver_id: user_id,
                        receiver_type: "customer",
                        title: `Order Accepted`,
                        body: `Your order #${order_no} has been accepted by the restaurant.`,
                        tag: "order_accepted",
                        is_read: 0,
                        is_insert: 1,
                        image_url: null,
                        image: null,
                        ref_id: order_id,
                        ref_tbl_name: "order",
                    };

                    sendPush(push_params_accepted);

                    await UPDATE(`UPDATE tbl_order SET preparation_start_time = now(), order_status = 'in_preparation', restaurant_status = 'in_preparation' WHERE id = ${order_id} AND (select order_type from tbl_user_select_service where id = tbl_order.service_id) = 'order_now'`).then(e => console.log(e)).catch(err => { });

                    if (order_type == 'order_now') {

                        let push_params = {
                            sender_id: admin_id,
                            sender_type: "admin",
                            receiver_id: user_id,
                            receiver_type: "customer",
                            title: `Your order is being prepared`,
                            body: `Your order is in the kitchen`,
                            tag: "order_in_preparation",
                            is_read: 0,
                            is_insert: 1,
                            image_url: null,
                            image: null,
                            ref_id: order_id,
                            ref_tbl_name: "order",
                            other_data: {
                                "service_type": service_type,
                                "service_id": service_id,
                                "order_no": order_no
                            }
                        };

                        sendPush(push_params);
                    }

                    await createExcelFile(125);
                }
            } else if (action === 'reject') {

                keyword = "order_rejected";

                await UPDATE(`UPDATE tbl_order SET ? WHERE id = ${order_id} AND admin_approval_status = 'pending'`, {
                    admin_approval_status: 'rejected',
                    admin_reject_reason: reason,
                    admin_action_time: new Date(),
                    admin_action_by: admin_id,
                    order_status: 'cancelled',
                    is_cancel_order: 1,
                    cancelled_by: 'admin'
                });

                let transactionId = 'Txn' + Math.floor(1000000 + Math.random() * 9000000);

                await INSERT(`INSERT INTO tbl_user_wallet_transaction_history SET ?`, {
                    user_id: user_id,
                    type: 'refund_cancellation_order_amount',
                    reference_id: order_id,
                    transaction_type: 'credit',
                    transaction_id: transactionId,
                    wallet_amount: Number(total_amount),
                    payment_method: "wallet",
                    payment_status: 'paid'
                });

                await UPDATE(`UPDATE tbl_users SET wallet_amount = wallet_amount + ${total_amount}, total_loyalty_points = total_loyalty_points + ${loyalty_point} WHERE id = ${user_id}`);

                let { points = 0 } = await SELECT.One(`SELECT points FROM tbl_loyalty_point_transaction WHERE order_id = ${order_id} AND user_id = ${user_id} AND type = 'receive'`, false);

                if (points > 0) {
                    await UPDATE(`UPDATE tbl_users SET total_loyalty_points = total_loyalty_points - ${points} WHERE id = ${user_id}`);
                }

                await DELETE(`DELETE FROM tbl_loyalty_point_transaction WHERE order_id = ${order_id}`);

                let push_params = {
                    sender_id: admin_id,
                    sender_type: "admin",
                    receiver_id: user_id,
                    receiver_type: "customer",
                    title: `Order Rejected`,
                    body: `Your order #${order_no} has been rejected by the restaurant.`,
                    tag: "order_rejected",
                    is_read: 0,
                    is_insert: 1,
                    image_url: null,
                    image: null,
                    ref_id: order_id,
                    ref_tbl_name: "order",
                };

                sendPush(push_params);
            }

            return sendResponse(req, res, 200, 1, { keyword });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed', components: { type: err?.type } });
        }
    },

    action_order_webhook: async (req, res) => {
        try {
            let { order_id, country } = req.body;

            let { automatic_approval = false } = await SELECT.One(`SELECT JSON_EXTRACT(setting_value, '$.automatic_approval') as automatic_approval FROM tbl_app_setting WHERE setting_key = 'order_approval' AND country_name = '${country}'`);

            if (automatic_approval == false) {
                return sendResponse(req, res, 200, 1, { keyword: "success" });
            }

            let { user_id, service_type, service_id, order_no, order_date_time, cooking_instruction, total_amount, order_type } = await SELECT.One(`SELECT user_id, service_id, service_type, order_no, order_date_time, cooking_instruction, total_amount, ifnull((select order_type from tbl_user_select_service where id = tbl_order.service_id), 'order_now') as order_type FROM tbl_order WHERE payment_status = 'paid' AND id = ${order_id} AND admin_approval_status = 'pending' AND order_status = 'pending'`);

            let qty_order_items = await SELECT.All(`SELECT id FROM tbl_order_items WHERE order_id = ${order_id} AND quantity > 3 AND is_delete = 0;`, false);

            let dessert_items = await SELECT.All(`select oi.id from tbl_order_items as oi join tbl_categories as c on oi.category_id = c.id where oi.order_id = ${order_id} AND c.is_dessert = 1 AND oi.is_delete = 0`, false);

            if (automatic_approval && cooking_instruction == '' && Number(total_amount) <= 150000 && qty_order_items.length == 0 && dessert_items.length == 0) {

                let update_details = {
                    admin_approval_status: 'approved',
                    admin_action_time: new Date(),
                    admin_action_by: 1,
                    service_time: moment(order_date_time).add(40, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
                    order_status: 'accepted',
                    is_priority_order: 0
                }

                await UPDATE(`UPDATE tbl_order SET ? WHERE id = ${order_id} AND admin_approval_status in ('pending', 'approved')`, update_details);

                let push_params_accepted = {
                    sender_id: null,
                    sender_type: "system",
                    receiver_id: user_id,
                    receiver_type: "customer",
                    title: `Order Accepted`,
                    body: `Your order #${order_no} has been accepted by the restaurant.`,
                    tag: "order_accepted",
                    is_read: 0,
                    is_insert: 1,
                    image_url: null,
                    image: null,
                    ref_id: order_id,
                    ref_tbl_name: "order",
                };

                sendPush(push_params_accepted);

                await UPDATE(`UPDATE tbl_order SET preparation_start_time = now(), order_status = 'in_preparation', restaurant_status = 'in_preparation' WHERE id = ${order_id} AND (select order_type from tbl_user_select_service where id = tbl_order.service_id) = 'order_now'`).then(e => console.log(e)).catch(err => { });

                if (order_type == 'order_now') {

                    let push_params = {
                        sender_id: null,
                        sender_type: "system",
                        receiver_id: user_id,
                        receiver_type: "customer",
                        title: `Your order is being prepared`,
                        body: `Your order is in the kitchen`,
                        tag: "order_in_preparation",
                        is_read: 0,
                        is_insert: 1,
                        image_url: null,
                        image: null,
                        ref_id: order_id,
                        ref_tbl_name: "order",
                        other_data: {
                            "service_type": service_type,
                            "service_id": service_id,
                            "order_no": order_no
                        }
                    };

                    sendPush(push_params);
                }
            }

            return sendResponse(req, res, 200, 1, { keyword: "success" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    order_details: async (req, res) => {
        let order;
        let { admin_id } = req.loginUser;
        try {
            let { order_id } = req.body;

            order = await SELECT.One(`select *, (select promo_code from tbl_promo_code where id = tbl_order.promo_code_id) as promo_code, (select name from tbl_admin_users where id = tbl_order.admin_action_by) as accepted_by, (select name from tbl_restaurants where id = tbl_order.restaurant_branch_id) as restaurant_name, (SELECT assign_waiter_id FROM tbl_dining_table WHERE (table_number = tbl_order.table_number OR group_name = tbl_order.table_number) AND branch_id = tbl_order.restaurant_branch_id LIMIT 1) AS waiter_id, (SELECT name FROM tbl_restaurant_staff_member WHERE id = waiter_id) AS waiter_name from tbl_order where id = ${order_id}`);

            await checkRolePermissionInModel(admin_id, order.service_type, 'view');

            delete order.id;
            delete order.is_active;
            delete order.is_delete;
            order = { order_id, ...order };

            order.user_details = await SELECT.One(`SELECT u.id as user_id, CONCAT(u.first_name, ' ', u.last_name) AS user_name, u.email, u.country_code, u.phone, concat('${USER_IMAGE_PATH}', u.profile_image) as profile_image, ${order.delivery_address_id} as delivery_address_id, (SELECT CONCAT_WS(', ', NULLIF(TRIM(delivery_flat), ''), NULLIF(TRIM(delivery_area), ''), NULLIF(TRIM(delivery_landmark), ''), NULLIF(TRIM(delivery_city), ''), NULLIF(TRIM(delivery_state), ''), NULLIF(TRIM(delivery_country), '')) FROM tbl_user_delivery_address WHERE id = ${order.delivery_address_id}) AS delivery_address, (SELECT delivery_latitude FROM tbl_user_delivery_address WHERE id = ${order.delivery_address_id}) AS delivery_latitude, (SELECT delivery_longitude FROM tbl_user_delivery_address WHERE id = ${order.delivery_address_id}) AS delivery_longitude FROM tbl_users AS u where id = ${order.user_id}`);

            if (order.user_details.profile_image == null) {
                order.user_details.profile_image = `${USER_IMAGE_PATH}default.png`;
            }

            order.comments = await SELECT.All(`SELECT id as comment_id, user_id, (select name from tbl_admin_users where id = tbl_admin_users_comments.created_by) as created_by, alert_to, title, description, status, created_at FROM tbl_admin_users_comments where user_id = ${order.user_id} AND status = 'pending'`, false);

            order.items = await SELECT.All(`select id as order_item_id, menu_item_id, concat('${MENU_IMAGE_PATH}', (SELECT mf.name FROM tbl_media_files mf WHERE FIND_IN_SET(mf.id, (select product_image_ids from tbl_menu_items where id = tbl_order_items.menu_item_id)) AND mf.type = 'cover' LIMIT 1)) AS image, name, item_amount, quantity, total_amount, is_refund, is_replace, accompaniment_item, additional_items as add_ons_item, (select preparation_time from tbl_menu_items where id = tbl_order_items.menu_item_id) as preparation_time from tbl_order_items where order_id = ${order_id} AND is_delete = 0`, false);

            let all_accompaniments_ids = [];
            let all_add_ons_items_ids = [];
            order.estimate_preparation_time = 0;

            order.items = order.items.map(item => {
                item.accompaniment_ids = (item.accompaniment_item != '') ? item.accompaniment_item?.split(',').map(i => parseInt(i)) || [] : [];
                item.add_ons_ids = (item.add_ons_item != '') ? item.add_ons_item?.split(',').map(i => parseInt(i)) || [] : [];
                order.estimate_preparation_time += parseInt(item.preparation_time);
                all_accompaniments_ids = all_accompaniments_ids.concat(item.accompaniment_ids);
                all_add_ons_items_ids = all_add_ons_items_ids.concat(item.add_ons_ids);
                return item;
            });

            if (order.preparation_time) {
                order.preparation_time_minutes = moment(order.preparation_time).diff(order.admin_action_time, 'minutes');
            }

            if (order.packaging_time) {
                order.packaging_time_minutes = moment(order.packaging_time).diff(order.preparation_time, 'minutes');
            }

            let user_select_service_promise = SELECT.One(`select id as user_select_service_id, order_type, schedule_date, schedule_time, vehicle_id from tbl_user_select_service where id = ${order.service_id}`, false);

            let rider_details_promise = (order.rider_id) ? SELECT.One(`select id as rider_id, concat(first_name, ' ', last_name) as name, phone, username_email, ifnull(concat('${RIDER_IMAGE_PATH}', profile_image), '${RIDER_IMAGE_PATH}default.png') as profile_image from tbl_rider_users where id = ${order.rider_id}`, false) : Promise.resolve({});

            let order_items_promise = (order.items.length > 0) ? SELECT.All(`select oc.order_item_id, GROUP_CONCAT(ci.name ORDER BY ci.name SEPARATOR ', ') AS names from tbl_order_choice oc JOIN tbl_choice_items ci on oc.sub_choice_id = ci.id where oc.order_item_id in (${order.items.map(item => item.order_item_id)}) GROUP BY oc.order_item_id`, false) : [];

            let accompaniment_items_promise = (all_accompaniments_ids.length > 0) ? SELECT.All(`select ma.id as accompaniment_id, a.name from tbl_menu_accompaniments ma join tbl_accompaniments a on ma.accompaniment_id = a.id where ma.id in (${all_accompaniments_ids})`, false) : Promise.resolve([]);

            let add_ons_item_promise = (all_add_ons_items_ids.length > 0) ? SELECT.All(`select mas.id as add_ons_id, ao.name from tbl_menu_add_ons mas join tbl_add_ons ao on mas.add_ons_id = ao.id where mas.id in (${all_add_ons_items_ids})`, false) : Promise.resolve([]);

            let order_comments_promise = SELECT.All(`SELECT oc.id as order_comment_id, oc.comment, oc.created_at, case WHEN oc.sender_type = 'admin' then (select name from tbl_admin_users where id = oc.admin_id) WHEN oc.sender_type = 'rider' then (select concat(first_name, ' ', last_name) as name from tbl_rider_users where id = ${order.rider_id}) WHEN oc.sender_type = 'restaurant' then (select name from tbl_restaurants where id = oc.restaurant_branch_id) ELSE 'Unknown' end as commenter_name, case WHEN oc.sender_type = 'admin' then (select concat('${ADMIN_IMAGE_PATH}', profile_image) from tbl_admin_users where id = oc.admin_id) WHEN oc.sender_type = 'rider' then (select concat('${RIDER_IMAGE_PATH}', profile_image) from tbl_rider_users where id = ${order.rider_id}) WHEN oc.sender_type = 'restaurant' then (select concat('${RESTAURANT_IMAGE_PATH}', tbl_media_files.name) from tbl_media_files where id in (select image_ids from tbl_restaurants where oc.restaurant_branch_id) limit 1) ELSE 'Unknown.png' end as commenter_profile_img FROM tbl_order_comments oc WHERE oc.order_id = ${order_id}`, false);

            let [order_items, accompaniment_items, add_ons_item, user_select_service, user_order_comments, rider_details] = await Promise.all([order_items_promise, accompaniment_items_promise, add_ons_item_promise, user_select_service_promise, order_comments_promise, rider_details_promise]);

            if (order.service_type == 'carhop') {
                order.vehicle_details = await SELECT.One(`SELECT id as vehicle_id, vehicle_name, vehicle_number, country_code, phone_number, instruction FROM tbl_user_vehicle_info WHERE id = ${user_select_service.vehicle_id}`, false);
            }

            order.user_select_service = user_select_service;
            order.user_order_comments = user_order_comments;
            order.rider_details = rider_details;

            order.items = order.items.map(item => {
                item.choices = order_items.filter(choice => choice.order_item_id === item.order_item_id).map(choice => choice.names);
                item.accompaniments = accompaniment_items.filter(accompaniment => item.accompaniment_ids.includes(accompaniment.accompaniment_id)).map(accompaniment => accompaniment.name);
                item.add_ons = add_ons_item.filter(add_ons => item.add_ons_ids.includes(add_ons.add_ons_id)).map(add_ons => add_ons.name);
                delete item.accompaniment_item;
                delete item.add_ons_item;
                delete item.accompaniment_ids;
                delete item.add_ons_ids;
                return item;
            });

            order.complimentary_items = await SELECT.All(`SELECT oci.id as order_complimentary_id, ci.name, concat('${MENU_COMPLIMENTARY_IMAGE_PATH}', ci.image) as image FROM tbl_order_complimentary_items oci JOIN tbl_complimentary_items ci ON oci.complimentary_id = ci.id WHERE oci.order_id = ${order_id}`, false);

            order.delivery_time = (user_select_service.order_type == 'order_now') ? order.service_time : moment(user_select_service.schedule_date + ' ' + user_select_service.schedule_time, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD HH:mm:ss');

            order.accepted_time = moment(order.admin_action_time, 'YYYY-MM-DD HH:mm:ss').diff(moment(order.order_date_time, 'YYYY-MM-DD HH:mm:ss'), 'minutes');

            if (['pending', 'accepted', 'in_preparation'].includes(order.order_status) && order.preparation_time != null && order.packaging_time != null) {
                let estimate_delivery_time_minutes = moment(order.created_at, 'YYYY-MM-DD HH:mm:ss').diff(moment(order.service_time, 'YYYY-MM-DD HH:mm:ss'), 'minutes');

                order.estimate_delivery_time_minutes = estimate_delivery_time_minutes - (order.preparation_time_minutes + order.packaging_time_minutes);
            } else {
                order.estimate_delivery_time_minutes = moment(order.delivered_date_time, 'YYYY-MM-DD HH:mm:ss').diff(moment(order.out_of_delivery_time, 'YYYY-MM-DD HH:mm:ss'), 'minutes');
            }

            order.delivery_time_minutes = moment(order.delivered_date_time, 'YYYY-MM-DD HH:mm:ss').diff(moment(order.out_of_delivery_time, 'YYYY-MM-DD HH:mm:ss'), 'minutes');

            let merged_table_order_details = {};
            if (order.is_merged_order && order.merged_order_id) {
                merged_table_order_details = await get_merged_table_order_details(order.merged_order_id);
            }
            order.merged_order_details = merged_table_order_details;

            return sendResponse(req, res, 200, 1, { keyword: "success" }, order);
        }
        catch (err) {
            return sendResponse(req, res, 200, 2, { keyword: err.message || 'failed_to_fetch' });
        } finally {
            order = null; // clear memory
        }
    },

    replace_or_refund_items: async (req, res) => {
        let { admin_id } = req.loginUser;
        try {
            let { order_id, type, items, reason, comment, amount, refund_payment_type, is_return_to_branch, is_items_not_recovered } = req.body;

            let { service_type, order_no, user_id } = await SELECT.One(`SELECT service_type, order_no, user_id FROM tbl_order WHERE id = ${order_id}`);

            await checkRolePermissionInModel(admin_id, service_type, 'edit');

            let items_ids = items.map(item => parseInt(item.order_item_id));

            let items_details = await SELECT.All(`SELECT oi.order_id, oi.id as order_item_id, oi.menu_item_id, oi.name, oi.item_amount, oi.quantity, oi.total_amount, oi.is_refund, oi.is_replace FROM tbl_order_items oi WHERE oi.order_id = ${order_id} AND oi.id in (${items_ids})`);

            let replacement_order_id = null;
            if (type == 'replace') {
                // create replacement order
                replacement_order_id = await createReplacementOrder(order_id, items);
            }

            // check requested items are valid or not and match quantity not more than order quantity
            let total_amount = 0;
            items_details.forEach(item => {

                let requested_item = items.find(i => i.order_item_id == item.order_item_id);

                //check oi.is_refund, oi.is_replace is already 1 then throw error
                if (item.is_refund == 1 || item.is_replace == 1) {
                    let err = new Error('already_item_refund_replace_added');
                    err.type = (item.is_refund == 1) ? 'refund' : 'replace';
                    err.item_name = item.name;
                    throw err;
                }

                if (requested_item.quantity > item.quantity) {
                    let err = new Error('invalid_quantity');
                    err.item_name = item.name;
                    throw err;
                }

                item.quantity = parseInt(requested_item.quantity);
                item.total_amount = item.item_amount * item.quantity;
                total_amount += item.total_amount;
            });

            // check total amount is requested amount lower than total amount if is lower then set total amount to requested amount
            if (total_amount > amount) {
                total_amount = amount;
            }

            // add replace refund details
            let replace_refund_id = await INSERT(`INSERT INTO tbl_order_replace_or_refund SET ?`, {
                order_id,
                replacement_order_id: replacement_order_id,
                total_amount,
                refund_payment_type: refund_payment_type || null,
                type,
                reason,
                comment: comment || null,
                is_return_to_branch,
                is_items_not_recovered,
                created_by: req.loginUser.admin_id
            });

            // add replace refund items details
            each(items_details, async (item, callback) => {

                await INSERT(`INSERT INTO tbl_order_replace_or_refund_items SET ?`, {
                    order_id,
                    replace_refund_id,
                    item_name: item.name,
                    order_item_id: item.order_item_id,
                    menu_item_id: item.menu_item_id,
                    quantity: item.quantity,
                    price: item.item_amount,
                    total_amount: total_amount,
                    created_by: req.loginUser.admin_id
                });

                let update = {
                    is_refund: 1,
                    is_replace: 1
                }

                if (type == 'replace') {
                    delete update.is_refund;
                } else if (type == 'refund') {
                    delete update.is_replace;
                }

                // update order item status
                await UPDATE(`UPDATE tbl_order_items SET ? WHERE id = ${item.order_item_id}`, update);

                callback();

            }, async (err) => {
                if (err) {
                    throw err;
                }
            });

            let push_params = {
                sender_id: admin_id,
                sender_type: "admin",
                receiver_id: user_id,
                receiver_type: "customer",
                title: ``,
                body: ``,
                tag: "",
                is_read: 0,
                is_insert: 1,
                image_url: null,
                image: null,
                ref_id: order_id,
                ref_tbl_name: "order",
            };

            if (type == 'replace') {
                push_params.title = 'Order Replaced';
                push_params.body = `Your order #${order_no} has been replaced by the restaurant.`;
                push_params.tag = 'order_replacement';
            } else if (type == 'refund') {
                push_params.title = 'Order Refunded';
                push_params.body = `Your order #${order_no} has been refunded by the restaurant.`;
                push_params.tag = 'order_refund';
            }

            setTimeout(() => {
                sendPush(push_params);
            }, 1000);

            return sendResponse(req, res, 200, 1, { keyword: "success" });
        }
        catch (err) {
            if (err?.message == 'already_item_refund_replace_added') {
                return sendResponse(req, res, 200, 0, { keyword: 'already_item_refund_replace_added', components: { type: err.type, item: err.item_name } });
            } else if (err?.message == 'invalid_item') {
                return sendResponse(req, res, 200, 0, { keyword: 'invalid_item', components: { item_name: err.item_name } });
            } else if (err?.message == 'invalid_quantity') {
                return sendResponse(req, res, 200, 0, { keyword: 'invalid_quantity', components: { item_name: err.item_name } });
            } else {
                return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed' });
            }
        }

        async function createReplacementOrder(order_id, items) {

            let order = await SELECT.One(`SELECT * FROM tbl_order WHERE id = ${order_id}`);
            let order_items = await SELECT.All(`SELECT * FROM tbl_order_items as oi WHERE oi.id in (${items.map(i => i.order_item_id)}) AND oi.is_delete = 0 AND oi.order_id = ${order_id}`);
            let order_choices = await SELECT.All(`SELECT * FROM tbl_order_choice WHERE order_item_id in (${items.map(i => i.order_item_id)}) AND is_delete = 0 AND order_id = ${order_id}`);

            let replacement_order_id = await INSERT(`INSERT INTO tbl_order SET ?`, {
                user_id: order.user_id,
                service_type: order.service_type,
                service_id: order.service_id,
                restaurant_branch_id: order.restaurant_branch_id,
                order_no: order.order_no + "R",
                order_date_time: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
                delivery_address_id: order.delivery_address_id,
                vehicle_id: order.vehicle_id,
                delivery_instruction: order.delivery_instruction,
                cooking_instruction: order.cooking_instruction,
                send_cutlery: order.send_cutlery,
                is_kitchen_item: order.is_kitchen_item,
                is_bar_item: order.is_bar_item,
                currency: order.currency,
                country: order.country,
                payment_method: null,
                admin_approval_status: 'approved',
                admin_action_time: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
                admin_action_by: admin_id,
                preparation_start_time: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
                service_time: moment.utc().add(1, 'hours').format('YYYY-MM-DD HH:mm:ss'),
                order_status: 'in_preparation',
                restaurant_status: 'in_preparation',
                is_priority_order: 1,
                is_replacement_order: 1
            });

            for (let item of order_items) {
                let avg_price = Number(item.total_amount) / Number(item.quantity);
                let total_amount = Number(items.find(i => i.order_item_id == item.id).quantity) * avg_price;

                await INSERT(`INSERT INTO tbl_order_items SET ?`, {
                    user_id: order.user_id,
                    order_id: replacement_order_id,
                    service_id: order.service_id,
                    menu_item_id: item.menu_item_id,
                    category_id: item.category_id,
                    sub_category_id: item.sub_category_id,
                    name: item.name,
                    description: item.description,
                    product_image_ids: item.product_image_ids,
                    country: item.country,
                    item_amount: item.item_amount,
                    quantity: items.find(i => i.order_item_id == item.id).quantity,
                    total_amount: total_amount,
                    currency: item.currency,
                    selected_size: item.selected_size || "",
                    is_kitchen_item: item.is_kitchen_item || 0,
                    is_bar_item: item.is_bar_item || 0,
                    serve_start_time: item.serve_start_time,
                    serve_end_time: item.serve_end_time,
                    accompaniment_item: item.accompaniment_item,
                    additional_items: item.additional_items,
                    additional_items: item.additional_items
                });
            }

            for (let choice of order_choices) {
                await INSERT(`INSERT INTO tbl_order_choice SET ?`, {
                    user_id: order.user_id,
                    order_id: replacement_order_id,
                    order_item_id: choice.order_item_id,
                    choice_id: choice.choice_id,
                    sub_choice_id: choice.sub_choice_id,
                    need_full_cup: choice.need_full_cup
                });
            }
        }
    },

    get_order_status: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { order_id } = req.body;

            let orderStatus = await SELECT.One(`SELECT order_status, service_type, restaurant_status, admin_approval_status, waiter_status FROM tbl_order WHERE id = ${order_id}`);

            await checkRolePermissionInModel(admin_id, orderStatus.service_type, 'view');

            return sendResponse(req, res, 200, 1, { keyword: "success" }, orderStatus);
        }
        catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: e.message || 'failed' });
        }
    },

    edit_menu_items: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { order_id, order_item_id, quantity } = req.body;

            let { service_type } = await SELECT.One(`SELECT service_type FROM tbl_order WHERE id = ${order_id}`);

            await checkRolePermissionInModel(admin_id, service_type, 'edit');

            let { item_amount, old_quantity } = await SELECT.One(`SELECT item_amount, quantity as old_quantity FROM tbl_order_items WHERE id = ${order_item_id} AND order_id = ${order_id}`);

            let { choice_total } = await SELECT.One(`SELECT SUM(ci.price) as choice_total FROM tbl_order_choice oc JOIN tbl_choice_items ci ON oc.sub_choice_id = ci.id WHERE oc.order_item_id = ${order_item_id} AND oc.order_id = ${order_id}`);

            if (old_quantity == quantity) {
                return sendResponse(req, res, 200, 1, { keyword: "menu_item_edit_success" });
            }

            if (old_quantity < quantity) {
                throw new Error('cannot_add_quantity');
            }

            await UPDATE(`UPDATE tbl_order_items SET ? WHERE id = ${order_item_id}`, {
                quantity: quantity,
                total_amount: (item_amount + choice_total) * quantity
            });

            let { new_total_amount } = await SELECT.One(`SELECT SUM(total_amount) as new_total_amount FROM tbl_order_items WHERE order_id = ${order_id} AND is_delete = 0`);

            await UPDATE(`UPDATE tbl_order SET ? WHERE id = ${order_id}`, {
                sub_total: new_total_amount,
                tax_fee_amount: Number(new_total_amount) * TaxPercentage,
                total_amount: new_total_amount
            });

            return sendResponse(req, res, 200, 1, { keyword: 'menu_item_edit_success' });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err?.message || 'failed_to_edit' });
        }
    },

    remove_menu_item: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { order_id, order_item_id } = req.body;

            let { service_type } = await SELECT.One(`SELECT service_type FROM tbl_order WHERE id = ${order_id}`);

            await checkRolePermissionInModel(admin_id, service_type, 'delete');

            let { count, total_amount, order_total_amount } = await SELECT.One(`SELECT count(*) as count, SUM(if(id = ${order_item_id}, total_amount, 0)) as total_amount, (select total_amount from tbl_order where id = ${order_id}) as order_total_amount FROM tbl_order_items WHERE order_id = ${order_id}`);

            if (count == 1) {
                return sendResponse(req, res, 200, 0, { keyword: 'cannot_remove_last_item' });
            }

            await UPDATE(`UPDATE tbl_order_items SET is_delete = 1 WHERE id = ${order_item_id}`);

            await UPDATE(`UPDATE tbl_order SET sub_total = sub_total - ${Number(total_amount)}, total_amount = total_amount - ${Number(total_amount)}, tax_fee_amount = ${(order_total_amount - Number(total_amount)) * TaxPercentage} WHERE id = ${order_id}`);

            return sendResponse(req, res, 200, 1, { keyword: "removed" });
        }
        catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: e.message || 'failed_to_remove' });
        }
    },

    cancel_order: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { order_id } = req.body;

            let { service_type, user_id, order_no, total_amount, loyalty_point } = await SELECT.One(`SELECT service_type, loyalty_point, user_id, total_amount, order_no FROM tbl_order WHERE id = ${order_id}`);

            await checkRolePermissionInModel(admin_id, service_type, 'edit');

            await UPDATE(`UPDATE tbl_order SET ? WHERE id = '${order_id}'`, {
                is_cancel_order: 1,
                cancel_reason_id: null,
                cancel_reason: null,
                order_status: "cancelled",
                cancelled_by: "Admin",
                cancel_date_time: moment().format('YYYY-MM-DD HH:mm:ss')
            });

            let transactionId = 'Txn' + Math.floor(1000000 + Math.random() * 9000000);

            await INSERT(`INSERT INTO tbl_user_wallet_transaction_history SET ?`, {
                user_id: user_id,
                type: 'refund_cancellation_order_amount',
                reference_id: order_id,
                transaction_type: 'credit',
                transaction_id: transactionId,
                wallet_amount: Number(total_amount),
                payment_method: "wallet",
                payment_status: 'paid'
            });

            await UPDATE(`UPDATE tbl_users SET wallet_amount = wallet_amount + ${total_amount}, total_loyalty_points = total_loyalty_points + ${loyalty_point} WHERE id = ${user_id}`);

            let { points = 0 } = await SELECT.One(`SELECT points FROM tbl_loyalty_point_transaction WHERE order_id = ${order_id} AND user_id = ${user_id} AND type = 'receive'`, false);

            if (points > 0) {
                await UPDATE(`UPDATE tbl_users SET total_loyalty_points = total_loyalty_points - ${points} WHERE id = ${user_id}`);
            }

            await DELETE(`DELETE FROM tbl_loyalty_point_transaction WHERE order_id = ${order_id}`);

            // order cancelled push notification
            let push_params = {
                sender_id: admin_id,
                sender_type: "admin",
                receiver_id: user_id,
                receiver_type: "customer",
                title: `Order Cancelled`,
                body: `Your order #${order_no} has been cancelled by the restaurant.`,
                tag: "order_cancelled",
                is_read: 0,
                is_insert: 1,
                image_url: null,
                image: null,
                ref_id: order_id,
                ref_tbl_name: "order",
            };

            setTimeout(() => {
                sendPush(push_params);
            }, 1000);

            return sendResponse(req, res, 200, 1, { keyword: "cancel_order", components: {} });
        }
        catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: e.message || "failed", components: {} });
        }
    },

    //temporary function for testing
    mark_prepared: async (req, res) => {
        try {
            let { order_id } = req.body;

            await UPDATE(`UPDATE tbl_order SET preparation_time = now(), restaurant_status = 'in_packaging' WHERE id = ${order_id} AND order_status = 'in_preparation' AND restaurant_status = 'in_preparation'`);

            return sendResponse(req, res, 200, 1, { keyword: "success" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed' });
        }
    },

    mark_packaged: async (req, res) => {
        try {
            let { order_id } = req.body;

            await UPDATE(`UPDATE tbl_order SET packaging_time = now(), restaurant_status = 'is_packaged' WHERE id = ${order_id} AND order_status = 'in_preparation' AND restaurant_status = 'in_packaging'`);

            return sendResponse(req, res, 200, 1, { keyword: "success" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed' });
        }
    },

    mark_full_prepared: async (req, res) => {
        try {
            let { order_id } = req.body;

            let order = await SELECT.One(`SELECT id, service_type FROM tbl_order WHERE id = '${order_id}' AND order_status = 'in_preparation' AND restaurant_status = 'is_packaged'`);

            // await UPDATE(`UPDATE tbl_order SET packaging_time = now(), restaurant_status = 'is_packaged' WHERE id = ${order.id}`);
            let service_type = order.service_type;

            let update_details = {};
            if (service_type == 'delivery' || service_type == 'carhop') {
                update_details.rider_id = 1;
                update_details.restaurant_status = 'out_for_delivery';
                update_details.order_status = 'out_for_delivery';
                update_details.out_of_delivery_time = moment().format('YYYY-MM-DD HH:mm:ss');
                update_details.rider_assign_time = moment().format('YYYY-MM-DD HH:mm:ss');
            } else if (service_type == 'pick_up') {
                update_details.out_of_delivery_time = moment().format('YYYY-MM-DD HH:mm:ss');
                update_details.restaurant_status = 'ready_for_pick_up';
                update_details.order_status = 'ready_for_pick_up';
            } else if (service_type == 'dine_in') {
                update_details.out_of_delivery_time = moment().format('YYYY-MM-DD HH:mm:ss');
                update_details.restaurant_status = 'ready_for_serve';
                update_details.order_status = 'ready_for_serve';
            }

            await UPDATE(`UPDATE tbl_order SET ? WHERE id = ${order.id}`, update_details);

            return sendResponse(req, res, 200, 1, { keyword: "success" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed' });
        }
    },

    mark_as_completed: async (req, res) => {
        try {
            let { order_id } = req.body;

            let order = await SELECT.One(`SELECT id, service_type FROM tbl_order WHERE id = ${order_id} AND order_status in ('out_for_delivery', 'ready_for_pick_up', 'ready_for_serve')`);

            let service_type = order.service_type;
            let update_details = {};
            if (service_type == 'delivery' || service_type == 'carhop') {
                update_details.delivered_date_time = moment().format('YYYY-MM-DD HH:mm:ss');
                update_details.order_status = 'delivered';
            } else if (service_type == 'pick_up') {
                update_details.delivered_date_time = moment().format('YYYY-MM-DD HH:mm:ss');
                update_details.order_status = 'completed';
            } else if (service_type == 'dine_in') {
                update_details.delivered_date_time = moment().format('YYYY-MM-DD HH:mm:ss');
                update_details.order_status = 'served';
            }

            await UPDATE(`UPDATE tbl_order SET ? WHERE id = ${order.id}`, update_details);

            return sendResponse(req, res, 200, 1, { keyword: "success" });
        }
        catch (err) {
            console.log('err :', err);
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed' });
        }
    }
}

// function for get merged dining table order details
async function get_merged_table_order_details(order_id) {
    try {

        let order = await SELECT.One(`select id, user_id, service_type, service_id, order_no, order_date_time, table_number, is_merged_order, cooking_instruction, loyalty_point, gift_id, (select promo_code from tbl_promo_code where id = tbl_order.promo_code_id) as promo_code, sub_total, tax_percentage, tax_fee_amount, promo_code_amount, delivery_charges, cancellation_charges, total_amount, currency, country, transaction_id, times_ordered, payment_method, order_status, restaurant_status, waiter_status, is_priority_order, (select name from tbl_restaurants where id = tbl_order.restaurant_branch_id) as restaurant_name from tbl_order where id = ${order_id}`);

        delete order.id;
        delete order.is_active;
        delete order.is_delete;
        order = { order_id, ...order };

        order.items = await SELECT.All(`select id as order_item_id, menu_item_id, CONCAT('${MENU_IMAGE_PATH}', (SELECT mf.name FROM tbl_media_files mf WHERE FIND_IN_SET(mf.id, (select product_image_ids from tbl_menu_items where id = tbl_order_items.menu_item_id)) AND mf.type = 'cover' LIMIT 1)) AS image, name, item_amount, quantity, total_amount, is_refund, is_replace, accompaniment_item, additional_items as add_ons_item, (select preparation_time from tbl_menu_items where id = tbl_order_items.menu_item_id) as preparation_time from tbl_order_items where order_id = ${order_id} AND is_delete = 0`, false);

        let all_accompaniments_ids = [];
        let all_add_ons_items_ids = [];

        order.items = order.items.map(item => {
            item.accompaniment_ids = (item.accompaniment_item != '') ? item.accompaniment_item?.split(',').map(i => parseInt(i)) || [] : [];
            item.add_ons_ids = (item.add_ons_item != '') ? item.add_ons_item?.split(',').map(i => parseInt(i)) || [] : [];
            all_accompaniments_ids = all_accompaniments_ids.concat(item.accompaniment_ids);
            all_add_ons_items_ids = all_add_ons_items_ids.concat(item.add_ons_ids);
            return item;
        });

        let order_items_promise = (order.items.length > 0) ? SELECT.All(`select oc.order_item_id, GROUP_CONCAT(ci.name ORDER BY ci.name SEPARATOR ', ') AS names from tbl_order_choice oc JOIN tbl_choice_items ci on oc.sub_choice_id = ci.id where oc.order_item_id in (${order.items.map(item => item.order_item_id)}) GROUP BY oc.order_item_id`, false) : [];

        let accompaniment_items_promise = (all_accompaniments_ids.length > 0) ? SELECT.All(`select ma.id as accompaniment_id, a.name from tbl_menu_accompaniments ma join tbl_accompaniments a on ma.accompaniment_id = a.id where ma.id in (${all_accompaniments_ids})`, false) : Promise.resolve([]);

        let add_ons_item_promise = (all_add_ons_items_ids.length > 0) ? SELECT.All(`select mas.id as add_ons_id, ao.name from tbl_menu_add_ons mas join tbl_add_ons ao on mas.add_ons_id = ao.id where mas.id in (${all_add_ons_items_ids})`, false) : Promise.resolve([]);

        let order_comments_promise = SELECT.All(`SELECT oc.id as order_comment_id, oc.comment, oc.created_at, case WHEN oc.sender_type = 'admin' then (select name from tbl_admin_users where id = oc.admin_id) WHEN oc.sender_type = 'rider' then (select concat(first_name, ' ', last_name) as name from tbl_rider_users where id = '${order.rider_id}') WHEN oc.sender_type = 'restaurant' then (select name from tbl_restaurants where id = oc.restaurant_branch_id) ELSE 'Unknown' end as commenter_name, case WHEN oc.sender_type = 'admin' then (select CONCAT('${ADMIN_IMAGE_PATH}', profile_image) from tbl_admin_users where id = oc.admin_id) WHEN oc.sender_type = 'rider' then (select CONCAT('${RIDER_IMAGE_PATH}', profile_image) from tbl_rider_users where id = '${order.rider_id}') WHEN oc.sender_type = 'restaurant' then (select CONCAT('${RESTAURANT_IMAGE_PATH}', tbl_media_files.name) from tbl_media_files where id in (select image_ids from tbl_restaurants where oc.restaurant_branch_id) limit 1) ELSE 'Unknown.png' end as commenter_profile_img FROM tbl_order_comments oc WHERE oc.order_id = ${order_id}`, false);

        let [order_items, accompaniment_items, add_ons_item, user_order_comments] = await Promise.all([order_items_promise, accompaniment_items_promise, add_ons_item_promise, order_comments_promise]);

        order.user_order_comments = user_order_comments;

        order.items = order.items.map(item => {
            item.choices = order_items.filter(choice => choice.order_item_id === item.order_item_id).map(choice => choice.names);
            item.accompaniments = accompaniment_items.filter(accompaniment => item.accompaniment_ids.includes(accompaniment.accompaniment_id)).map(accompaniment => accompaniment.name);
            item.add_ons = add_ons_item.filter(add_ons => item.add_ons_ids.includes(add_ons.add_ons_id)).map(add_ons => add_ons.name);
            delete item.accompaniment_item;
            delete item.add_ons_item;
            delete item.accompaniment_ids;
            delete item.add_ons_ids;
            return item;
        });

        order.complimentary_items = await SELECT.All(`SELECT oci.id as order_complimentary_id, ci.name, CONCAT('${MENU_COMPLIMENTARY_IMAGE_PATH}', ci.image) as image FROM tbl_order_complimentary_items oci JOIN tbl_complimentary_items ci ON oci.complimentary_id = ci.id WHERE oci.order_id = ${order_id}`, false);

        return order;
    }
    catch (e) {
        return {};
    }
}

let deliveryModel = {

    complimentary_item_list: async (req, res) => {
        try {
            let { order_id } = req.body;

            let complimentary_items = await SELECT.All(`SELECT ci.id as complimentary_id, ci.name FROM tbl_complimentary_items ci WHERE country = (select country from tbl_order where id = ${order_id}) AND ci.is_active = 1 AND ci.is_delete = 0`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, complimentary_items);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    complimentary_item_add: async (req, res) => {
        try {
            let { order_id, complimentary_id } = req.body;

            let complimentary_item_detail = await SELECT.One(`SELECT ci.id as complimentary_id, ci.name, ci.price FROM tbl_complimentary_items ci where ci.id = ${complimentary_id} AND ci.is_active = 1 AND ci.is_delete = 0`, false);

            if (_.isEmpty(complimentary_item_detail)) {
                throw new Error('complimentary_not_found');
            }

            await INSERT(`INSERT INTO tbl_order_complimentary_items SET ?`, {
                order_id,
                complimentary_id,
                price: complimentary_item_detail.price,
                total_amount: complimentary_item_detail.price,
                created_by: req.loginUser.admin_id
            });

            return sendResponse(req, res, 200, 1, { keyword: "added" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_add' });
        }
    }

}

function generateTicketID(ticketNumber) {
    const base = 500;
    const prefix = "#CJS";

    // Calculate the letter index (1-based, so 1 = A, 2 = B, ..., 26 = Z, 27 = AA, etc.)
    let letterIndex = Math.floor((ticketNumber - 1) / base);

    // Function to convert number to Excel-style letters (1 = A, 2 = B, ..., 27 = AA, 28 = AB)
    function numberToLetters(num) {
        let letters = "";
        while (num >= 0) {
            letters = String.fromCharCode((num % 26) + 65) + letters;
            num = Math.floor(num / 26) - 1;
        }
        return letters;
    }

    let letterPart = numberToLetters(letterIndex);
    let ticketPart = ((ticketNumber - 1) % base) + 1;

    return `${prefix}${ticketPart}${letterPart}`;
}

const ticketModel = {
    create_ticket: async (req, res) => {
        try {
            const { admin_id } = req.loginUser;
            const { order_id, issue_title, description, priority, members, media, is_other_issue = 0 } = req.body;
            // Generate external ticket ID
            const ex_ticket_id = null;

            let { user_id, restaurant_id, rider_id } = await SELECT.One(`SELECT user_id, restaurant_branch_id as restaurant_id, rider_id FROM tbl_order WHERE id = ${order_id}`);

            // Insert ticket into database
            const ticketId = await INSERT(`INSERT INTO tbl_tickets (order_id, user_id, restaurant_id, rider_id, ex_ticket_id, issue_title, description, priority, issue_date, created_by, is_other_issue) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`, [order_id, user_id, restaurant_id, rider_id, ex_ticket_id, issue_title, description, priority, admin_id, is_other_issue]);

            UPDATE(`UPDATE tbl_tickets SET ex_ticket_id = '${generateTicketID(ticketId)}' WHERE id = ${ticketId}`).catch(err => { });

            // If members are provided, assign them to the ticket
            if (members && members?.length > 0) {
                for (const memberId of members) {
                    await INSERT(`INSERT INTO tbl_ticket_assigns (ticket_id, assigned_to, assigned_by) VALUES (?, ?, ?)`, [ticketId, memberId, admin_id]);
                }
            }

            // If media is provided, attach it to the ticket
            if (media?.length > 0) {
                for (const file of media) {
                    await INSERT(`INSERT INTO tbl_ticket_attachments (ticket_id, file, uploaded_by) VALUES (?, ?, ?);`, [ticketId, file, admin_id]);
                }
            }

            return sendResponse(req, res, 200, 1, {
                keyword: "created",
                ticket_id: ticketId,
                ex_ticket_id
            });

        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_create' });
        }
    },

    dashboard: async (req, res) => {
        let recentTickets = [];
        try {
            const { date_from, date_to } = req.body;

            // Build date filter
            let dateFilter = '';
            if (date_from && date_to) {
                dateFilter = ` AND DATE(t.created_at) BETWEEN '${date_from}' AND '${date_to}'`;
            } else if (date_from) {
                dateFilter = ` AND DATE(t.created_at) >= '${date_from}'`;
            } else if (date_to) {
                dateFilter = ` AND DATE(t.created_at) <= '${date_to}'`;
            }

            // Get restaurant issue counts
            const branchIssueQuery = `SELECT r.id as restaurant_id, r.name as restaurant_name, SUM(CASE WHEN t.is_other_issue = 0 AND lower(t.issue_title) LIKE '%spillage%' THEN 1 ELSE 0 END) as spillage_count, SUM(CASE WHEN t.is_other_issue = 0 AND lower(t.issue_title) LIKE '%swapping%' THEN 1 ELSE 0 END) as swapping_count, SUM(CASE WHEN t.is_other_issue = 0 AND lower(t.issue_title) LIKE '%missing order%' THEN 1 ELSE 0 END) as missing_order_count, SUM(CASE WHEN t.is_other_issue = 0 AND lower(t.issue_title) LIKE '%food quality%' THEN 1 ELSE 0 END) as food_quality_count, SUM(CASE WHEN t.is_other_issue = 0 AND lower(t.issue_title) LIKE '%rider%' THEN 1 ELSE 0 END) as rider_count, SUM(CASE WHEN t.is_other_issue = 1 THEN 1 ELSE 0 END) as others_count FROM tbl_tickets t LEFT JOIN tbl_restaurants r ON t.restaurant_id = r.id WHERE t.is_delete = 0 ${dateFilter} GROUP BY r.id, r.name, r.name`;

            const restaurantIssues = await SELECT.All(branchIssueQuery, false);

            // Get ticket status counts
            const statusCounts = await SELECT.All(`SELECT status, COUNT(*) as count FROM tbl_tickets as t WHERE is_delete = 0 ${dateFilter} GROUP BY status`, false);

            // Get recent tickets for each status
            // recentTickets = await SELECT.All(`SELECT t.id as ticket_id, t.ex_ticket_id, t.issue_title, t.description, t.priority, t.status, t.issue_date, t.created_at, GROUP_CONCAT(DISTINCT a.assigned_to) as assigned_users FROM tbl_tickets t LEFT JOIN tbl_ticket_assigns a ON t.id = a.ticket_id WHERE t.is_delete = 0 ${dateFilter} GROUP BY t.id, t.ex_ticket_id, t.issue_title, t.description, t.priority, t.status, t.issue_date, t.created_at ORDER BY t.created_at DESC LIMIT 30`, false);

            recentTickets = await SELECT.All(`SELECT ticket_id, ex_ticket_id, issue_title, description, priority, status, issue_date, created_at, assigned_users FROM ( SELECT t.id as ticket_id, t.ex_ticket_id, t.issue_title, t.description, t.priority, t.status, t.issue_date, t.created_at, GROUP_CONCAT(DISTINCT a.assigned_to) as assigned_users, ROW_NUMBER() OVER (PARTITION BY t.status ORDER BY t.created_at DESC) as row_num FROM tbl_tickets t LEFT JOIN tbl_ticket_assigns a ON t.id = a.ticket_id WHERE t.is_delete = 0 ${dateFilter} GROUP BY t.id, t.ex_ticket_id, t.issue_title, t.description, t.priority, t.status, t.issue_date, t.created_at ) subquery WHERE row_num <= 3 ORDER BY FIELD(priority, 'Low', 'Medium', 'High', 'Urgent'), created_at DESC`, false);

            let assigned_users = recentTickets.length > 0 ? await SELECT.All(`SELECT ticket_id, assigned_to, concat('${ADMIN_IMAGE_PATH}', profile_image) as profile_image FROM tbl_ticket_assigns ta LEFT JOIN tbl_admin_users au ON ta.assigned_to = au.id WHERE ta.ticket_id IN (${recentTickets.map(ticket => ticket.ticket_id)}) AND au.is_active = 1 AND is_delete = 0`, false) : [];

            recentTickets = (assigned_users.length > 0) ? recentTickets.map(ticket => {
                ticket.assigned_users = assigned_users.filter(au => au.ticket_id === ticket.ticket_id);
                return ticket;
            }) : recentTickets;

            // Format the response
            const statusMap = {
                'Pending': {
                    'tickets': [],
                    'count': statusCounts.find(status => status.status === 'Pending')?.count || 0
                },
                'In Progress': {
                    'tickets': [],
                    'count': statusCounts.find(status => status.status === 'In Progress')?.count || 0
                },
                'Resolved': {
                    'tickets': [],
                    'count': statusCounts.find(status => status.status === 'Resolved')?.count || 0
                }
            };

            // Group tickets by status
            recentTickets.forEach(ticket => {
                if (statusMap[ticket.status]) {
                    statusMap[ticket.status].tickets.push(ticket);
                }
            });

            return sendResponse(req, res, 200, 1, { keyword: "success" }, {
                restaurant_issues: restaurantIssues,
                tickets: statusMap
            });

        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        } finally {
            recentTickets = null; // clear memory
        }
    },

    ticket_list: async (req, res) => {
        let tickets = {};
        try {
            const { status, priority, date_from, date_to, branch_id, issue_type } = req.body;

            // Build filters
            let filters = ' WHERE t.is_delete = 0';

            if (status) {
                filters += ` AND t.status = '${status}'`;
            }

            if (priority) {
                filters += ` AND t.priority = '${priority}'`;
            }

            if (date_from && date_to) {
                filters += ` AND DATE(t.created_at) BETWEEN '${date_from}' AND '${date_to}'`;
            } else if (date_from) {
                filters += ` AND DATE(t.created_at) >= '${date_from}'`;
            } else if (date_to) {
                filters += ` AND DATE(t.created_at) <= '${date_to}'`;
            }

            if (branch_id) {
                filters += ` AND t.restaurant_id = ${branch_id}`;
            }

            if (issue_type && issue_type !== 'Others') {
                filters += ` AND t.issue_title LIKE '%${issue_type}%'`;
            } else if (issue_type && issue_type === 'Others') {
                filters += ` AND t.is_other_issue = 1`;
            }

            // Get tickets
            const ticketsQuery = `SELECT t.id as ticket_id, t.ex_ticket_id, t.issue_title, t.description, t.priority, t.status, t.issue_date, t.created_at, concat(u.first_name, ' ', u.last_name) as customer_name, u.country_code, u.phone as customer_contact FROM tbl_tickets t LEFT JOIN tbl_users u ON t.user_id = u.id LEFT JOIN tbl_restaurants r ON t.restaurant_id = r.id ${filters} having ticket_id is not null ORDER BY t.id DESC`;

            tickets = await SELECT.All(ticketsQuery);

            let assigned_users = await SELECT.All(`SELECT ticket_id, assigned_to, concat('${ADMIN_IMAGE_PATH}', profile_image) as profile_image FROM tbl_ticket_assigns ta LEFT JOIN tbl_admin_users au ON ta.assigned_to = au.id WHERE ta.ticket_id IN (${tickets.map(ticket => ticket.ticket_id)}) AND au.is_active = 1 AND is_delete = 0`, false);

            tickets = (assigned_users.length > 0) ? tickets.map(ticket => {
                ticket.assigned_users = assigned_users.filter(au => au.ticket_id === ticket.ticket_id);
                return ticket;
            }) : tickets;

            return sendResponse(req, res, 200, 1, { keyword: "success" }, tickets);
        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        } finally {
            tickets = null; // clear memory
        }
    },

    ticket_details: async (req, res) => {
        try {
            const { ticket_id } = req.body;

            // Get ticket details
            const ticketQuery = `SELECT t.id as ticket_id, t.ex_ticket_id, t.order_id, t.user_id, t.restaurant_id, t.rider_id, t.issue_title, t.description, t.priority, t.status, t.issue_date, t.created_at, o.order_no, o.delivered_date_time, concat(u.first_name, ' ', u.last_name) as customer_name, concat('${USER_IMAGE_PATH}',if(u.profile_image IS NULL OR u.profile_image = '', 'default.png', u.profile_image)) as profile_image, u.country_code as customer_country_code, u.phone as customer_contact, r.name as restaurant_name, r.name as branch_name, (select concat(first_name, ' ', last_name) as name from tbl_rider_users where id = t.rider_id) as rider_name FROM tbl_tickets t join tbl_order o on t.order_id = o.id LEFT JOIN tbl_users u ON t.user_id = u.id LEFT JOIN tbl_restaurants r ON r.id = t.restaurant_id WHERE t.id = ${ticket_id} AND t.is_delete = 0`;

            const ticket = await SELECT.One(ticketQuery);

            // Get ticket assignments
            const assignmentsQuery = `SELECT ta.id as assignment_id, ta.assigned_to, ta.assigned_by, ta.created_at, au.name as assigned_to_name, ab.name as assigned_by_name, concat('${ADMIN_IMAGE_PATH}', au.profile_image) as profile_image FROM tbl_ticket_assigns ta LEFT JOIN tbl_admin_users au ON ta.assigned_to = au.id LEFT JOIN tbl_admin_users ab ON ta.assigned_by = ab.id WHERE ta.ticket_id = ${ticket_id}`;

            const assignments = await SELECT.All(assignmentsQuery, false);

            // Get ticket comments
            const commentsQuery = `SELECT tc.id as comment_id, tc.comment, tc.commented_by, tc.created_at, au.name as commenter_name, concat('${ADMIN_IMAGE_PATH}', au.profile_image) as commenter_profile_image FROM tbl_ticket_comments tc LEFT JOIN tbl_admin_users au ON tc.commented_by = au.id WHERE tc.ticket_id = ${ticket_id} ORDER BY tc.created_at ASC`;

            let comments = await SELECT.All(commentsQuery, false);

            // Get ticket attachments
            const attachmentsQuery = `SELECT ta.id as file_id, comment_id, concat('${ORDER_REPORT_IMAGE_PATH}', ta.file) as file, ta.uploaded_by, ta.created_at, au.name as uploaded_by_name FROM tbl_ticket_attachments ta LEFT JOIN tbl_admin_users au ON ta.uploaded_by = au.id WHERE ta.ticket_id = ${ticket_id}`;

            let attachments = await SELECT.All(attachmentsQuery, false);

            if (attachments.length > 0) {
                comments = comments.map(comment => {
                    comment.attachments = attachments.filter(attachment => attachment.comment_id === comment.comment_id);
                    return comment;
                });
            }

            attachments = attachments.filter(attachment => !attachment.comment_id);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, {
                ticket,
                assignments,
                comments,
                attachments
            });

        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    update_ticket: async (req, res) => {
        try {
            const { ticket_id, issue_title, description, issue_date, priority, status } = req.body;

            // Check if ticket exists
            await SELECT.One(`SELECT id FROM tbl_tickets WHERE id = ${ticket_id} AND is_delete = 0`, true, { no_data_msg: 'ticket_not_found' });

            // Prepare update fields
            const updateFields = [];
            const updateValues = [];

            if (issue_title) {
                updateFields.push('issue_title = ?');
                updateValues.push(issue_title);
            }

            if (issue_date) {
                updateFields.push('issue_date = ?');
                updateValues.push(issue_date);
            }

            if (description !== undefined) {
                updateFields.push('description = ?');
                updateValues.push(description);
            }

            if (priority) {
                updateFields.push('priority = ?');
                updateValues.push(priority);
            }

            if (status) {
                updateFields.push('status = ?');
                updateValues.push(status);
            }

            if (updateFields.length === 0) {
                throw new Error('no_fields_to_update');
            }
            // Add ticket ID to values
            updateValues.push(ticket_id);

            // Update ticket
            await UPDATE(`UPDATE tbl_tickets SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);

            return sendResponse(req, res, 200, 1, {
                keyword: "updated"
            });

        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_update' });
        }
    },

    add_comment: async (req, res) => {
        try {
            const { admin_id } = req.loginUser;
            const { ticket_id, comment, media } = req.body;

            // Check if ticket exists
            await SELECT.One(`SELECT id FROM tbl_tickets WHERE id = ${ticket_id} AND is_delete = 0`, true, { no_data_msg: 'ticket_not_found' });

            // Add comment
            const commentId = await INSERT(`INSERT INTO tbl_ticket_comments (ticket_id, comment, commented_by) VALUES (?, ?, ?);`, [ticket_id, comment, admin_id]);

            // Add attachment
            if (media?.length > 0) {
                for (const file of media) {
                    await INSERT(`INSERT INTO tbl_ticket_attachments (ticket_id, comment_id, file, uploaded_by) VALUES (?, ?, ?, ?);`, [ticket_id, commentId, file, admin_id]);
                }
            }

            return sendResponse(req, res, 200, 1, {
                keyword: "added"
            });

        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_add' });
        }
    },

    // Add media attachment to ticket or comment
    add_attachment: async (req, res) => {
        try {
            const { admin_id } = req.loginUser;
            const { ticket_id, comment_id = null, media } = req.body;

            // Check if ticket exists
            await SELECT.One(`SELECT id FROM tbl_tickets WHERE id = ${ticket_id} AND is_delete = 0`, true, { no_data_msg: 'ticket_not_found' });

            // Add attachment
            if (media.length > 0) {
                for (const file of media) {
                    await INSERT(`INSERT INTO tbl_ticket_attachments (ticket_id, comment_id, file, uploaded_by) VALUES (?, ?, ?, ?);`, [ticket_id, comment_id, file, admin_id]);
                }
            }

            return sendResponse(req, res, 200, 1, { keyword: "added" });

        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_add' });
        }
    },

    // add sub admin to ticket
    assign_ticket: async (req, res) => {
        try {
            const { admin_id } = req.loginUser;
            const { ticket_id, admin_id: assigned_admin_id } = req.body;

            // Check if ticket exists
            await SELECT.One(`SELECT id FROM tbl_tickets WHERE id = ${ticket_id} AND is_delete = 0`, true, { no_data_msg: 'ticket_not_found' });

            // Check if ticket is already assigned to this admin
            const existingAssignment = await SELECT.One(`SELECT id FROM tbl_ticket_assigns WHERE ticket_id = ${ticket_id} AND assigned_to = ${assigned_admin_id}`, false);

            if (existingAssignment && existingAssignment.id) {
                throw new Error('ticket_already_assigned_to_admin');
            }

            // Assign ticket
            const assignQuery = `INSERT INTO tbl_ticket_assigns (ticket_id, assigned_to, assigned_by) VALUES (?, ?, ?)`;

            const assignmentId = await INSERT(assignQuery, [ticket_id, assigned_admin_id, admin_id]);

            return sendResponse(req, res, 200, 1, { keyword: "ticket_assigned_successfully" });

        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed' });
        }
    },

    resolve_ticket: async (req, res) => {
        try {
            const { ticket_id } = req.body;

            // Check if ticket exists
            await SELECT.One(`SELECT id FROM tbl_tickets WHERE id = ${ticket_id} AND is_delete = 0`, true, { no_data_msg: 'ticket_not_found' });

            // Update ticket status
            await UPDATE(`UPDATE tbl_tickets SET status = 'Resolved' WHERE id = ${ticket_id}`);

            return sendResponse(req, res, 200, 1, {
                keyword: "ticket_resolved_successfully"
            });

        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed' });
        }
    },

    delete_ticket: async (req, res) => {
        try {
            const { ticket_id } = req.body;

            // Soft delete the ticket
            await UPDATE(`UPDATE tbl_tickets SET is_delete = 1 WHERE id = ${ticket_id}`);

            return sendResponse(req, res, 200, 1, {
                keyword: "deleted"
            });
        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_delete' });
        }
    },

    sub_admin_list: async (req, res) => {
        try {
            let sub_admins = await SELECT.All(`select id as admin_id, name, concat('${ADMIN_IMAGE_PATH}', profile_image) as profile_image from tbl_admin_users where user_type = 'sub_admin'`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, sub_admins);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed' });
        }
    },

    order_list: async (req, res) => {
        try {
            let { user_id } = req.body;

            let list = await SELECT.All(`select id as order_id, order_no, order_date_time from tbl_order where admin_approval_status != 'rejected' AND user_id = ${user_id} order by id desc`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, list);
        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    user_fetch: async (req, res) => {
        let { country_code, phone } = req.body;

        try {
            let user = await SELECT.One(`SELECT id as user_id, concat(first_name, ' ', last_name) as full_name, (select name from tbl_admin_users_color_codes where id = tbl_users.user_color_code_id) as user_type FROM tbl_users WHERE country_code = '${country_code}' AND phone = '${phone}' AND is_delete = 0`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, user);
        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed' });
        }
    }
};

async function createExcelFile(order_id) {

    try {

        let orderData = await SELECT.One(`SELECT id as order_id, order_date_time, order_no, service_type, admin_action_time, total_amount, ifnull(transaction_id, '-') as transaction_id, delivery_charges, loyalty_point, promo_code_amount, gift_card_amount, total_amount as payable_amount, payment_method, ifnull((SELECT CONCAT_WS(', ', NULLIF(TRIM(delivery_flat), ''), NULLIF(TRIM(delivery_area), ''), NULLIF(TRIM(delivery_landmark), ''), NULLIF(TRIM(delivery_city), ''), NULLIF(TRIM(delivery_state), ''), NULLIF(TRIM(delivery_country), '')) FROM tbl_user_delivery_address WHERE id = o.delivery_address_id), 'N/A') AS delivery_address, (select concat(first_name, ' ', last_name) from tbl_users where id = o.user_id) as user_name, (select concat(country_code, ' ', phone) from tbl_users where id = o.user_id) as user_phone FROM tbl_order o WHERE o.id = ${order_id}`);

        let orderItems = await SELECT.All(`SELECT ROW_NUMBER() OVER (order by id) as sr_no, name, quantity, item_amount as price, total_amount as amount, (select name from tbl_categories where id = oi.category_id) as category_name, (select name from tbl_sub_categories where id = oi.sub_category_id) as sub_category_name FROM tbl_order_items oi WHERE oi.order_id = ${order_id} AND oi.is_delete = 0`);

        // Prepare the data array for Excel
        const data = [
            ['', 'CafeJavas Order Details Excel', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['', 'Branch Name - CJ\'s Mall', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['', 'Order Notes', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['Order Placed Date & Time', 'Order No.', 'Customer Name', 'Phone No.', 'Delivery Address', 'Service Type', 'Order Confirmation Date & Time', 'S.No.', 'Product Description', 'Quantity', 'Price', 'Amount', 'Total Amount', 'Delivery Fee', 'Loyalty Amount', 'Promocode Amount', 'Gift card Amount', 'Payable Amount', 'Payment Terms', 'Transaction No', 'Category Name', 'Sub Category Name'],
        ];

        // Add order data
        const orderRow = [
            moment(orderData.order_date_time).format('YYYY-MM-DD HH:mm:ss a'),
            orderData.order_no,
            orderData.user_name,
            orderData.user_phone,
            orderData.delivery_address,
            orderData.service_type == 'delivery' ? 'Delivery' : orderData.service_type == 'pick_up' ? 'Pick Up' : orderData.service_type == 'carhop' ? 'Carhop' : 'Dine In',
            moment(orderData.admin_action_time).format('YYYY-MM-DD HH:mm:ss a'),
            orderItems[0].sr_no + ')',
            orderItems[0].name,
            orderItems[0].quantity?.toString(),
            orderItems[0].price?.toString(),
            orderItems[0].amount?.toString(),
            orderData.total_amount?.toString(),
            orderData.delivery_charges?.toString(),
            orderData.loyalty_point?.toString(),
            orderData.promo_code_amount?.toString(),
            orderData.gift_card_amount?.toString(),
            orderData.payable_amount?.toString(),
            orderData.payment_method,
            orderData.transaction_id?.toString(),
            orderItems[0].category_name,
            orderItems[0].sub_category_name
        ];
        data.push(orderRow);

        // Add additional order items (if any)
        for (let i = 1; i < orderItems.length; i++) {
            const item = orderItems[i];
            const itemRow = [
                '', '', '', '', '', '', '',
                item.sr_no + ')',
                item.name,
                item.quantity.toString(),
                item.price.toString(),
                item.amount.toString(),
                '', '', '', '', '', '', '', '',
                item.category_name,
                item.sub_category_name
            ];
            data.push(itemRow);
        }

        // Create a new workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(data);

        // Set column widths
        const columnWidths = [
            { wch: 25 }, // A
            { wch: 20 }, // B
            { wch: 20 }, // C
            { wch: 15 }, // D
            { wch: 40 }, // E
            { wch: 15 }, // F
            { wch: 25 }, // G
            { wch: 10 }, // H
            { wch: 25 }, // I
            { wch: 10 }, // J
            { wch: 10 }, // K
            { wch: 10 }, // L
            { wch: 15 }, // M
            { wch: 15 }, // N
            { wch: 15 }, // O
            { wch: 20 }, // P
            { wch: 20 }, // Q
            { wch: 15 }, // R
            { wch: 15 }, // S
            { wch: 40 }, // T
            { wch: 25 }, // U
            { wch: 25 }  // V
        ];

        worksheet['!cols'] = columnWidths;

        // Set merge areas for headers
        worksheet['!merges'] = [
            { s: { r: 0, c: 1 }, e: { r: 0, c: 20 } }, // B1:U1
            { s: { r: 1, c: 1 }, e: { r: 1, c: 20 } }, // B2:U2
            { s: { r: 2, c: 1 }, e: { r: 2, c: 20 } }  // B3:U3
        ];

        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, "Order Details");

        // Save the workbook
        const outputPath = path.resolve('Docs', `order_${orderData.order_no}.xlsx`);

        XLSX.writeFile(workbook, outputPath);

        return true;
    } catch (err) {
        return false;
    }
}

module.exports = {
    commonModel,
    deliveryModel,
    ticketModel
};