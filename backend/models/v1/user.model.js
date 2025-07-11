const { SELECT, INSERT, UPDATE, DELETE } = require('../../utils/SQLWorker');
const { sendResponse, checkRolePermissionInModel } = require('../../middleware');
const { USER_IMAGE_PATH, ADMIN_IMAGE_PATH, GIFT_CARD_IMAGE_PATH, RIDER_IMAGE_PATH, FEEDBACK_REVIEW_IMAGE_PATH, DRINKS_DESSERTS_CHOICE_CATEGORY_IDS, USER_COLOR_CODES, OTHER_IMAGE_PATH, CAMPAIGN_EVENTS_MEDIA_PATH } = require('../../config/constants');
const _ = require('lodash');

let userModel = {
    user_details: async (req, res) => {
        try {
            let { user_id } = req.body;

            let user = await SELECT.One(`SELECT *, (select name from tbl_admin_users_color_codes as aucc where id = tbl_users.user_color_code_id) as user_color_type_name FROM tbl_users WHERE id = ${user_id}`);
            user.device_details = await SELECT.One(`SELECT id as device_id, device_name, device_type FROM tbl_user_device WHERE user_id = ${user_id}`, false);
            user.profile_image = (user.profile_image && user.profile_image != '') ? USER_IMAGE_PATH + user.profile_image : USER_IMAGE_PATH + 'default.png';
            user = { user_id: user.id, ...user };

            // check if user is premium or not
            let premium_user = await SELECT.All(`SELECT id FROM tbl_user_buy_membership WHERE user_id = ${user_id} AND is_active = 1`, false);

            user.is_premium_membership = premium_user?.length > 0 ? 1 : 0;
            delete user.id;

            let allergy_ids = user?.allergy_ids?.split(',') || [];

            user.allergies = allergy_ids?.length > 0 ? await SELECT.All(`SELECT id as allergy_id, name FROM tbl_allergies WHERE id in (${user?.allergy_ids})`, false) : [];

            user.red_flags = await SELECT.All(`SELECT urf.id as red_flag_id, urf.reason, au.id as admin_id, case when role_created_by = 'admin' then au.name when role_created_by in ('agent_admin', 'agent') then aau.name else 'N/A' end as admin_name, case when role_created_by = 'admin' then concat('${ADMIN_IMAGE_PATH}', au.profile_image) when role_created_by in ('agent_admin', 'agent') then concat('${ADMIN_IMAGE_PATH}', aau.profile_image) else 'N/A' end as admin_profile_image, urf.created_at FROM tbl_user_red_flags urf LEFT JOIN tbl_admin_users au ON urf.created_by = au.id LEFT JOIN tbl_agentadmin_users aau ON urf.created_by = aau.id where urf.user_id = ${user_id}`, false);

            user.loyalty_points = await SELECT.One(`SELECT sum(total_loyalty_points) + (select SUM(points) from tbl_loyalty_point_transaction where user_id = u.id And type = 'redeem') as total_points_earned, (select SUM(points) from tbl_loyalty_point_transaction where user_id = u.id And type = 'redeem') as total_points_redeemed, sum(total_loyalty_points) as total_points_balance from tbl_users as u where id = ${user_id}`, false);

            user.gift_card = await SELECT.One(`SELECT SUM(if(is_fully_redeem = 0, 1, 0)) as available, SUM(if(is_fully_redeem = 0, remaining_amount, 0)) as available_amount, SUM(if(is_fully_redeem = 1, amount - remaining_amount, 0)) as redeemed FROM tbl_gift_card_purchase where user_id = ${user_id}`, false);

            let types = await SELECT.One(`SELECT * FROM tbl_user_service_and_payment_types WHERE user_id = ${user_id}`, false);

            user.payment_types = {
                "credit_card": types?.credit_card !== undefined ? types.credit_card : 1,
                "airtel_money": types?.airtel_money !== undefined ? types.airtel_money : 1,
                "momo_pay": types?.momo_pay !== undefined ? types.momo_pay : 1,
                "cash": types?.cash !== undefined ? types.cash : 1,
                "wallet": types?.wallet !== undefined ? types.wallet : 1
            }
            user.service_types = {
                "delivery": types?.delivery !== undefined ? types.delivery : 1,
                "carhop": types?.carhop !== undefined ? types.carhop : 1,
                "pick_up": types?.pick_up !== undefined ? types.pick_up : 1,
                "dine_in": types?.dine_in !== undefined ? types.dine_in : 1
            }


            return sendResponse(req, res, 200, 1, { keyword: "success" }, user);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || "failed_to_fetch" });
        }
    },
    user_color_codes_list: async (req, res) => {
        try {
            let { country } = req.loginUser;

            let list = await SELECT.All(`SELECT id as user_color_code_id, name, color_code FROM tbl_admin_users_color_codes Where is_active = 1 AND is_delete = 0 AND country in ('${country}', 'all')`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, list);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || "failed_to_fetch" });
        }
    },
    user_list: async (req, res) => {
        try {
            let { user_color_code_id, start_date, end_date } = req.body;

            let addWhere = '';
            if (user_color_code_id) {
                addWhere = ` AND user_color_code_id = ${user_color_code_id}`;
            }

            if (start_date && end_date) {
                addWhere += ` AND created_at BETWEEN '${start_date}' AND '${end_date}'`;
            }

            let list = await SELECT.All(`SELECT id as user_id, concat(first_name, ' ', last_name) as full_name, created_at, concat(country_code, ' ', phone) as mobile, email, (select name from tbl_admin_users_color_codes where id = tbl_users.user_color_code_id) as user_type, (select color_code from tbl_admin_users_color_codes where id = tbl_users.user_color_code_id) as user_type_color_code, concat('${USER_IMAGE_PATH}', if(profile_image IS NULL OR profile_image = '', 'default.png', profile_image)) as profile_image, is_verify, 0 as is_premium_user, IFNULL((select device_type from tbl_user_device where user_id = tbl_users.id limit 1), 'A') as device_type FROM tbl_users where is_guest_user = 0 AND signup_step = 'PERSONAL_INFO' AND is_delete = 0 ${addWhere} order by created_at desc`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, list);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || "failed_to_fetch" });
        }
    },
    user_action: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { type, value, user_id } = req.body;

            switch (type) {
                case 'soft_delete_user':

                    await checkRolePermissionInModel(admin_id, "customers", "delete");

                    // get order list which are currently active
                    let orderCheck = await SELECT.All(`SELECT * FROM tbl_order WHERE user_id = ${user_id} AND order_status NOT IN ('delivered', 'completed', 'cancelled') AND is_active = 1 AND is_delete = 0`, false);

                    if (orderCheck.length > 0) {
                        return sendResponse(req, res, 200, 0, { keyword: "pending_order_to_delivered", components: {} });
                    }

                    await DELETE(`DELETE FROM tbl_user_device WHERE user_id = ${user_id}`);
                    await UPDATE(`UPDATE tbl_users SET ? WHERE id = ${user_id}`, { is_delete: 1 });
                case 'delete_forever_user':

                    await checkRolePermissionInModel(admin_id, "customers", "delete");

                    // get order list which are currently active
                    let orderList = await SELECT.All(`SELECT * FROM tbl_order WHERE user_id = ${user_id} AND order_status NOT IN ('delivered', 'completed', 'cancelled') AND is_active = 1 AND is_delete = 0`, false);

                    if (orderList.length > 0) {
                        return sendResponse(req, res, 200, 0, { keyword: "pending_order_to_delivered", components: {} });
                    }

                    await DELETE(`DELETE FROM tbl_user_device WHERE user_id = ${user_id}`);
                    await DELETE(`DELETE FROM tbl_users WHERE id = ${user_id}`);

                    break;
                case 'language_update':

                    await checkRolePermissionInModel(admin_id, "customers", "edit");

                    await UPDATE(`UPDATE tbl_users SET ? WHERE id = ${user_id}`, { preferred_language: value });
                    break;
                case 'tin_number':
                    await checkRolePermissionInModel(admin_id, "customers", "edit");
                    await UPDATE(`UPDATE tbl_users SET ? WHERE id = ${user_id}`, { tin_number: value });
                    break;
                case 'block':
                    await checkRolePermissionInModel(admin_id, "customers", "edit");
                    await UPDATE(`UPDATE tbl_users SET ? WHERE id = ${user_id}`, { is_active: value });
                    await UPDATE(`UPDATE tbl_users SET user_color_code_id = ${(value == 0) ? USER_COLOR_CODES.BLOCKED : USER_COLOR_CODES.NEW} WHERE id = ${user_id}`);
                    break;
                case 'customer_type':
                    await checkRolePermissionInModel(admin_id, "customers", "edit");
                    await UPDATE(`UPDATE tbl_users SET ? WHERE id = ${user_id}`, { user_color_code_id: value });
                    break;
                case 'loyalty_point_switch':
                    await checkRolePermissionInModel(admin_id, "customers", "edit");
                    await UPDATE(`UPDATE tbl_users SET ? WHERE id = ${user_id}`, { loyalty_point_switch: value });
                    break;
                case 'payment_type':
                case 'service_type':
                    await checkRolePermissionInModel(admin_id, "customers", "edit");
                    await UPDATE(`UPDATE tbl_user_service_and_payment_types SET ${value.type} = ${value.value} WHERE user_id = ${user_id}`);
                    break;
                case 'add_condition':
                    await checkRolePermissionInModel(admin_id, "customers", "edit");
                    await UPDATE(`UPDATE tbl_users SET ? WHERE id = ${user_id}`, { allergy_ids: value.length > 0 ? value.join(',') : null });
                    break;
                case 'add_red_flag':
                    await checkRolePermissionInModel(admin_id, "customers", "edit");
                    await INSERT(`INSERT INTO tbl_user_red_flags SET ?`, { user_id, reason: value, created_by: admin_id, role_created_by: 'admin' });
                    await UPDATE(`UPDATE tbl_users SET user_color_code_id = ${USER_COLOR_CODES.RED_FLAG} WHERE id = ${user_id}`);
                    break;
                case 'edit_user':
                    await checkRolePermissionInModel(admin_id, "customers", "edit");

                    let { first_name, last_name, email, country_code, phone } = value;

                    let check = await SELECT.All(`SELECT id FROM tbl_users WHERE country_code = '${country_code}' AND phone = '${phone}' AND id != ${user_id}`, false);

                    if (check.length > 0) {
                        return sendResponse(req, res, 200, 0, { keyword: "phone_exist" });
                    }

                    await UPDATE(`UPDATE tbl_users SET ? WHERE id = ${user_id}`, value, {
                        first_name, last_name, email, country_code, phone
                    });

                    break;
                case 'add_comment':
                    await checkRolePermissionInModel(admin_id, "customers", "edit");

                    let { alert_to, title, description } = value;

                    await INSERT(`INSERT INTO tbl_admin_users_comments SET ?`, { user_id, alert_to: alert_to == 'branch' ? "restaurant" : alert_to, title, description, created_by: admin_id, role_created_by: 'admin' });

                    break;
                case 'comment_status_update':
                    await checkRolePermissionInModel(admin_id, "customers", "edit");

                    let { comment_id, status } = value;

                    let update_data = {
                        status: status,
                        resolved_by: null
                    };

                    if (status == 'resolved') {
                        resolved_by = admin_id;
                    }

                    await UPDATE(`UPDATE tbl_admin_users_comments SET ? WHERE id = ${comment_id}`, update_data);

                    break;
                case 'address_delete':
                    await checkRolePermissionInModel(admin_id, "customers", "delete");

                    await UPDATE(`UPDATE tbl_user_delivery_address SET ? WHERE id = ${value}`, { is_delete: 1 });

                    break;
                case 'address_update':
                    await checkRolePermissionInModel(admin_id, "customers", "edit");

                    let request = value;

                    await UPDATE(`UPDATE tbl_user_delivery_address SET ? WHERE id = ${request.delivery_address_id}`, {
                        delivery_type: request.delivery_type,
                        delivery_address: request.delivery_address || '',
                        delivery_flat: request.delivery_flat || '',
                        delivery_area: request.delivery_area || '',
                        delivery_landmark: request.delivery_landmark || '',
                        delivery_latitude: request.delivery_latitude || '',
                        delivery_longitude: request.delivery_longitude || '',
                        delivery_instruction: request.delivery_instruction || '',
                        delivery_city: request.delivery_city || '',
                        delivery_state: request.delivery_state || '',
                        delivery_country: request.delivery_country || '',
                    });

                    // if (request.pref_arr.length > 0) {

                    //     await DELETE(`DELETE FROM tbl_user_delivery_preference address_id = '${request.delivery_address_id}' `);

                    //     asyncLoop(request.pref_arr, async (item, next) => {
                    //         await INSERT(`INSERT INTO tbl_user_delivery_preference SET ?`, {
                    //             address_id: request.delivery_address_id,
                    //             preference_id: item.preference_id,
                    //             media_file: item.media_file || '',
                    //             media_type: item.media_type || '',
                    //             media_duration: item.media_duration || '',
                    //         });
                    //         next();
                    //     });
                    // }

                    break;
                case 'address_add':
                    await checkRolePermissionInModel(admin_id, "customers", "edit");
                    let add_request = value;

                    let service_id = await INSERT(`INSERT INTO tbl_user_select_service SET ?`, {
                        user_id: user_id,
                        service_type: 'delivery',
                        order_type: 'order_now'
                    });

                    let db_address_id = await INSERT(`INSERT INTO tbl_user_delivery_address SET ?`, {
                        user_id: user_id,
                        service_id: service_id,
                        delivery_type: add_request.delivery_type,
                        delivery_address: add_request.delivery_address || '',
                        delivery_flat: add_request.delivery_flat || '',
                        delivery_area: add_request.delivery_area || '',
                        delivery_landmark: add_request.delivery_landmark || '',
                        delivery_latitude: add_request.delivery_latitude || '',
                        delivery_longitude: add_request.delivery_longitude || '',
                        delivery_instruction: add_request.delivery_instruction || '',
                        delivery_city: add_request.delivery_city || '',
                        delivery_state: add_request.delivery_state || '',
                        delivery_country: add_request.delivery_country || ''
                    });

                    // if (request.pref_arr.length > 0) {
                    //     asyncLoop(request.pref_arr, async (item, next) => {
                    //         await INSERT(`INSERT INTO tbl_user_delivery_preference SET ?`, {
                    //             address_id: db_address_id,
                    //             preference_id: item.preference_id,
                    //             media_file: item.media_file || '',
                    //             media_type: item.media_type || '',
                    //             media_duration: item.media_duration || '',
                    //         });
                    //         next();
                    //     });
                    // }

                    await UPDATE(`UPDATE tbl_user_select_service SET ? WHERE id = ${service_id}`, {
                        delivery_id: db_address_id,
                    });

                    break;
                case 'add_customer':
                    await checkRolePermissionInModel(admin_id, "customers", "edit");

                    let { first_name: add_first_name, last_name: add_last_name, email: add_email, country_code: add_country_code, phone: add_phone } = value;

                    let check_phone = await SELECT.All(`SELECT id FROM tbl_users WHERE country_code = '${add_country_code}' AND phone = '${add_phone}'`, false);

                    if (check_phone.length > 0) {
                        return sendResponse(req, res, 200, 0, { keyword: "phone_exist" });
                    }

                    await INSERT(`INSERT INTO tbl_users SET ?`, {
                        first_name: add_first_name,
                        last_name: add_last_name,
                        email: add_email,
                        country_code: add_country_code,
                        phone: add_phone,
                        country_name: req.loginUser.country,
                        currency_name: req.loginUser.currency
                    });
                    break;
                case 'remove_cancellation_dues':
                    await checkRolePermissionInModel(admin_id, "customers", "edit");
                    await UPDATE(`UPDATE tbl_order_cancellations SET is_removed = 1, removed_by = ${admin_id}, removed_at = now() WHERE id = ${value}`);
                    break;
                default:
                    break;
            }

            return sendResponse(req, res, 200, 1, { keyword: "success" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed' });
        }
    },
    order_list: async (req, res) => {
        try {
            let { user_id } = req.body;

            let list = await SELECT.All(`SELECT id as order_id, order_no, order_date_time, payment_method, transaction_id, service_type, order_status from tbl_order where user_id = ${user_id} AND admin_action_by != 'rejected' order by order_date_time desc`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, list);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || "failed_to_fetch" });
        }
    },
    user_get_details: async (req, res) => {
        try {
            let { user_id, type, value } = req.body;

            let data = [];
            switch (type) {
                case 'gift_card_history':

                    let { country_code, phone } = await SELECT.One(`SELECT country_code, phone FROM tbl_users WHERE id = ${user_id}`);

                    data = await SELECT.All(`SELECT o.order_no AS order_no, o.order_date_time AS order_date_time, tgcp.remaining_amount AS remaining_amount, tgcuh.usage_amount AS amount, tgcuh.created_at AS created_at, 'debit' AS type, NULL AS gift_card_name, NULL AS user_name, NULL AS user_phone FROM tbl_gift_card_usage_histroy tgcuh JOIN tbl_gift_card_purchase tgcp ON tgcuh.gift_id = tgcp.id LEFT JOIN tbl_order AS o ON tgcuh.order_id = o.id WHERE tgcuh.user_id = ${user_id} UNION ALL SELECT NULL AS order_no, NULL AS order_date_time, 0 AS remaining_amount, gcp.amount AS amount, gcp.created_at AS created_at, 'credit' AS type, gca.name AS gift_card_name, CONCAT(u.first_name, ' ', u.last_name) AS user_name, u.phone AS user_phone FROM tbl_gift_card_purchase AS gcp JOIN tbl_users AS u ON gcp.user_id = u.id JOIN tbl_gift_card_admin AS gca ON gcp.gift_card_id = gca.id WHERE receiver_country_code = '${country_code}' AND receiver_phone_number = '${phone}' ORDER BY created_at DESC;`);

                    break;
                case 'reward_point_history':

                    throw new Error('no_data');

                    break;
                case 'wallet_history':

                    let { currency_name } = await SELECT.One(`SELECT currency_name FROM tbl_users WHERE id = ${user_id}`);

                    data = await SELECT.All(`SELECT id as transaction_id, type, if(type = 'place_order', reference_id, null) as order_id, if(type = 'place_order', (select order_no from tbl_order as o where o.id = tbl_user_wallet_transaction_history.reference_id), null) as order_no, transaction_type, wallet_amount as amount, '${currency_name}' as currency_name, payment_method, created_at From tbl_user_wallet_transaction_history where payment_status = 'paid' and user_id = ${user_id}`);

                    break;
                case 'credit_history_pop_up':

                    throw new Error('no_data');

                    break;
                case 'red_flag_history':

                    data = await SELECT.All(`SELECT urf.id as red_flag_id, urf.reason, au.id as admin_id, case when role_created_by = 'admin' then au.name when role_created_by in ('agent_admin', 'agent') then aau.name else 'N/A' end as admin_name, case when role_created_by = 'admin' then concat('${ADMIN_IMAGE_PATH}', au.profile_image) when role_created_by in ('agent_admin', 'agent') then concat('${ADMIN_IMAGE_PATH}', aau.profile_image) else 'N/A' end as admin_profile_image, urf.created_at FROM tbl_user_red_flags urf LEFT JOIN tbl_admin_users au ON urf.created_by = au.id LEFT JOIN tbl_agentadmin_users aau ON urf.created_by = aau.id where urf.user_id = ${user_id}`);

                    break;
                case 'get_address':
                    data = await SELECT.One(`SELECT id as user_address_id, user_id, delivery_type, delivery_address, delivery_flat, delivery_area, delivery_landmark, delivery_latitude, delivery_longitude, delivery_instruction, delivery_city, delivery_state, delivery_country FROM tbl_user_delivery_address WHERE user_id = ${user_id} AND id = ${value} AND is_active = 1 AND is_delete = 0`);
                    break;
                case 'address_book':

                    data = await SELECT.All(`SELECT id as user_address_id, user_id, (select concat(first_name, ' ', last_name) from tbl_users where id = tbl_user_delivery_address.user_id) as user_name, delivery_type, TRIM(BOTH ', ' FROM REPLACE(CONCAT( delivery_flat, ', ', delivery_area, ', ', delivery_landmark, ', ', delivery_city, ', ', delivery_state, ', ', delivery_country ), ', ,', ',')) AS full_address FROM tbl_user_delivery_address WHERE user_id = ${user_id} AND is_active = 1 AND is_delete = 0 ORDER BY created_at DESC;`);

                    break;
                case 'complaint_feedback':

                    data = await SELECT.All(`select tf.id as feedback_id, o.id as order_id, o.order_no, o.service_type, o.order_date_time, tf.feedback_field_id, (select name from tbl_feedback_fields where id = tf.feedback_field_id) as feedback_field, tf.comment, tf.media from tbl_feedback as tf join tbl_order as o on tf.order_id = o.id where tf.user_id = ${user_id}`);

                    let allFeedbackIds = [];

                    data = data?.map(item => {
                        allFeedbackIds.push(item.feedback_field_id);
                        item.media = item.media?.map(media => FEEDBACK_REVIEW_IMAGE_PATH + media) || [];
                        return item;
                    });

                    let feedbackQuestions = await SELECT.All(`select id as rating_id, feedback_id, (select question from tbl_feedback_questions where id = fr.feedback_question_id) as feedback_question, fr.rating from tbl_feedback_ratings as fr where feedback_id in (${allFeedbackIds})`);

                    data = data.map(item => {
                        item.ratings = feedbackQuestions.filter(feedback => feedback.feedback_id == item.feedback_id);
                        return item;
                    });

                    break;
                case 'rating_review_history':

                    data = await SELECT.All(`select o.id as order_id, o.order_no, o.service_type, tor.comment, tor.rating, tor.created_at from tbl_order_review as tor join tbl_order as o on tor.order_id = o.id where tor.user_id = ${user_id}`);

                    break;
                case 'comment_history':

                    data = await SELECT.All(`SELECT id as comment_id, (case when role_created_by = 'admin' then (select name from tbl_admin_users where id = tbl_admin_users_comments.created_by) when role_created_by in ('agent_admin', 'agent') then (select name from tbl_agentadmin_users where id = tbl_admin_users_comments.created_by) else 'N/A' end) as created_by, alert_to, title, description, status, created_at FROM tbl_admin_users_comments where user_id = ${user_id}`);

                    break;
                case 'logged_in_devices':
                    data = await SELECT.All(`SELECT id as device_id, user_id, device_name, device_type, model_name, os_version, app_version, time_zone, created_at FROM tbl_user_device WHERE user_id = ${user_id} ORDER BY created_at DESC`);
                    break;
                case 'order_preferences':
                    data = await SELECT.All(`select id as menu_item_id, name, (select count(id) from tbl_order_items where user_id = ${user_id} AND menu_item_id = mi.id) as orders, if(mi.category_id in (select id from tbl_categories where is_active=1 AND is_delete = 0 AND (is_drink = 1 OR is_dessert = 1)), 1, 0) as is_drink_and_desert, if((select id from tbl_user_saved_items where user_id = ${user_id} AND menu_item_id = mi.id), 1, 0) as is_saved from tbl_menu_items as mi where mi.is_delete = 0 HAVING orders > 0 ORDER BY orders DESC, mi.name ASC;`, false);

                    data = {
                        "food_items": data.filter(item => item.is_drink_and_desert == 0),
                        "drinks_and_deserts": data.filter(item => item.is_drink_and_desert == 1),
                        "saved_items": data.filter(item => item.is_saved == 1)
                    }

                    //remove unwanted keys using lodash
                    data = _.mapValues(data, function (value) {
                        return _.map(value, _.partialRight(_.pick, ['menu_item_id', 'name', 'orders']));
                    });

                    break;
                case 'notification_list':
                    data = await SELECT.All(`SELECT tn.*, CONVERT(tn.body USING utf8mb4) as body, CASE WHEN tn.ref_tbl_name = 'gift_card' THEN IF(tn.image IS NULL OR tn.image = '', '', CONCAT('${GIFT_CARD_IMAGE_PATH}', tn.image)) WHEN tn.tag = 'admin_notification' THEN IF(tn.image IS NULL OR tn.image = '', '', CONCAT('${OTHER_IMAGE_PATH}', tn.image)) WHEN tn.tag = 'campaign_notification' THEN IF(tn.image IS NULL OR tn.image = '', '', CONCAT('${CAMPAIGN_EVENTS_MEDIA_PATH}', tn.image)) ELSE '' END AS image, DATE(tn.created_at) as date, CASE WHEN tn.sender_type = 'customer' THEN CONCAT(tu.first_name, ' ', tu.last_name) WHEN tn.sender_type = 'rider' THEN CONCAT(ru.first_name, ' ', ru.last_name) WHEN tn.sender_type = 'admin' THEN au.name ELSE '' END AS sender_name, CASE WHEN tn.sender_type = 'customer' THEN CONCAT('${USER_IMAGE_PATH}', IF(tu.profile_image IS NULL OR tu.profile_image = '', 'default.png', tu.profile_image)) WHEN tn.sender_type = 'rider' THEN CONCAT('${RIDER_IMAGE_PATH}', IF(ru.profile_image IS NULL OR ru.profile_image = '', 'default.png', ru.profile_image)) WHEN tn.sender_type = 'admin' THEN CONCAT('${ADMIN_IMAGE_PATH}', IF(au.profile_image IS NULL OR au.profile_image = '', 'default.png', au.profile_image)) ELSE '' END AS profile_image FROM tbl_notif_users as tn LEFT JOIN tbl_users as tu ON tn.sender_id = tu.id AND tn.sender_type = 'customer' LEFT JOIN tbl_rider_users as ru ON tn.sender_id = ru.id AND tn.sender_type = 'rider' LEFT JOIN tbl_admin_users as au ON tn.sender_id = au.id AND tn.sender_type = 'admin' WHERE tn.receiver_id = ${user_id} AND tn.receiver_type = 'customer' ORDER BY tn.created_at DESC`);
                    break;
                case 'cancellation_dues':
                    data = await SELECT.All(`select id as cancellation_due_id, order_id, (select tbl_order.order_no from tbl_order where tbl_order.id = oc.order_id) as order_no, cancellation_amount as amount, (select tbl_order.currency from tbl_order where tbl_order.id = oc.order_id) as currency, created_at from tbl_order_cancellations as oc where user_id = ${user_id} AND is_removed = 0`);
                    break;
                default:
                    throw new Error('no_data');
                    break;
            }

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || "failed_to_fetch" });
        }
    },
    deleted_users_list: async (req, res) => {
        try {
            let list = await SELECT.All(`SELECT id as user_id, concat(first_name, ' ', last_name) as full_name, created_at, concat(country_code, ' ', phone) as mobile, concat('${USER_IMAGE_PATH}', ifnull(profile_image, 'default.png')) as profile_image, 0 as is_premium_user, 1 as verified, (select device_type from tbl_user_device where user_id = tbl_users.id limit 1) as device_type FROM tbl_users where is_delete = 1 order by created_at desc`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, list);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || "failed_to_fetch" });
        }
    },
    send_notification: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { mode, user_id, send_date, send_time, send_utc_datetime, media_name = null, title, description } = req.body;

            await INSERT('INSERT INTO tbl_notif_admin_sent_init SET ?', {
                title,
                description,
                send_date,
                send_time,
                send_utc_datetime,
                mode,
                user_type: "Single Device",
                media_name,
                notif_filter_id: null,
                notif_sub_filter_id: null,
                notif_filter_value: user_id,
                excel_sheet_name: null,
                created_by: admin_id,
                is_send_internal: 1,
                internal_type: "single_user"
            });

            return sendResponse(req, res, 200, 1, { keyword: "success" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || "failed_to_fetch" });
        }
    }
}

module.exports = userModel;