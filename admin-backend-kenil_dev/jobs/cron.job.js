const { SELECT, UPDATE, INSERT } = require('../utils/SQLWorker');
const { USER_COLOR_CODES } = require('../config/constants');
const each = require('async-each');
const moment = require('moment');
const { LOYALTY_SETTING_KEY } = require('../config/constants');
const sendPush = require('../utils/configNotification');
const { sendNotificationJob } = require('./notification.job');

const cronJobs = {
    mark_prepared: async () => {
        try {
            let orders = await SELECT.All(`SELECT id FROM tbl_order WHERE order_status = 'in_preparation' AND restaurant_status = 'in_preparation'`, false);

            each(orders, async (order, next) => {

                await UPDATE(`UPDATE tbl_order SET preparation_time = now(), restaurant_status = 'in_packaging' WHERE id = ${order.id}`);

                next();
            });
            return true;
        }
        catch (err) {
            return false;
        }
    },

    mark_packaged: async () => {
        try {
            setTimeout(async () => {
                let orders = await SELECT.All(`SELECT id FROM tbl_order WHERE order_status = 'in_preparation' AND restaurant_status = 'in_packaging'`, false);

                each(orders, async (order, next) => {
                    await UPDATE(`UPDATE tbl_order SET packaging_time = now(), restaurant_status = 'is_packaged' WHERE id = ${order.id}`);
                    next();
                });
            }, 500);
            return true;
        }
        catch (err) {
            return false;
        }
    },

    assign_delivery_rider: async () => {
        try {
            setTimeout(async () => {
                let orders = await SELECT.All(`SELECT id, service_type FROM tbl_order WHERE order_status = 'in_preparation' AND restaurant_status = 'is_packaged'`, false);

                each(orders, async (order, next) => {

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

                    next();
                });
            }, 1000);
            return true;
        }
        catch (err) {
            return false;
        }
    },

    mark_as_completed: async () => {
        try {
            setTimeout(async () => {
                let orders = await SELECT.All(`SELECT id, service_type FROM tbl_order WHERE order_status in ('out_for_delivery', 'ready_for_pick_up', 'ready_for_serve')`, false);

                each(orders, async (order, next) => {

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

                    next();
                });

            }, 1200);

            return true;
        }
        catch (err) {
            return false;
        }
    },

    scheduled_order_process: async () => {
        try {
            let orders = await SELECT.All(`select o.id, o.service_type, o.service_id, o.user_id, o.order_no, concat(uss.schedule_date, ' ', uss.schedule_time) as schedule_time from tbl_order o join tbl_user_select_service uss on o.service_id = uss.id where o.admin_approval_status = 'approved' AND o.order_status = 'accepted' AND o.payment_status = 'paid' AND uss.order_type = 'schedule_order' AND TIMESTAMPDIFF(MINUTE, now(), CONCAT(uss.schedule_date, ' ', uss.schedule_time)) < 60`);

            each(orders, (order, next) => {

                UPDATE(`UPDATE tbl_order SET service_time = ?, preparation_start_time = NOW(), order_status = ?, restaurant_status = ? WHERE id = ?`, [
                    order.schedule_time,
                    'in_preparation',
                    'in_preparation',
                    order.id
                ]).then(() => {
                    // Schedule Delivery Reminder
                    let push_params = {
                        sender_id: 0,
                        sender_type: "system",
                        receiver_id: order.user_id,
                        receiver_type: "customer",
                        title: "Delivery Reminder",
                        body: `Your order #${order.order_no} is scheduled for delivery soon! Get ready to enjoy your delicious meal. 🚀🍕🍔`,
                        tag: "order_delivery_schedule_reminder",
                        is_read: 0,
                        is_insert: 1,
                        image_url: null,
                        image: null,
                        ref_id: order.id,
                        ref_tbl_name: "order",
                    };


                    let push_params_preparation = {
                        sender_id: 0,
                        sender_type: "system",
                        receiver_id: order.user_id,
                        receiver_type: "customer",
                        title: `Your order is being prepared`,
                        body: `Your order is in the kitchen`,
                        tag: "order_in_preparation",
                        is_read: 0,
                        is_insert: 1,
                        image_url: null,
                        image: null,
                        ref_id: order.id,
                        ref_tbl_name: "order",
                        other_data: {
                            "service_type": order.service_type,
                            "service_id": order.service_id,
                            "order_no": order.order_no
                        }
                    };

                    setTimeout(() => {
                        sendPush(push_params_preparation);
                        sendPush(push_params);
                    }, 1000);
                }).catch(() => { });

                next();
            });

            return true;
        }
        catch (err) {
            return false;
        }
    },

    loyalty_points_release: async () => {
        try {
            let Orders = await SELECT.All(`select o.id as order_id, o.order_no, o.user_id, (o.sub_total - o.loyalty_point) as order_total, 'gold' as plan_type, u.gender, ifnull(u.date_of_birth, CURRENT_DATE) as date_of_birth, u.country_name as country from tbl_order as o join tbl_users as u on o.user_id = u.id where o.admin_approval_status = 'approved' AND o.is_loyalty_credited = 0 AND o.order_status not in ('cancelled', 'pending') AND TIMESTAMPDIFF (MINUTE, admin_action_time, now()) >= 120`);

            let loyalty_criteria = await SELECT.All(`select id as criteria_id, multiply, customer_type, country, gender_type, customer_type from tbl_loyalty_point_criteria where is_active = 1`);

            each(Orders, async (order, next) => {
                try {
                    let user_details = {
                        user_id: order.user_id,
                        plan_type: order.plan_type,
                        gender: order.gender,
                        date_of_birth: order.date_of_birth,
                        country: order.country
                    }

                    let { setting_value } = await SELECT.One(`select setting_value from tbl_app_setting where setting_key = '${LOYALTY_SETTING_KEY}' AND country_name = '${user_details.country}'`);

                    let country_criteria = loyalty_criteria.filter(criteria => criteria.country == user_details.country);

                    let is_all_2x = country_criteria.find(criteria => criteria.customer_type == 'all' && criteria.multiply == 2 && criteria.gender_type == 'all');
                    let is_all = country_criteria.find(criteria => criteria.customer_type == 'all' && criteria.multiply == 1 && criteria.gender_type == 'all');
                    let is_woman = country_criteria.find(criteria => criteria.gender_type == 'woman' && user_details.gender == 'female');
                    let is_membership = country_criteria.find(criteria => criteria.customer_type == user_details.plan_type);

                    let multiply = 0;
                    let applied_criteria = null;
                    if (is_all_2x) {
                        multiply = is_all_2x.multiply;
                        applied_criteria = is_all_2x.criteria_id;
                    } else if (is_woman) {
                        if (user_details.date_of_birth && moment().diff(user_details?.date_of_birth, 'years') >= 30) {
                            multiply = is_woman.multiply;
                            applied_criteria = is_woman.criteria_id;
                        } else if (is_all) {
                            multiply = is_all.multiply;
                            applied_criteria = is_all.criteria_id;
                        }
                    } else if (is_membership) {
                        multiply = is_membership.multiply;
                        applied_criteria = is_membership.criteria_id;
                    } else if (is_all) {
                        multiply = is_all.multiply;
                        applied_criteria = is_all.criteria_id;
                    }

                    if (multiply > 0 && applied_criteria != null) {
                        let order_value = (Number(order.order_total) * Number(setting_value?.max_credit_percentage)) / 100;
                        let loyalty_point = ((Number(order_value) * Number(multiply)) * Number(setting_value.point_value)).toFixed();
                        let expiry_date = moment().add(setting_value.expiry_day, 'days').format('YYYY-MM-DD');

                        if (loyalty_point > 0) {
                            await INSERT(`INSERT INTO tbl_loyalty_point_transaction SET ?`, {
                                user_id: order.user_id,
                                order_id: order.order_id,
                                points: Number(loyalty_point),
                                expiry_date: expiry_date,
                                type: "receive",
                                country: user_details.country,
                                criteria_id: applied_criteria
                            });
                            await UPDATE(`UPDATE tbl_users SET total_loyalty_points = total_loyalty_points + ${Number(loyalty_point)} WHERE id = ${order.user_id}`);

                            // customer received loyalty points for any order.
                            let push_params = {
                                sender_id: 0,
                                sender_type: "system",
                                receiver_id: order.user_id,
                                receiver_type: "customer",
                                title: "Loyalty Points Received",
                                body: `You have received ${loyalty_point} loyalty points for your order #${order.order_no}.`,
                                tag: "loyalty_points_earned",
                                is_read: 0,
                                is_insert: 1,
                                image_url: null,
                                image: null,
                                ref_id: order.order_id,
                                ref_tbl_name: "order",
                            };

                            setTimeout(() => {
                                sendPush(push_params);
                            }, 1000);
                        }

                        await UPDATE(`UPDATE tbl_order SET is_loyalty_credited = 1 WHERE id = ${order.order_id}`);

                        next();
                    } else {
                        await UPDATE(`UPDATE tbl_order SET is_loyalty_credited = 1 WHERE id = ${order.order_id}`);

                        next();
                    }
                }
                catch (err) {
                    next();
                }
            }, (err) => { });

            return true;

        } catch (err) {
            return false;
        }
    },

    user_inactive_check: async () => {
        try {
            let users = await SELECT.All(`SELECT DISTINCT user_id FROM tbl_order WHERE order_status = 'completed' AND order_date_time < DATE_ADD(NOW(), INTERVAL -90 DAY) AND created_at < DATE_ADD(NOW(), INTERVAL -90 DAY);`);

            await UPDATE(`UPDATE tbl_users SET user_color_code_id = ${USER_COLOR_CODES.INACTIVE} WHERE id IN (${users.map(user => user.user_id)})`);

            return true;
        } catch (err) {
            return false;
        }
    },

    check_notification: async () => {
        try {
            let notifications = await SELECT.All(`SELECT * FROM tbl_notif_admin_sent_init WHERE status = 'pending' AND TIMESTAMPDIFF(MINUTE, now(), send_utc_datetime) < 0`);

            let notifications_ids = notifications.map(notification => notification.id);

            UPDATE(`UPDATE tbl_notif_admin_sent_init SET status = 'in_process' WHERE id in (${notifications_ids})`).catch((err) => { });

            for (let notification of notifications) {
                sendNotificationJob(notification);
            }

            // Check for failed notifications 3 hours
            UPDATE(`UPDATE tbl_notif_admin_sent_init SET status = 'failed', failed_reason = 'Time Out 3 Hours' WHERE is_send_internal = 0 AND status = 'in_process' AND TIMESTAMPDIFF(MINUTE, now(), send_utc_datetime) < -180`).catch((err) => { });

            // Check for failed internal notifications 48 hours
            UPDATE(`UPDATE tbl_notif_admin_sent_init SET status = 'failed', failed_reason = 'Time Out 3 Hours' WHERE is_send_internal = 1 AND status = 'in_process' AND TIMESTAMPDIFF(MINUTE, now(), send_utc_datetime) < -2880`).catch((err) => { });

            return true;
        } catch (err) {
            return false;
        }
    }
};

module.exports = cronJobs;