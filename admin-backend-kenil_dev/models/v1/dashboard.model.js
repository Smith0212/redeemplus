const { SELECT } = require('../../utils/SQLWorker');
const { sendResponse } = require('../../middleware');

let dashboard_model = {
    total_orders: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { start_date, end_date, platform_type = 'App' } = req.body;

            let addWhere = '';
            if (start_date && end_date) {
                addWhere += ` AND DATE(created_at) BETWEEN '${start_date}' AND '${end_date}'`;
            } else {
                addWhere += ` AND DATE(created_at) = current_date()`;
            }

            let data = await SELECT.All(`select restaurant_branch_id, (select name from tbl_restaurants where id = tbl_order.restaurant_branch_id) as restaurant_name, sum(if(service_type = 'delivery', 1, 0)) as delivery_count, sum(if(service_type = 'pick_up', 1, 0)) as pick_up_count, sum(if(service_type = 'dine_in', 1, 0)) as dine_in_count, sum(if(service_type = 'carhop', 1, 0)) as carhop_count from tbl_order where country = '${country}' AND platform_type = '${platform_type}' AND restaurant_branch_id not in (select id from tbl_restaurants where is_delete = 1 AND is_active = 0) AND admin_approval_status = 'approved' ${addWhere} group by restaurant_branch_id`);

            data = data.map((item) => {
                // count the total orders
                let total_orders = item.delivery_count + item.pick_up_count + item.dine_in_count + item.carhop_count;
                return {
                    ...item,
                    total_orders: total_orders
                }
            });

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
        }
        catch (error) {
            return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_fetch" });
        }
    },
    live_orders: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { platform_type = 'App' } = req.body;

            let { total_orders } = await SELECT.One(`select count(id) as total_orders from tbl_order o where o.country = 'Uganda' AND restaurant_branch_id not in (select id from tbl_restaurants where is_delete = 1 AND is_active = 0) AND o.admin_approval_status = 'approved' AND o.platform_type = '${platform_type}' AND o.order_status = 'in_preparation' AND o.restaurant_status = 'in_preparation'`, false);

            let data = await SELECT.All(`select restaurant_branch_id as restaurant_id, (select name from tbl_restaurants where id = o.restaurant_branch_id) as restaurant_name, SUM(is_bar_item) as is_bar, SUM(is_kitchen_item) as is_kitchen from tbl_order o where o.country = '${country}' AND restaurant_branch_id not in (select id from tbl_restaurants where is_delete = 1 AND is_active = 0) AND o.admin_approval_status = 'approved' AND o.platform_type = '${platform_type}' AND o.order_status = 'in_preparation' AND o.restaurant_status = 'in_preparation' group by restaurant_branch_id`, false);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, {
                total_orders: total_orders || 0,
                restaurant_orders: data
            });
        }
        catch (error) {
            return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_fetch" });
        }
    },
    scheduled_orders: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { start_date, end_date } = req.body;

            let addWhere = '';
            if (start_date && end_date) {
                addWhere += ` AND DATE(created_at) BETWEEN '${start_date}' AND '${end_date}'`;
            }

            let data = await SELECT.One(`select sum(if(o.service_type = 'delivery', 1, 0)) as delivery, sum(if(o.service_type = 'pick_up', 1, 0)) as pick_up, sum(if(o.service_type = 'carhop', 1, 0)) as carhop from tbl_order o where o.country = '${country}' AND o.service_type != 'dine_in' ${addWhere} AND o.order_status not in ('cancelled', 'not_delivered') AND (select order_type from tbl_user_select_service where id = o.service_id) = 'schedule_order'`, false);

            data = {
                "app_orders": {
                    total_orders: data.delivery + data.pick_up + data.carhop || 0,
                    delivery_count: data.delivery || 0,
                    pick_up_count: data.pick_up || 0,
                    carhop_count: data.carhop || 0
                },
                "call_center_orders": {
                    total_orders: 0,
                    delivery_count: 0,
                    pick_up_count: 0
                }
            }

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
        } catch (error) {
            return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_fetch" });
        }
    },
    kitchen_bar_delayed_timings: async (req, res) => {
        try {
            let { country } = req.loginUser;

            let data = await SELECT.All(`SELECT o.restaurant_branch_id, r.name AS restaurant_name, COALESCE(SUM( CASE WHEN o.is_bar_item = 1 AND o.bar_preparation_time IS NULL THEN TIMESTAMPDIFF(MINUTE, o.bar_preparation_start_time, NOW()) ELSE 0 END ), 0) AS bar_time, COALESCE(SUM( CASE WHEN o.is_kitchen_item = 1 AND o.preparation_time IS NULL THEN TIMESTAMPDIFF(MINUTE, o.preparation_start_time, NOW()) ELSE 0 END ), 0) AS kitchen_time FROM tbl_order o LEFT JOIN tbl_restaurants r ON o.restaurant_branch_id = r.id WHERE o.country = '${country}' AND o.admin_approval_status = 'approved' AND r.is_delete = 0 AND r.is_active = 1 AND o.order_status = 'in_preparation' GROUP BY o.restaurant_branch_id, r.name;`);

            let { setting_value = {} } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = 'grace_time'`, false);

            let { setting_value_2 = {} } = await SELECT.One(`SELECT setting_value as setting_value_2 FROM tbl_app_setting WHERE setting_key = 'order_approval' AND country_name = '${country}'`, false);

            let maximum_kitchen_preparation_time = setting_value_2?.maximum_kitchen_preparation_time || 0;

            let order_preparation_grace_time = setting_value?.order_preparation || 0;

            data = data.map((item) => {

                if (item.kitchen_time > (Number(maximum_kitchen_preparation_time) + Number(order_preparation_grace_time))) {
                    item.kitchen_time = item.kitchen_time - (Number(maximum_kitchen_preparation_time) + Number(order_preparation_grace_time));
                } else {
                    item.kitchen_time = 0;
                }

                if (item.bar_time > (Number(maximum_kitchen_preparation_time) + Number(order_preparation_grace_time))) {
                    item.bar_time = item.bar_time - (Number(maximum_kitchen_preparation_time) + Number(order_preparation_grace_time))
                } else {
                    item.bar_time = 0;
                }

                return item;
            });

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
        }
        catch (error) {
            return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_fetch" });
        }
    },
    top_cards_data: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { start_date, end_date } = req.body;

            let addWhere = '';
            let addWhereNewMembership = '';
            let addWhereActiveMembership = 'AND CURRENT_TIMESTAMP between ubm.start_date_time and ubm.end_date_time';
            let addWhereExpiredMembership = 'AND ubm.end_date_time <= CURRENT_TIMESTAMP';
            if (start_date && end_date) {
                addWhere += ` AND DATE(urf.created_at) BETWEEN '${start_date}' AND '${end_date}'`;
                addWhereNewMembership += ` AND DATE(ubm.created_at) BETWEEN '${start_date}' AND '${end_date}'`;
                addWhereActiveMembership += ` AND DATE(ubm.start_date_time) BETWEEN '${start_date}' AND '${end_date}'`;
                addWhereExpiredMembership += ` AND DATE(ubm.end_date_time) BETWEEN '${start_date}' AND '${end_date}'`;
            }

            let [
                total_customers,
                new_customers,
                red_flag_customers,
                blocked_customers,
                membership_customers
            ] = await Promise.all([
                SELECT.One(`SELECT COUNT(id) as number FROM tbl_users as urf WHERE country_name = '${country}' AND is_delete = 0 AND is_active = 1`, false),
                SELECT.One(`SELECT COUNT(id) as number FROM tbl_users as urf WHERE country_name = '${country}' ${addWhere} AND is_delete = 0 AND is_active = 1`, false),
                SELECT.One(`select count(urf.user_id) as number from tbl_user_red_flags urf join tbl_users u on urf.user_id = u.id where u.country_name = '${country}' AND u.is_active = 1 and u.is_delete = 0 ${addWhere}`, false),
                SELECT.One(`SELECT COUNT(id) as number FROM tbl_users as urf WHERE country_name = '${country}' AND is_delete = 0 AND is_active = 0 ${addWhere != '' ? ` AND DATE(urf.updated_at) between '${start_date}' AND '${end_date}'` : ""}`, false),
                SELECT.One(`SELECT (SELECT COUNT(DISTINCT ubm.user_id) FROM tbl_user_buy_membership ubm JOIN tbl_users u ON ubm.user_id = u.id WHERE u.country_name = '${country}' ${addWhereNewMembership} AND ubm.is_active = 1 AND u.is_delete = 0) AS new_customers, (SELECT COUNT(DISTINCT ubm.user_id) FROM tbl_user_buy_membership ubm JOIN tbl_users u ON ubm.user_id = u.id WHERE u.country_name = '${country}' AND ubm.is_active = 1 AND u.is_delete = 0 ${addWhereActiveMembership}) AS active_members, (SELECT COUNT(DISTINCT ubm.user_id) FROM tbl_user_buy_membership ubm JOIN tbl_users u ON ubm.user_id = u.id WHERE u.country_name = '${country}' ${addWhereExpiredMembership} AND ubm.is_active = 1 AND u.is_delete = 0) AS expired_members`, false)
            ]);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, {
                total_customers: total_customers.number || 0,
                new_customers: new_customers.number || 0,
                red_flag_customers: red_flag_customers.number || 0,
                blocked_customers: blocked_customers.number || 0,
                membership_customers: membership_customers
            });
        }
        catch (error) {
            return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_fetch" });
        }
    },
    center_cards_data: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { start_date, end_date } = req.body;

            let orderDateFilter = '';
            let deactivatedItemsFilter = '';
            let giftCardsUsedFilter = '';
            let giftCardsPurchasedFilter = '';
            let loyaltyPointsFilter = '';

            if (start_date && end_date) {
                orderDateFilter = ` AND DATE(tbl_order.created_at) BETWEEN '${start_date}' AND '${end_date}'`;
                deactivatedItemsFilter = ` AND DATE(mdi.created_at) BETWEEN '${start_date}' AND '${end_date}'`;
                giftCardsUsedFilter = ` AND DATE(gch.created_at) BETWEEN '${start_date}' AND '${end_date}'`;
                giftCardsPurchasedFilter = ` AND DATE(tbl_gift_card_purchase.created_at) BETWEEN '${start_date}' AND '${end_date}'`;
                loyaltyPointsFilter = ` AND DATE(tbl_loyalty_point_transaction.created_at) BETWEEN '${start_date}' AND '${end_date}'`;
            }

            let [
                cancelled_orders,
                deactivated_items,
                gift_cards_used,
                gift_cards_purchased,
                loyalty_points
            ] = await Promise.all([
                SELECT.One(`SELECT COUNT(id) as number FROM tbl_order WHERE country = '${country}' AND order_status = 'cancelled'${orderDateFilter}`, false),
                SELECT.One(`select count(distinct mdi.menu_item_id) as number from tbl_menu_deactivate_items mdi join tbl_menu_items as mi on mdi.menu_item_id = mi.id where mi.country = '${country}' AND now() between mdi.start_date AND mdi.end_date AND mi.is_active = 1 AND mi.is_delete = 0${deactivatedItemsFilter}`, false),
                SELECT.One(`select sum(usage_amount) as number from tbl_gift_card_usage_histroy as gch join tbl_users as u on gch.user_id = u.id where u.country_name = '${country}'${giftCardsUsedFilter}`, false),
                SELECT.One(`select sum(amount) as number from tbl_gift_card_purchase WHERE 1=1${giftCardsPurchasedFilter}`, false),
                SELECT.One(`SELECT SUM(CASE WHEN type = 'receive' THEN points ELSE 0 END) AS points_earned, SUM(CASE WHEN type = 'redeem' THEN points ELSE 0 END) AS points_redeemed, SUM(CASE WHEN type = 'receive' AND admin_id IS NOT NULL THEN points ELSE 0 END) as points_given_by_admin FROM tbl_loyalty_point_transaction WHERE 1=1${loyaltyPointsFilter}`, false)
            ]);

            let data = {
                cancelled_orders: cancelled_orders.number || 0,
                deactivated_items: deactivated_items.number || 0,
                gift_cards_used: gift_cards_used.number || 0,
                gift_cards_purchased: gift_cards_purchased.number || 0,
                loyalty_points: {
                    points_earned: loyalty_points.points_earned || 0,
                    points_redeemed: loyalty_points.points_redeemed || 0,
                    points_given_by_admin: loyalty_points.points_given_by_admin || 0
                }
            }

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
        }
        catch (error) {
            return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_fetch" });
        }
    },
    total_available_riders: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { rider_type = 'in_house' } = req.body;

            let data = await SELECT.All(`select id as branch_id, name, (SELECT count(id) FROM tbl_rider_users WHERE is_active = 1 AND is_delete = 0 AND branch_id = tbl_restaurants.id AND rider_type = '${rider_type}' AND status = 'Available') as rider_count from tbl_restaurants where country = '${country}' AND is_delete = 0 AND is_active = 1`);

            let total_riders = 0;
            data.forEach(item => {
                total_riders += item.rider_count;
            });

            return sendResponse(req, res, 200, 1, { keyword: "success" }, {
                total_riders: total_riders || 0,
                branches: data
            });
        }
        catch (error) {
            return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_fetch" });
        }
    },
    reward_data: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { start_date, end_date } = req.body;

            return sendResponse(req, res, 200, 1, { keyword: "success" }, {
                silver: 0,
                gold: 0,
                platinum: 0,
                diamond: 0,
            });
        }
        catch (error) {
            return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_fetch" });
        }
    },
    wallet_data: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { start_date, end_date } = req.body;

            let addWhere = '';
            if (start_date && end_date) {
                addWhere += ` AND DATE(wth.created_at) BETWEEN '${start_date}' AND '${end_date}'`;
            }

            let list = await SELECT.One(`SELECT SUM(CASE WHEN wth.transaction_type = 'credit' THEN wth.wallet_amount ELSE 0 END) AS wallet_credits, SUM(CASE WHEN wth.transaction_type = 'debit' THEN wth.wallet_amount ELSE 0 END) AS wallet_debits, SUM(CASE WHEN wth.transaction_type = 'credit' AND wth.is_by_admin = 1 THEN wth.wallet_amount ELSE 0 END) AS wallet_balance FROM tbl_user_wallet_transaction_history wth join tbl_users u on u.id = wth.user_id WHERE u.is_delete = 0 AND u.is_active = 1 AND u.country_name = '${country}' ${addWhere}`, false);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, {
                wallet_credit: list.wallet_credits || 0,
                wallet_debit: list.wallet_debits || 0,
                wallet_manually_credit: list.wallet_balance || 0
            });
        }
        catch (error) {
            return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_fetch" });
        }
    }
};

module.exports = dashboard_model;