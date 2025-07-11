const { SELECT, INSERT, UPDATE, DELETE } = require('../../utils/SQLWorker');
const { RIDER_IMAGE_PATH, TUTORIAL_IMAGE_PATH, FILE_EXTENSIONS, INVENTORY_IMAGE_PATH, MENU_IMAGE_PATH, FEEDBACK_REVIEW_IMAGE_PATH } = require('../../config/constants');
const { sendResponse, checkRolePermissionInModel } = require('../../middleware');
const cryptoLib = require('cryptlib');
const shaKey = cryptoLib.getHashSha256(process.env.PASSWORD_ENC_KEY, 32);

let riderModel = {
    add_rider: async (req, res) => {
        let { admin_id } = req.loginUser;
        let body = req.body;
        try {
            let check_user = await SELECT.All(`SELECT id FROM tbl_rider_users WHERE username_email = '${body.username_email}'`, false);

            if (check_user.length > 0) return sendResponse(req, res, 200, 0, { keyword: "username_email_exists" });

            let en_password = cryptoLib.encrypt(body.password, shaKey, process.env.PASSWORD_ENC_IV);

            await INSERT(`INSERT INTO tbl_rider_users SET ?`, {
                first_name: body.first_name,
                last_name: body.last_name,
                username_email: body.username_email,
                password: en_password,
                rider_type: body.rider_type,
                phone: body.phone,
                alternate_phone: body.alternate_phone,
                country_name: body.country_name,
                branch_id: body.branch_id,
                shift_start_time: body.shift_start_time,
                shift_end_time: body.shift_end_time,
                identity_proof: body.identity_proof,
                license_number: body.license_number,
                expiry_date: body.expiry_date,
                reference_name: body.reference_name,
                reference_phone: body.reference_phone,
                profile_image: body.profile_image || 'default.png',
                created_by: admin_id
            });

            return sendResponse(req, res, 200, 1, { keyword: "added" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_add' });
        }
    },
    edit_rider: async (req, res) => {
        let { admin_id } = req.loginUser;
        let body = req.body;
        try {
            let check_user = await SELECT.All(`SELECT id FROM tbl_rider_users WHERE username_email = '${body.username_email}' AND id != ${body.rider_id}`, false);

            if (check_user.length > 0) return sendResponse(req, res, 200, 0, { keyword: "username_email_exists" });

            let en_password = cryptoLib.encrypt(body.password, shaKey, process.env.PASSWORD_ENC_IV);

            await UPDATE(`UPDATE tbl_rider_users SET ? WHERE id = ${body.rider_id}`, {
                first_name: body.first_name,
                last_name: body.last_name,
                username_email: body.username_email,
                password: en_password,
                rider_type: body.rider_type,
                phone: body.phone,
                alternate_phone: body.alternate_phone,
                country_name: body.country_name,
                branch_id: body.branch_id,
                shift_start_time: body.shift_start_time,
                shift_end_time: body.shift_end_time,
                identity_proof: body.identity_proof,
                license_number: body.license_number,
                expiry_date: body.expiry_date,
                reference_name: body.reference_name,
                bike_number_plate: body.bike_number_plate,
                blood_group: body.blood_group,
                reference_phone: body.reference_phone,
                profile_image: body.profile_image || 'default.png',
                updated_by: admin_id,
                role_updated_by: 'admin'
            });

            return sendResponse(req, res, 200, 1, { keyword: "edited" });
        }
        catch (err) {
            console.log('err :', err);
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_edit' });
        }
    },
    get_rider: async (req, res) => {
        let { rider_id } = req.body;
        try {
            let rider = await SELECT.One(`SELECT *, (select name from tbl_restaurants where id = tbl_rider_users.branch_id) as branch_name FROM tbl_rider_users WHERE id = ${rider_id}`);

            rider.rider_id = rider.id;
            delete rider.id;
            rider.password = cryptoLib.decrypt(rider.password, shaKey, process.env.PASSWORD_ENC_IV);
            rider.profile_image = rider.profile_image ? `${RIDER_IMAGE_PATH}${rider.profile_image}` : `${RIDER_IMAGE_PATH}default.png`;

            let { rating = 0, reviews = 0 } = await SELECT.One(`SELECT (select ifnull(avg(avg_rating), 0) from tbl_feedback where rider_id = ${rider_id}) as rating, (select count(*) from tbl_feedback where rider_id = ${rider_id}) as reviews`, false);
            rider.rating = parseInt(rating);
            rider.reviews = reviews;

            let { rank_number = 0 } = await SELECT.One(`SELECT rank_number FROM ( SELECT ROW_NUMBER() OVER (ORDER BY r.leaderboard_points DESC) AS rank_number, r.id AS rider_id, IFNULL((SELECT SUM(points) FROM tbl_rider_leaderboard_point_history AS rlph WHERE rider_id = r.id), 0) AS leaderboard_points, r.branch_id FROM tbl_rider_users r WHERE r.is_active = 1 AND r.is_delete = 0 ) ranked_riders WHERE rider_id = ${rider_id}`, false);
            rider.leaderboard_rank = rank_number;

            return sendResponse(req, res, 200, 1, { keyword: "success" }, rider);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    get_rider_map_track: async (req, res) => {
        try {
            let { rider_id, type } = req.body;

            let history = [];
            let current = {};
            let start = {};
            let end = {};
            if (type == 'current') {
                let { current_latitude, current_longitude } = await SELECT.One(`SELECT current_latitude, current_longitude FROM tbl_rider_users WHERE id = ${rider_id}`);

                current = {
                    latitude: current_latitude,
                    longitude: current_longitude
                }
            } else if (type == 'history') {

                history = await SELECT.All(`SELECT latitude, longitude, created_at from tbl_rider_lat_long_history where rider_id = ${rider_id} order by created_at desc`);

                // set start and end based on the first and last entry in history
                start = {
                    latitude: history.length > 0 ? history[0].latitude : 0,
                    longitude: history.length > 0 ? history[0].longitude : 0
                }

                end = {
                    latitude: history.length > 0 ? history[history.length - 1].latitude : 0,
                    longitude: history.length > 0 ? history[history.length - 1].longitude : 0
                }

            }


            return sendResponse(req, res, 200, 1, { keyword: "success" }, { type, start, end, history, current });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch', components: { type: err?.type } });
        }
    },
    general_order_activity: async (req, res) => {
        let { rider_id, date } = req.body;
        try {
            let addWhere = '';
            if (date) addWhere += `AND DATE(created_at) = '${date}'`;

            let { rider_return_time = 0, rider_delivery_time = 0 } = await SELECT.One(`SELECT JSON_EXTRACT(setting_value, '$.rider_return_time') AS rider_return_time, JSON_EXTRACT(setting_value, '$.rider_delivery_time') AS rider_delivery_time FROM tbl_app_setting where setting_key = 'grace_time'`, false);

            let { spillage_count = 0, swapping_count = 0, missing_order_count = 0 } = await SELECT.All(`SELECT SUM(CASE WHEN t.is_other_issue = 0 AND lower(t.issue_title) LIKE '%spillage%' THEN 1 ELSE 0 END) as spillage_count, SUM(CASE WHEN t.is_other_issue = 0 AND lower(t.issue_title) LIKE '%swapping%' THEN 1 ELSE 0 END) as swapping_count, SUM(CASE WHEN t.is_other_issue = 0 AND lower(t.issue_title) LIKE '%missing order%' THEN 1 ELSE 0 END) as missing_order_count FROM tbl_tickets t WHERE t.is_delete = 0 AND rider_id = ${rider_id} ${addWhere}`, false);

            let { cancelled_order = 0, delivered_order = 0, delayed_order = 0, pick_up_delayed = 0, return_delayed = 0 } = await SELECT.One(`SELECT SUM(CASE WHEN admin_approval_status = 'approved' AND order_status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_order, SUM(CASE WHEN admin_approval_status = 'approved' AND order_status = 'delivered' THEN 1 ELSE 0 END) AS delivered_order, SUM(CASE WHEN TIMESTAMPDIFF(MINUTE, out_of_delivery_time, service_time) > (delivery_duration + ${Number(rider_delivery_time)}) THEN 1 ELSE 0 END) AS delayed_order, SUM(CASE WHEN TIMESTAMPDIFF(MINUTE, rider_assign_time, out_of_delivery_time) > 10 THEN 1 ELSE 0 END) AS pick_up_delayed, SUM(CASE WHEN TIMESTAMPDIFF(MINUTE, rider_return_date_time, arrival_time_at_branch) > (return_duration_to_branch + ${Number(rider_return_time)}) THEN 1 ELSE 0 END) AS return_delayed FROM tbl_order WHERE rider_id = ${rider_id} ${addWhere}`, false);

            let inventory_items = await SELECT.All(`SELECT inventory_item_id, (SELECT name FROM tbl_inventory_items WHERE id = inventory_item_id) AS item_name, SUM(CASE WHEN type = 'allocate' THEN 1 ELSE 0 END) - SUM(CASE WHEN type = 'recover' THEN 1 ELSE 0 END) AS current_count FROM tbl_inventory_allocations WHERE rider_id = ${rider_id} GROUP BY inventory_item_id HAVING current_count > 0 ORDER BY current_count DESC;`, false)

            let order_activity = {
                spillage_count: spillage_count,
                swapping_count: swapping_count,
                missing_order_count: missing_order_count,
                cancelled_order: cancelled_order || 0,
                delivered_order: delivered_order || 0,
                delayed_order: delayed_order || 0,
                pick_up_delayed: pick_up_delayed || 0,
                return_delayed: return_delayed || 0
            };

            return sendResponse(req, res, 200, 1, { keyword: "success" }, {
                order_activity,
                inventory_items
            });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    restaurant_menu_list: async (req, res) => {
        try {
            let { country } = req.loginUser;

            let list = await SELECT.All(`select id as branch_id, name, (select count(ru.id) from tbl_rider_users as ru where ru.branch_id = r.id AND ru.is_active = 1 AND ru.is_delete = 0) as count from tbl_restaurants as r where country = '${country}' AND is_active = 1 AND is_delete = 0 order by count desc`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, list);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    feedback_comments: async (req, res) => {
        try {
            let { rider_id, date } = req.body;

            let addWhere = '';
            if (date) {
                addWhere += `AND DATE(tf.created_at) = '${date}'`;
            }

            data = await SELECT.All(`select tf.id as feedback_id, o.id as order_id, o.order_no, o.service_type, o.order_date_time, tf.feedback_field_id, (select name from tbl_feedback_fields where id = tf.feedback_field_id) as feedback_field, tf.comment, tf.media from tbl_feedback as tf join tbl_order as o on tf.order_id = o.id where o.country = '${country}' AND tf.rider_id = ${rider_id} ${addWhere} order by tf.id desc`);

            let allFeedbackIds = [];

            data = data?.map(item => {
                allFeedbackIds.push(item.feedback_id);
                item.media = item.media?.map(media => FEEDBACK_REVIEW_IMAGE_PATH + media) || [];
                return item;
            });

            let feedbackQuestions = await SELECT.All(`select id as rating_id, feedback_id, (select question from tbl_feedback_questions where id = fr.feedback_question_id) as feedback_question, (select description from tbl_feedback_questions where id = fr.feedback_question_id) as feedback_description, fr.rating from tbl_feedback_ratings as fr where feedback_id in (${allFeedbackIds}) having feedback_question is not null`);

            data = data.map(item => {
                item.ratings = feedbackQuestions.filter(feedback => feedback.feedback_id == item.feedback_id).map(rating => {
                    rating.rating = parseInt(rating.rating);
                    return rating;
                });
                return item;
            });

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    rider_delayed_orders: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { type } = req.body;

            let { rider_return_time = 0, rider_delivery_time = 0 } = await SELECT.One(`SELECT JSON_EXTRACT(setting_value, '$.rider_return_time') AS rider_return_time, JSON_EXTRACT(setting_value, '$.rider_delivery_time') AS rider_delivery_time FROM tbl_app_setting where setting_key = 'grace_time'`, false);

            let addWhere = 'AND (TIMESTAMPDIFF(MINUTE, o.out_of_delivery_time, o.delivered_date_time) > o.delivery_duration OR TIMESTAMPDIFF(MINUTE, o.rider_return_date_time, o.arrival_time_at_branch) > o.return_duration_to_branch)';
            if (type == 'return_delay') addWhere += `AND TIMESTAMPDIFF(MINUTE, o.rider_return_date_time, o.arrival_time_at_branch) > o.return_duration_to_branch`;
            if (type == 'delivery_delay') addWhere += `AND TIMESTAMPDIFF(MINUTE, o.out_of_delivery_time, o.service_time) > o.delivery_duration`;

            let orders = await SELECT.All(`SELECT o.id as order_id, o.order_no, o.rider_id, concat(r.first_name, ' ', r.last_name) as rider_name, concat('${RIDER_IMAGE_PATH}', IFNULL(r.profile_image, 'default.png')) as profile_image, (SELECT CONCAT_WS(', ', NULLIF(TRIM(delivery_flat), ''), NULLIF(TRIM(delivery_area), ''), NULLIF(TRIM(delivery_landmark), ''), NULLIF(TRIM(delivery_city), ''), NULLIF(TRIM(delivery_state), ''), NULLIF(TRIM(delivery_country), '')) FROM tbl_user_delivery_address WHERE id = o.delivery_address_id) as delivery_address, delivery_distance, ifnull(o.delivery_duration, 0) as delivery_duration, ifnull(TIMESTAMPDIFF(MINUTE, o.out_of_delivery_time, o.service_time), 0) as delivery_duration_real, ifnull(o.return_duration_to_branch, 0) as return_duration_to_branch, ifnull(TIMESTAMPDIFF(MINUTE, o.rider_return_date_time, o.arrival_time_at_branch), 0) as return_duration_real FROM tbl_order as o join tbl_rider_users as r on o.rider_id = r.id WHERE r.country_name = '${country}' AND o.service_type = 'delivery' AND o.admin_approval_status = 'approved' AND o.order_status = 'delivered' ${addWhere} ORDER BY o.delivered_date_time DESC`);

            // Calculate delivery_delay and return_delay for each order
            orders = orders.map(order => {
                // Calculate delivery delay (if negative, show 0)
                const deliveryDelay = order.delivery_duration_real - (order.delivery_duration + Number(rider_delivery_time));
                order.delivery_delay = deliveryDelay > 0 ? deliveryDelay : 0;
                delete order.delivery_duration_real;
                delete order.delivery_duration;
                // Calculate return delay (if negative, show 0)
                const returnDelay = order.return_duration_real - (order.return_duration_to_branch + Number(rider_return_time));
                order.return_delay = returnDelay > 0 ? returnDelay : 0;

                delete order.return_duration_real;
                delete order.return_duration_to_branch;

                return order;
            }).filter(order => {
                // Filter out orders with no delivery or return delay
                if (type == 'return_delay') {
                    return order.return_delay > 0;
                } else if (type == 'delivery_delay') {
                    return order.delivery_delay > 0;
                } else {
                    return order.delivery_delay > 0 || order.return_delay > 0;
                }
            });

            return sendResponse(req, res, 200, 1, { keyword: "success" }, orders);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    leaderboard: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { month, branch_id, rider_type } = req.body;

            let addWhere = '';
            let dateWise = '';
            if (month) dateWise += `AND MONTH(rlph.created_at) = ${month} `;
            if (branch_id) addWhere += `AND r.branch_id = ${branch_id} `;
            if (rider_type) addWhere += `AND r.rider_type = '${rider_type}' `;

            let { rider_return_time = 0, rider_delivery_time = 0 } = await SELECT.One(`SELECT JSON_EXTRACT(setting_value, '$.rider_return_time') AS rider_return_time, JSON_EXTRACT(setting_value, '$.rider_delivery_time') AS rider_delivery_time FROM tbl_app_setting where setting_key = 'grace_time'`, false);

            let leaderboard = await SELECT.All(`WITH delivered_orders AS (SELECT rider_id, COUNT(*) as count FROM tbl_order WHERE service_type = 'delivery' AND admin_approval_status = 'approved' AND order_status = 'delivered' GROUP BY rider_id), complaints AS (SELECT rider_id, COUNT(*) as count, CAST(AVG(avg_rating) AS SIGNED) as avg_rating FROM tbl_feedback GROUP BY rider_id), delayed_deliveries AS (SELECT rider_id, COUNT(*) as count FROM tbl_order WHERE service_type = 'delivery' AND admin_approval_status = 'approved' AND order_status = 'delivered' AND TIMESTAMPDIFF(MINUTE, out_of_delivery_time, delivered_date_time) > (delivery_duration + ${Number(rider_delivery_time)}) GROUP BY rider_id), delayed_returns AS (SELECT rider_id, COUNT(*) as count FROM tbl_order WHERE service_type = 'delivery' AND admin_approval_status = 'approved' AND order_status = 'delivered' AND TIMESTAMPDIFF(MINUTE, rider_return_date_time, arrival_time_at_branch) > (return_duration_to_branch + ${Number(rider_return_time)}) GROUP BY rider_id) SELECT ROW_NUMBER() OVER (ORDER BY r.leaderboard_points DESC) AS rank_number, r.id as rider_id, concat(r.first_name, ' ', r.last_name) as name, CONCAT('${RIDER_IMAGE_PATH}', IFNULL(r.profile_image, 'default.png')) as profile_image, IFNULL(c.avg_rating, 0) as avg_rating, (SELECT name FROM tbl_restaurants WHERE id = r.branch_id) as restaurant_name, r.rider_type, IFNULL(do.count, 0) as total_delivered_orders, IFNULL(c.count, 0) as total_complaints, IFNULL(dd.count, 0) as total_delayed_deliveries, IFNULL(dr.count, 0) as total_delayed_returns, IFNULL((select sum(points) from tbl_rider_leaderboard_point_history as rlph where rider_id = r.id ${dateWise}), 0) as leaderboard_points, r.branch_id FROM tbl_rider_users r LEFT JOIN delivered_orders do ON r.id = do.rider_id LEFT JOIN complaints c ON r.id = c.rider_id LEFT JOIN delayed_deliveries dd ON r.id = dd.rider_id LEFT JOIN delayed_returns dr ON r.id = dr.rider_id WHERE r.country_name = '${country}' AND r.is_active = 1 AND r.is_delete = 0 ${addWhere} ORDER BY leaderboard_points DESC`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, leaderboard);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    list_riders: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { branch_id, status } = req.body;
            let addWhere = '';
            if (branch_id) addWhere += `AND branch_id = ${branch_id} `;
            if (status) addWhere += `AND status = '${status}' `;

            let riders = await SELECT.All(`SELECT id as rider_id, 0 as 'rank', rider_type, concat(first_name, ' ', last_name) as name, phone, shift_start_time, shift_end_time, status, is_available, concat('${RIDER_IMAGE_PATH}', IFNULL(profile_image, 'default.png')) as profile_image FROM tbl_rider_users WHERE country_name = '${country}' AND is_delete = 0 ${addWhere} ORDER BY updated_at DESC`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, riders);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    live_map_status: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { filter, branch_id } = req.body;

            let addWhere = '';
            if (filter) {
                addWhere += ` AND status = '${filter}'`;
            }

            if (branch_id) {
                addWhere += ` AND branch_id = ${branch_id}`;
            }

            let riders = await SELECT.All(`SELECT id as rider_id, concat(first_name, ' ', last_name) as name, current_latitude, current_longitude, status FROM tbl_rider_users WHERE country_name = '${country}' AND is_available = 1 AND status != 'Offline' AND is_delete = 0 ${addWhere}`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, riders);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    live_status_list: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let available_rider_promise = SELECT.All(`SELECT id as rider_id, concat(first_name, ' ', last_name) as name FROM tbl_rider_users WHERE country_name = '${country}' AND status = 'Available' AND is_available = 1 AND is_active = 1 AND is_delete = 0`, false);

            let out_for_delivery_rider_promise = SELECT.All(`SELECT id AS rider_id, CONCAT(first_name, ' ', last_name) AS name, (SELECT COUNT(id) FROM tbl_order WHERE rider_id = tbl_rider_users.id AND admin_approval_status = 'approved' AND order_status = 'out_for_delivery' AND out_of_delivery_time IS NOT NULL) AS order_count, IFNULL((SELECT TIMESTAMPDIFF(MINUTE, o.out_of_delivery_time, NOW()) FROM tbl_order AS o WHERE rider_id = tbl_rider_users.id AND admin_approval_status = 'approved' AND order_status = 'out_for_delivery' ORDER BY out_of_delivery_time DESC LIMIT 1), 0) AS mins FROM tbl_rider_users WHERE country_name = '${country}' AND is_available = 1 AND status = 'Out For Delivery' AND is_active = 1 AND is_delete = 0;`, false);

            let return_back_rider_promise = SELECT.All(`SELECT id as rider_id, concat(first_name, ' ', last_name) as name, ifnull((select return_duration_to_branch from tbl_order where tbl_order.rider_id = tbl_rider_users.id AND admin_approval_status = 'approved' AND order_status = 'delivered' AND is_rider_arrived_at_branch = 0 AND arrival_time_at_branch is not null and is_delete = 0 and is_active = 1), 0) as orders FROM tbl_rider_users WHERE country_name = '${country}' AND is_available = 1 AND status = 'Rider Returning' AND is_active = 1 AND is_delete = 0`, false);

            let on_break_rider_promise = SELECT.All(`SELECT id as rider_id, concat(first_name, ' ', last_name) as name, ifnull((select TIMESTAMPDIFF(MINUTE, ra.created_at, now()) from tbl_rider_availability_log as ra where rider_id = tbl_rider_users.id AND shift_status = 'on_break' order by id desc limit 1), 0) as mins FROM tbl_rider_users WHERE country_name = '${country}' AND is_active = 1 AND is_delete = 0 AND status = 'Offline' AND is_available = 1`, false);

            let not_working_rider_promise = SELECT.All(`SELECT id as rider_id, concat(first_name, ' ', last_name) as name FROM tbl_rider_users WHERE country_name = '${country}' AND is_active = 1 AND is_delete = 0 AND status = 'Offline' AND is_available = 0`, false);

            let [available_rider, out_for_delivery_rider, return_back_rider, on_break_rider, not_working_rider] = await Promise.all([available_rider_promise, out_for_delivery_rider_promise, return_back_rider_promise, on_break_rider_promise, not_working_rider_promise]);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, {
                available_rider,
                out_for_delivery_rider,
                return_back_rider,
                on_break_rider,
                not_working_rider
            });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    action_rider: async (req, res) => {
        let { admin_id } = req.loginUser;
        let { rider_id, type, value } = req.body;
        try {
            if (type === 'block') {
                await UPDATE(`UPDATE tbl_rider_users SET is_block = ${value}, updated_by = ${admin_id}, role_updated_by = 'admin' WHERE id = ${rider_id}`);
            } else if (type === 'delete') {
                await UPDATE(`UPDATE tbl_rider_users SET is_delete = 1, updated_by = ${admin_id}, role_updated_by = 'admin' WHERE id = ${rider_id}`);
            } else if (type === 'available') {

                if (value == 0) {
                    let check = await SELECT.One(`SELECT status FROM tbl_rider_users WHERE id = ${rider_id}`);

                    if (['Order Assigned', 'Out For Delivery', 'Rider Reached Location', 'Rider Returning'].includes(check.status)) {
                        return sendResponse(req, res, 200, 0, { keyword: "rider_work_on_order" });
                    }
                }

                await UPDATE(`UPDATE tbl_rider_users SET is_available = ${value}, updated_by = ${admin_id}, role_updated_by = 'admin' WHERE id = ${rider_id}`);
            } else if (type === 'restaurant') {
                await UPDATE(`UPDATE tbl_rider_users SET branch_id = ${value}, updated_by = ${admin_id}, role_updated_by = 'admin' WHERE id = ${rider_id}`);
            } else if (type === 'monthly_earning') {
                await UPDATE(`UPDATE tbl_rider_users SET monthly_earning = ${value}, updated_by = ${admin_id}, role_updated_by = 'admin' WHERE id = ${rider_id}`);
            } else if (type === 'edit_accident_count') {
                await UPDATE(`UPDATE tbl_rider_users SET accident_count = '${value}', updated_by = ${admin_id}, role_updated_by = 'admin' WHERE id = ${rider_id}`);
            } else if (type === 'logged_out_device') {
                await DELETE(`DELETE FROM tbl_rider_user_device WHERE id = ${value}`);
            }

            return sendResponse(req, res, 200, 1, { keyword: "success" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_update_status' });
        }
    },
    add_comment: async (req, res) => {
        let { admin_id } = req.loginUser;
        let { rider_id, title, comment, order_id } = req.body;
        try {
            if (!order_id) {
                order_id = null;
            }

            await INSERT(`INSERT INTO tbl_rider_comments SET ?`, {
                rider_id: rider_id,
                title: title,
                comment: comment,
                created_by: admin_id,
                role_created_by: 'admin',
                order_id: order_id
            });

            return sendResponse(req, res, 200, 1, { keyword: "added" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_add' });
        }
    },
    mark_comment_resolved: async (req, res) => {
        let { admin_id } = req.loginUser;
        let { comment_id } = req.body;
        try {
            await UPDATE(`UPDATE tbl_rider_comments SET is_resolved = 1, resolved_by = ${admin_id}, role_resolved_by = 'admin' WHERE id = ${comment_id}`);

            return sendResponse(req, res, 200, 1, { keyword: "comment_resolved" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed' });
        }
    },
    comments_list: async (req, res) => {
        let { rider_id } = req.body;
        try {
            let comments = await SELECT.All(`SELECT id as comment_id, (case when role_created_by = 'admin' then (select name from tbl_admin_users where id = tbl_rider_comments.created_by) when role_created_by in ('agent_admin', 'agent') then (select name from tbl_agentadmin_users where id = tbl_rider_comments.created_by) else 'N/A' end) as created_by, title, comment, is_resolved, created_at FROM tbl_rider_comments WHERE rider_id = ${rider_id} ORDER BY created_at DESC`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, comments);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    order_list: async (req, res) => {
        try {
            let { rider_id } = req.body;

            let orders = await SELECT.All(`select id as order_id, order_no, (select name from tbl_restaurants where id = tbl_order.restaurant_branch_id) as branch_name, order_date_time, payment_method, out_of_delivery_time, delivered_date_time, now() as return_time, order_status, total_amount, delivery_distance, currency, (ifnull(TIMESTAMPDIFF(MINUTE, out_of_delivery_time, delivered_date_time), 0) - delivery_duration) as delivery_delay from tbl_order where rider_id = ${rider_id} order by id desc`);

            let order_ids = orders.map(order => order.order_id);

            let order_details = await SELECT.All(`select id as order_item_id, order_id, (select name from tbl_categories where id = category_id) as category_name, concat('${MENU_IMAGE_PATH}', (SELECT mf.name FROM tbl_media_files mf WHERE FIND_IN_SET(mf.id, (select product_image_ids from tbl_menu_items where id = tbl_order_items.menu_item_id)) AND mf.type = 'cover' LIMIT 1)) AS image, name, item_amount, quantity, total_amount from tbl_order_items where order_id in (${order_ids}) AND is_delete = 0`);

            orders = orders.map(order => {
                order.items = order_details.filter(item => item.order_id == order.order_id).map(item => {
                    item.currency = order.currency;
                    return item;
                });
                return order;
            });

            return sendResponse(req, res, 200, 1, { keyword: "success" }, orders);
        }
        catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: e.message || 'failed_to_fetch' });
        }
    },
    crud_champ: async (req, res) => {
        let { admin_id } = req.loginUser;
        let { rider_id, type, value } = req.body;
        try {

            if (type === 'add') {
                await checkRolePermissionInModel(admin_id, "rider", 'edit');

                await INSERT(`INSERT INTO tbl_rider_champs SET ?`, {
                    rider_id: rider_id,
                    title: value.title,
                    date: value.date,
                    created_by: admin_id
                });

                await UPDATE(`UPDATE tbl_rider_users SET champ_count = champ_count + 1 WHERE id = ${rider_id}`);

                return sendResponse(req, res, 200, 1, { keyword: "added" });

            } else if (type === 'delete') {
                await checkRolePermissionInModel(admin_id, "rider", 'delete');

                await DELETE(`DELETE FROM tbl_rider_champs WHERE id = ${value}`);

                await UPDATE(`UPDATE tbl_rider_users SET champ_count = champ_count - 1 WHERE id = ${rider_id}`);

                return sendResponse(req, res, 200, 1, { keyword: "deleted" });
            } else {
                await checkRolePermissionInModel(admin_id, "rider", 'view');

                let champs = await SELECT.All(`SELECT * FROM tbl_rider_champs WHERE rider_id = ${rider_id} ORDER BY date DESC`);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, champs);
            }
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_update_status' });
        }
    },
    logged_in_devices: async (req, res) => {
        let { rider_id } = req.body;
        try {
            let devices = await SELECT.All(`SELECT id as device_id, device_name, created_at as last_active, if(last_active is not null AND last_active > DATE_SUB(NOW(), INTERVAL 1 DAY), 1, 0) as is_online FROM tbl_rider_user_device WHERE rider_id = ${rider_id} AND token != ''`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, devices);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message });
        }
    }
};

//////////////////////////////////////////////////////////////////////
//                            Inventory                             //
//////////////////////////////////////////////////////////////////////

let inventoryModel = {
    main_listing: async (req, res) => {
        try {
            let { view_more, date_filter_type, start_date, end_date } = req.body;

            let addWhere = '';
            if (start_date && end_date && date_filter_type == 'new_items') addWhere += `AND created_at BETWEEN '${start_date}' AND '${end_date}' `;
            if (start_date && end_date && date_filter_type == 'recent_activity') addWhere += `AND ia.received_date BETWEEN '${start_date}' AND '${end_date}' `;
            if (start_date && end_date && date_filter_type == 'damaged_items') addWhere += `AND tia.received_date BETWEEN '${start_date}' AND '${end_date}' `;
            if (start_date && end_date && date_filter_type == 'old_items') addWhere += `AND tia.received_date BETWEEN '${start_date}' AND '${end_date}' `;

            const [new_items, recent_allocations, damaged_items, old_items, items_list] = await Promise.all([
                // new items
                SELECT.All(`SELECT id as inventory_item_id, name, (select sum(quantity) from tbl_inventory_item_stocks where inventory_item_id = ti.id) as received_qty, sum(allocated_quantity + ti.damaged_quantity) as allocated_quantity, (select sum(quantity) from tbl_inventory_item_stocks where inventory_item_id = ti.id) - sum(ti.damaged_quantity + ti.allocated_quantity) as available_qty FROM tbl_inventory_items as ti where id != 0 ${date_filter_type == 'new_items' ? addWhere : ""} GROUP BY id ORDER BY created_at DESC ${view_more == 'new_items' ? "" : "LIMIT 5"}`, false),
                // recent activity
                SELECT.All(`SELECT ia.id as allocation_id, ia.rider_id, concat(ru.first_name, ' ', ru.last_name) as rider_name, concat('${RIDER_IMAGE_PATH}', ifnull(ru.profile_image, 'default.png')) as rider_image, ru.ex_rider_id, (select r.name from tbl_restaurants as r where id = ia.restaurant_id) as restaurant_name, received_date, ii.name as item_name, (select size from tbl_inventory_item_stocks as iis where iis.inventory_item_id = ii.id limit 1) as size, ia.quantity, ia.status FROM tbl_inventory_allocations as ia Join tbl_inventory_items as ii ON ia.inventory_item_id = ii.id JOIN tbl_rider_users as ru ON ia.rider_id = ru.id where ia.id != 0 ${date_filter_type == 'recent_activity' ? addWhere : ""} ORDER BY ia.id desc ${view_more == 'recent_activity' ? "" : "LIMIT 5"}`, false),
                // damaged items
                SELECT.All(`select tii.id as inventory_item_id, tii.name, sum(tia.quantity) as quantity from tbl_inventory_allocations as tia join tbl_inventory_items as tii on tia.inventory_item_id = tii.id where type = 'recover' and status = 'damaged' ${date_filter_type == 'damaged_items' ? addWhere : ""} group by tii.id order by quantity desc ${view_more == 'damaged_items' ? "" : "LIMIT 5"}`, false),
                // old items
                SELECT.All(`select tii.id as inventory_item_id, tii.name, sum(if(tia.type = 'recover' AND tia.status = 'recovered', 1, 0)) as received_quantity, sum(if(tia.type = 'allocate' AND tia.status = 'old', 1, 0)) as allocated_quantity, (sum(if(tia.type = 'recover' AND tia.status = 'recovered', 1, 0)) - sum(if(tia.type = 'allocate' AND tia.status = 'old', 1, 0))) as available_quantity from tbl_inventory_allocations as tia join tbl_inventory_items as tii on tia.inventory_item_id = tii.id where tii.id != 0 ${date_filter_type == 'old_items' ? addWhere : ""} group by tii.id order by tia.created_at desc ${view_more == 'old_items' ? "" : "LIMIT 5"}`, false),

                // items list
                SELECT.All(`select tii.id as item_id, tii.name as item_name, tic.name as category_name, concat('${INVENTORY_IMAGE_PATH}', tii.image) as image from tbl_inventory_items as tii join tbl_inventory_categories as tic on tii.category_id = tic.id order by tii.id desc;`, false),
            ]);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, { new_items, recent_allocations, damaged_items, old_items, items_list });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    create_category: async (req, res) => {
        let body = req.body;
        try {
            await INSERT(`INSERT INTO tbl_inventory_categories SET ?`, {
                name: body.name,
                store_location: body.store_location
            });

            return sendResponse(req, res, 200, 1, { keyword: "created" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_create' });
        }
    },
    category_list: async (req, res) => {
        try {
            let categories = await SELECT.All(`SELECT id as category_id, name, store_location FROM tbl_inventory_categories ORDER BY name ASC`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, categories);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    create_sub_category: async (req, res) => {
        let body = req.body;
        try {
            await INSERT(`INSERT INTO tbl_inventory_sub_categories SET ?`, {
                category_id: body.category_id,
                name: body.name
            });

            return sendResponse(req, res, 200, 1, { keyword: "created" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_create' });
        }
    },
    sub_category_list: async (req, res) => {
        let { category_id } = req.body;
        try {
            let sub_categories = await SELECT.All(`SELECT id as sub_category_id, name FROM tbl_inventory_sub_categories WHERE category_id = ${category_id} ORDER BY name ASC`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, sub_categories);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    create_item: async (req, res) => {
        let body = req.body;
        try {

            let inventory_item_id = await INSERT(`INSERT INTO tbl_inventory_items SET ?`, {
                category_id: body.category_id,
                sub_category_id: body.sub_category_id,
                name: body.name,
                image: body.image || 'default.png',
                new_quantity: body.quantity,
            });

            await INSERT(`INSERT INTO tbl_inventory_item_stocks SET ?`, {
                inventory_item_id: inventory_item_id,
                ex_item_id: body.ex_item_id,
                store_location: body.store_location,
                quantity: body.quantity,
                unit_price: body.unit_price,
                total_price: body.total_price,
                size: body.size,
                supplier_name: body.supplier_name,
                supplier_location: body.supplier_location,
                average_life: body.average_life,
            });

            return sendResponse(req, res, 200, 1, { keyword: "created" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_create' });
        }
    },
    add_stock: async (req, res) => {
        let body = req.body;
        try {
            await INSERT(`INSERT INTO tbl_inventory_item_stocks SET ?`, {
                inventory_item_id: body.inventory_item_id,
                ex_item_id: body.ex_item_id,
                store_location: body.store_location,
                quantity: body.quantity,
                unit_price: body.unit_price,
                total_price: body.total_price,
                size: body.size,
                supplier_name: body.supplier_name,
                supplier_location: body.supplier_location,
                average_life: body.average_life
            });

            await UPDATE(`UPDATE tbl_inventory_items SET new_quantity = new_quantity + ${body.quantity} WHERE id = ${body.inventory_item_id}`);

            return sendResponse(req, res, 200, 1, { keyword: "added" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_add' });
        }
    },
    items_allocations: async (req, res) => {
        try {
            let body = req.body;
            let { inventory_item_id, rider_id, restaurant_id, received_date, quantity, status } = body;

            let type = '';
            if (status == 'new' || status == 'old') {
                type = 'allocate';
            } else if (status == 'recovered' || status == 'damaged') {
                type = 'recover';
            }

            let check_item = await SELECT.One(`SELECT new_quantity, old_quantity, (new_quantity + old_quantity) as available_quantity, recovered_quantity, damaged_quantity, allocated_quantity, recovered_quantity FROM tbl_inventory_items WHERE id = ${inventory_item_id}`, true, { no_data_msg: 'inventory_item_not_found' });

            if (status === 'new' && check_item.new_quantity < quantity) {
                return sendResponse(req, res, 200, 0, { keyword: "only_quantity_available", components: { quantity: String(check_item.new_quantity) } });
            }

            if (status === 'old' && check_item.old_quantity < quantity) {
                return sendResponse(req, res, 200, 0, { keyword: "only_quantity_available", components: { quantity: String(check_item.old_quantity) } });
            }

            let remaining_quantity = check_item.allocated_quantity;
            if (type === 'recover' && remaining_quantity < quantity) {
                if (remaining_quantity == 0) {
                    return sendResponse(req, res, 200, 0, { keyword: "all_allocated_items_recovered" });
                } else {
                    return sendResponse(req, res, 200, 0, { keyword: "only_quantity_recovery", components: { remaining_quantity: String(remaining_quantity) } });
                }
            }

            await INSERT(`INSERT INTO tbl_inventory_allocations SET ?`, {
                rider_id: rider_id,
                restaurant_id: restaurant_id,
                inventory_item_id: inventory_item_id,
                quantity: quantity,
                received_date: received_date,
                type: type,
                status: status
            });

            if (status === 'new') {
                await UPDATE(`UPDATE tbl_inventory_items SET new_quantity = new_quantity - ${quantity}, allocated_quantity = allocated_quantity + ${quantity} WHERE id = ${inventory_item_id}`);
                return sendResponse(req, res, 200, 1, { keyword: "inventory_item_allocated" });
            } else if (status === 'old') {
                await UPDATE(`UPDATE tbl_inventory_items SET old_quantity = old_quantity - ${quantity}, allocated_quantity = allocated_quantity + ${quantity}, recovered_quantity = recovered_quantity - ${quantity} WHERE id = ${inventory_item_id}`);
                return sendResponse(req, res, 200, 1, { keyword: "inventory_item_allocated" });
            } else if (status === 'recovered') {
                await UPDATE(`UPDATE tbl_inventory_items SET old_quantity = old_quantity + ${quantity}, recovered_quantity = recovered_quantity + ${quantity}, allocated_quantity = allocated_quantity - ${quantity} WHERE id = ${inventory_item_id}`);
                return sendResponse(req, res, 200, 1, { keyword: "inventory_item_recovered" });
            } else if (status === 'damaged') {
                await UPDATE(`UPDATE tbl_inventory_items SET damaged_quantity = damaged_quantity + ${quantity}, allocated_quantity = allocated_quantity - ${quantity} WHERE id = ${inventory_item_id}`);
                return sendResponse(req, res, 200, 1, { keyword: "inventory_item_recovered" });
            }
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed' });
        }
    },
    item_details: async (req, res) => {
        try {

            let { inventory_item_id, start_date, end_date } = req.body;

            let item = await SELECT.One(`select id as inventory_item_id, category_id, (select name from tbl_inventory_categories where id = i.category_id) as category_name, sub_category_id, (select name from tbl_inventory_sub_categories where id = i.sub_category_id) as sub_category_name, name, new_quantity + old_quantity as total_quantity, (select quantity from tbl_inventory_item_stocks where inventory_item_id = i.id order by id desc limit 1) as last_received_quantity, (select created_at from tbl_inventory_item_stocks where inventory_item_id = i.id order by id desc limit 1) as last_received_datetime, allocated_quantity, recovered_quantity, concat('${INVENTORY_IMAGE_PATH}', image) as image, created_at, updated_at from tbl_inventory_items as i WHERE i.id = ${inventory_item_id}`);

            let addWhere = '';
            if (start_date && end_date) addWhere += `AND received_date BETWEEN '${start_date}' AND '${end_date}' `;

            item.leaderBoard = await SELECT.All(`SELECT ia.id as allocation_id, ia.rider_id, concat(ru.first_name, ' ', ru.last_name) as rider_name, concat('${RIDER_IMAGE_PATH}', ru.profile_image) as rider_image, ru.ex_rider_id, (select r.name from tbl_restaurants as r where id = ia.restaurant_id) as restaurant_name, received_date, ia.quantity, (select average_life from tbl_inventory_item_stocks as ii where inventory_item_id = ia.inventory_item_id limit 1) as age, ia.status FROM tbl_inventory_allocations as ia JOIN tbl_rider_users as ru ON ia.rider_id = ru.id WHERE ia.inventory_item_id = ${inventory_item_id} ${addWhere} ORDER BY ia.id desc`, false);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, item);
        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    }
}

//////////////////////////////////////////////////////////////////////
//                             Tutorial                             //
//////////////////////////////////////////////////////////////////////

let tutorialModel = {
    add: async (req, res) => {
        let body = req.body;
        try {
            await INSERT(`INSERT INTO tbl_tutorials SET ?`, {
                title: body.title,
                description: body.description,
                visibility: body.visibility,
                file_name: body.file_name,
                file_extension: body.file_name.split('.').pop(),
                is_draft: body.is_draft || 0
            });

            return sendResponse(req, res, 200, 1, { keyword: "added" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_add' });
        }
    },

    edit: async (req, res) => {
        let body = req.body;
        try {
            await UPDATE(`UPDATE tbl_tutorials SET ? WHERE id = ${body.tutorial_id}`, {
                title: body.title,
                description: body.description,
                visibility: body.visibility,
                file_name: body.file_name,
                file_extension: body.file_name.split('.').pop(),
                is_draft: body.is_draft || 0
            });

            return sendResponse(req, res, 200, 1, { keyword: "edited" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_edit' });
        }
    },

    get: async (req, res) => {
        let { tutorial_id } = req.body;
        try {
            let tutorial = await SELECT.One(`SELECT id as tutorial_id, title, description, visibility, concat('${TUTORIAL_IMAGE_PATH}', file_name) as file_name, file_extension, is_draft, created_at FROM tbl_tutorials WHERE id = ${tutorial_id}`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, tutorial);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    list: async (req, res) => {
        try {
            let { type } = req.body;

            if (type === 'video') type = FILE_EXTENSIONS.video.map(ext => `'${ext}'`).join(', ');
            else if (type === 'presentation') type = FILE_EXTENSIONS.presentations.map(ext => `'${ext}'`).join(', ');
            else if (type === 'document') type = FILE_EXTENSIONS.documents.map(ext => `'${ext}'`).join(', ');

            let tutorials = await SELECT.All(`SELECT id as tutorial_id, title, description, visibility, concat('${TUTORIAL_IMAGE_PATH}', file_name) as file_name, file_extension, is_draft, created_at FROM tbl_tutorials WHERE file_extension in (${type}) ORDER BY created_at DESC`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, tutorials);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    delete: async (req, res) => {
        let { tutorial_id } = req.body;
        try {
            await DELETE(`DELETE FROM tbl_tutorials WHERE id = ${tutorial_id}`);

            return sendResponse(req, res, 200, 1, { keyword: "deleted" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_delete' });
        }
    }
}

//////////////////////////////////////////////////////////////////////
//                            Incentives                            //
//////////////////////////////////////////////////////////////////////

let incentivesModel = {
    get_incentive_plans: async (req, res) => {
        try {
            let { country } = req.loginUser;

            let plans = await SELECT.All(`SELECT id as plan_id, amount, criteria_ids, country, currency, is_active FROM tbl_rider_incentive_plans where country = '${country}' ORDER BY created_at ASC`);

            let criteria = await SELECT.All(`SELECT id as criteria_id, name FROM tbl_rider_incentive_criteria where country = '${country}' ORDER BY name ASC`);

            plans = plans.map(plan => {
                plan.criteria = criteria.filter(c => plan.criteria_ids.split(',').includes(String(c.criteria_id)));
                delete plan.criteria_ids;
                return plan;
            });

            return sendResponse(req, res, 200, 1, { keyword: "success" }, plans);
        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    get_criteria: async (req, res) => {
        let { country } = req.loginUser;
        try {
            let criteria = await SELECT.All(`SELECT id as criteria_id, name, is_active FROM tbl_rider_incentive_criteria where country = '${country}' ORDER BY name ASC`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, criteria);
        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    add_incentive_plan: async (req, res) => {
        let { admin_id, country } = req.loginUser;
        let { amount, criteria_ids } = req.body;
        try {
            await INSERT(`INSERT INTO tbl_rider_incentive_plans SET ?`, {
                amount: amount,
                criteria_ids: criteria_ids?.toString() || null,
                country: country,
                currency: (country == 'Uganda') ? 'UGX' : 'KES',
                created_by: admin_id
            });

            return sendResponse(req, res, 200, 1, { keyword: "added" });
        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_add' });
        }
    },
    edit_incentive_plan: async (req, res) => {
        let { admin_id } = req.loginUser;
        let { plan_id, amount, criteria_ids } = req.body;
        try {
            await UPDATE(`UPDATE tbl_rider_incentive_plans SET ? WHERE id = ${plan_id}`, {
                amount: amount,
                criteria_ids: criteria_ids?.toString() || null,
                updated_by: admin_id
            });

            return sendResponse(req, res, 200, 1, { keyword: "edited" });
        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_edit' });
        }
    },
    action: async (req, res) => {
        let { type, primary_id, value } = req.body;
        try {
            if (type === 'incentive_plans') {
                await UPDATE(`UPDATE tbl_rider_incentive_plans SET is_active = ${value} WHERE id = ${primary_id}`);
            } else if (type === 'incentive_criteria') {
                await UPDATE(`UPDATE tbl_rider_incentive_criteria SET is_active = ${value} WHERE id = ${primary_id}`);
            }

            return sendResponse(req, res, 200, 1, { keyword: "status_updated" });
        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_update_status' });
        }
    }
}

module.exports = {
    riderModel,
    inventoryModel,
    tutorialModel,
    incentivesModel
}