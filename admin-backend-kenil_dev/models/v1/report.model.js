const { SELECT, INSERT, UPDATE, DELETE } = require('../../utils/SQLWorker');
const { sendResponse } = require('../../middleware');
const moment = require('moment');

// Helper function to build filter conditions
function buildFilterConditions(year, start_date, end_date, start_time, end_time, platform_type, column_name = 'o.order_date_time') {
    const conditions = [];
    
    if (year) {
        conditions.push(`YEAR(${column_name}) = ${year}`);
    }
    
    if (start_date && end_date) {
        conditions.push(`DATE(${column_name}) BETWEEN '${start_date}' AND '${end_date}'`);
    }
    
    if (start_time && end_time) {
        conditions.push(`TIME(${column_name}) BETWEEN '${start_time}' AND '${end_time}'`);
    }
    
    if (platform_type) {
        conditions.push(`o.platform_type = '${platform_type}'`);
    }
    
    return conditions.length > 0 ? " AND " + conditions.join(' AND ') : '';
}

// Function to apply filter conditions to a query
function applyFilterConditions(query, filterConditions) {
    if (!filterConditions) return query;
    
    if (query.includes('WHERE')) {
        return query.replace(/WHERE/i, `WHERE ${filterConditions} AND `);
    } else {
        return `${query} WHERE ${filterConditions}`;
    }
}

let report_model = {
    daily_order_count: async (req, res) => {
        try {
            let { year, start_date, end_date, start_time, end_time, platform_type } = req.body;

            const filterConditions = buildFilterConditions(year, start_date, end_date, start_time, end_time, platform_type);

            let query = `SELECT ROW_NUMBER() OVER (ORDER BY o.order_date_time) AS sr_no, o.order_no AS order_id, o.order_date_time AS order_date_time, o.service_type AS service_type, CONCAT(u.first_name, ' ', u.last_name) AS customer_name, cc.name AS customer_type, r.name AS branch, CONCAT(ru.first_name, '', ru.last_name) AS rider_agent_name, o.admin_action_time AS order_processed_time, if(o.service_type = 'delivery', o.out_of_delivery_time, o.delivered_date_time) AS pick_up_time, o.delivered_date_time AS delivery_time, o.order_status AS status, o.payment_method AS payment, o.transaction_id AS transaction_id, o.total_amount AS amount FROM tbl_order o LEFT JOIN tbl_users u ON o.user_id = u.id LEFT JOIN tbl_admin_users_color_codes cc ON u.user_color_code_id = cc.id LEFT JOIN tbl_restaurants r ON o.restaurant_branch_id = r.id LEFT JOIN tbl_rider_users ru ON o.rider_id = ru.id WHERE o.admin_approval_status = 'approved' AND o.is_replacement_order = 0 AND o.is_active = 1 AND o.is_delete = 0 ${filterConditions} ORDER BY o.order_date_time`;

            let data = await SELECT.All(query);

            return sendResponse(req, res, 200, 1, { keyword: "login_success" }, data);

        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: e.message });
        }
    },
    branch_wise_service: async (req, res) => {
        try {
            let { year, start_date, end_date, start_time, end_time, platform_type } = req.body;

            const filterConditions = buildFilterConditions(year, start_date, end_date, start_time, end_time, platform_type);

            let query = `SELECT ROW_NUMBER() OVER(ORDER BY r.name) AS sr_no, r.name AS branch_name, COALESCE(SUM(CASE WHEN o.service_type = 'delivery' THEN 1 ELSE 0 END), 0) AS delivery, COALESCE(SUM(CASE WHEN o.service_type = 'pick_up' THEN 1 ELSE 0 END), 0) AS pick_up, COALESCE(SUM(CASE WHEN o.service_type = 'carhop' THEN 1 ELSE 0 END), 0) AS carhop, COALESCE(SUM(CASE WHEN o.service_type = 'dine_in' THEN 1 ELSE 0 END), 0) AS dine_in, COALESCE(COUNT(o.id), 0) AS total FROM tbl_restaurants r LEFT JOIN ( SELECT * FROM tbl_order as o WHERE is_active = 1 AND is_delete = 0 AND admin_approval_status != 'rejected' ${filterConditions}) o ON r.id = o.restaurant_branch_id WHERE r.is_delete = 0 AND r.is_active = 1 GROUP BY r.id, r.name ORDER BY sr_no`;

            let data = await SELECT.All(query);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);

        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: e.message });
        }
    },
    service_wise_branch: async (req, res) => {
        try {
            let { year, start_date, end_date, start_time, end_time, platform_type } = req.body;

            const filterConditions = buildFilterConditions(year, start_date, end_date, start_time, end_time, platform_type);

            // if !start_date or !end_date, assign current week dates
            if (!start_date || !end_date) {
                start_date = moment().startOf('week').format('YYYY-MM-DD');
                end_date = moment().endOf('week').format('YYYY-MM-DD');
            }

            // Generate dynamic columns for each date in the range
            let dynamicColumns = [];
            let currentDate = moment(start_date);
            let dayCount = 0;

            while (currentDate.isSameOrBefore(moment(end_date))) {
                const formattedDate = currentDate.format('YYYY-MM-DD');
                const dayOfMonth = currentDate.format('DD');
                const month = currentDate.format('MMM').toLowerCase();
                const suffix = getSuffix(parseInt(dayOfMonth));
                const columnName = `${dayOfMonth}${suffix}_${month}`;

                dynamicColumns.push(`COUNT(CASE WHEN DATE(o.order_date_time) = '${formattedDate}' THEN 1 END) AS '${columnName}'`);

                currentDate.add(1, 'days');
                dayCount++;
            }

            // Build the complete SQL query
            const query = `
                SELECT 
                    ROW_NUMBER() OVER(ORDER BY r.name) AS sr_no, 
                    r.name AS branch, 
                    ${dynamicColumns.join(', ')}, 
                    COUNT(*) AS total, 
                    ROUND(COUNT(*) / ${dayCount}, 0) AS average 
                FROM tbl_order o 
                LEFT JOIN tbl_restaurants r ON o.restaurant_branch_id = r.id 
                WHERE o.is_active = 1 
                AND o.is_delete = 0 AND r.is_delete = 0 AND r.is_active = 1
                AND o.admin_approval_status != 'rejected' 
                ${filterConditions} 
                GROUP BY r.name 
                ORDER BY r.name`;

            let data = await SELECT.All(query);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);

            function getSuffix(day) {
                if (day > 3 && day < 21) return 'th';
                switch (day % 10) {
                    case 1: return 'st';
                    case 2: return 'nd';
                    case 3: return 'rd';
                    default: return 'th';
                }
            }

        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: e.message });
        }
    },
    order_delay: async (req, res) => {
        try {
            let { year, start_date, end_date, start_time, end_time, platform_type } = req.body;

            const filterConditions = buildFilterConditions(year, start_date, end_date, start_time, end_time, platform_type);

            let data = await SELECT.All(`SELECT
    ROW_NUMBER() OVER (ORDER BY o.order_date_time) AS sr_no,
    o.order_no AS order_id,
    o.order_date_time AS order_date_time,
    (SELECT CONCAT(first_name, ' ', last_name) FROM tbl_rider_users WHERE id = o.rider_id) AS rider_name,
    (SELECT GROUP_CONCAT(oi.name SEPARATOR ', ')
     FROM tbl_order_items oi
     WHERE oi.order_id = o.id) AS items,
    COUNT(DISTINCT oi.id) AS total,
    o.order_date_time AS order_processed_time,

    -- In preparation time split
    TIMESTAMPDIFF(MINUTE, o.preparation_start_time, o.preparation_time) AS in_preparation_minutes,
    DATE_FORMAT(o.preparation_start_time, '%h:%i %p') AS in_preparation_time,

    -- Packaging time split
    TIMESTAMPDIFF(MINUTE, o.preparation_time, o.packaging_time) AS packaging_minutes,
    DATE_FORMAT(o.packaging_time, '%h:%i %p') AS packaging_time,

    -- Order assigned time split
    TIMESTAMPDIFF(MINUTE, o.packaging_time, o.rider_assign_time) AS order_assigned_minutes,
    DATE_FORMAT(o.rider_assign_time, '%h:%i %p') AS order_assigned_time,

    -- Layover time split
    TIMESTAMPDIFF(MINUTE, o.rider_assign_time, o.out_of_delivery_time) AS layover_minutes,
    DATE_FORMAT(o.out_of_delivery_time, '%h:%i %p') AS layover_time,

    -- Pickup time split
    TIMESTAMPDIFF(MINUTE,
                 IF(o.service_type = 'delivery', o.out_of_delivery_time, o.packaging_time),
                 o.delivered_date_time) AS pickup_minutes,
    DATE_FORMAT(o.delivered_date_time, '%h:%i %p') AS pickup_time,

    -- Delivered time split
    TIMESTAMPDIFF(MINUTE, o.out_of_delivery_time, o.delivered_date_time) AS delivered_minutes,
    DATE_FORMAT(o.delivered_date_time, '%h:%i %p') AS delivered_time,

    -- Return time split
    TIMESTAMPDIFF(MINUTE, o.rider_return_date_time, o.arrival_time_at_branch) AS return_minutes,
    DATE_FORMAT(o.arrival_time_at_branch, '%h:%i %p') AS return_time
FROM
    tbl_order o
    LEFT JOIN tbl_order_items oi ON o.id = oi.order_id
WHERE
    o.is_active = 1
    AND o.is_delete = 0
    AND o.rider_id IS NOT NULL
    AND o.order_status = 'delivered'
    ${filterConditions}
GROUP BY
    o.id
ORDER BY
    o.order_date_time;`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);

        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: e.message });
        }
    },
    cancellation_branch_list: async (req, res) => {
        try {
            let { type, year, start_date, end_date, start_time, end_time, platform_type } = req.body;

            let filterConditions = buildFilterConditions(year, start_date, end_date, start_time, end_time, platform_type);

            if(type == 'Prepared orders'){
                filterConditions += " AND o.restaurant_status IN ('is_packaged', 'out_for_delivery', 'ready_for_pick_up', 'ready_for_serve')";
            } else if(type == 'Non Prepared orders'){
                filterConditions += " AND o.restaurant_status NOT IN ('is_packaged', 'out_for_delivery', 'ready_for_pick_up', 'ready_for_serve')";
            }

            let data = await SELECT.All(`SELECT r.name AS branch, COUNT(CASE WHEN o.service_type = 'delivery' AND o.is_cancel_order = 1 THEN 1 END) AS delivery, COUNT(CASE WHEN o.service_type = 'pick_up' AND o.is_cancel_order = 1 THEN 1 END) AS pick_up, COUNT(CASE WHEN o.service_type = 'carhop' AND o.is_cancel_order = 1 THEN 1 END) AS carhop, COUNT(CASE WHEN o.service_type = 'dine_in' AND o.is_cancel_order = 1 THEN 1 END) AS dine_in, COUNT(CASE WHEN o.is_cancel_order = 1 THEN 1 END) AS total FROM tbl_order o LEFT JOIN tbl_restaurants r ON o.restaurant_branch_id = r.id WHERE r.is_active = 1 AND r.is_delete = 0 ${filterConditions} AND o.is_active = 1 AND o.is_delete = 0 AND o.is_cancel_order = 1 GROUP BY r.name ORDER BY r.name;`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
        }
        catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: e.message });
        }
    },
    cancellation_order_list: async (req, res) => {
        try {
            let { year, start_date, end_date, start_time, end_time, platform_type } = req.body;

            let filterConditions = buildFilterConditions(year, start_date, end_date, start_time, end_time, platform_type);

            let data = await SELECT.All(`SELECT ROW_NUMBER() OVER (ORDER BY o.order_date_time) AS "sr_no", o.order_no AS "order_id", o.order_date_time AS "order_date_time", o.service_type AS "service_type", CONCAT(c.first_name, ' ', c.last_name) AS "customer_name", (SELECT name FROM tbl_admin_users_color_codes WHERE id = c.user_color_code_id) AS "customer_type", rb.name AS "branch", GROUP_CONCAT(DISTINCT oi.name SEPARATOR ', ') AS "product_names", o.cancelled_by AS "cancelled_by", o.cancel_reason AS "cancellation_reason", (select count(id) from tbl_order as oo where oo.user_id = o.user_id AND oo.admin_approval_status = 'approved') AS "order_history", CASE WHEN o.restaurant_status = 'not_assigned' THEN 'Not Prepared' WHEN o.restaurant_status = 'in_preparation' THEN 'In Preparing' WHEN o.restaurant_status = 'in_packaging' THEN 'In Packaging' WHEN o.restaurant_status IN ('is_packaged', 'out_for_delivery', 'ready_for_pick_up', 'ready_for_serve') THEN 'Prepared' ELSE o.restaurant_status END AS "in_preparation_status", FORMAT(o.total_amount, 0) AS "amount" FROM tbl_order o LEFT JOIN tbl_users c ON o.user_id = c.id LEFT JOIN tbl_restaurants rb ON o.restaurant_branch_id = rb.id LEFT JOIN tbl_order_items oi ON o.id = oi.order_id WHERE o.is_cancel_order = 1 ${filterConditions} AND c.is_active = 1 AND c.is_delete = 0 AND rb.is_active = 1 AND rb.is_delete = 0 AND o.is_active = 1 AND o.is_delete = 0 GROUP BY o.id;`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
        }
        catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: e.message });
        }
    },
    loyalty_points_credit: async (req, res) => {
        try {
            let { year, start_date, end_date, start_time, end_time, platform_type } = req.body;

            let filterConditions = buildFilterConditions(year, start_date, end_date, start_time, end_time, platform_type);

            let data = await SELECT.All(`SELECT ROW_NUMBER() OVER (ORDER BY o.order_date_time) AS "sr_no", o.order_no AS "order_id", o.order_date_time, o.service_type AS "service_type", CONCAT(c.first_name, ' ', c.last_name) AS "customer_name", c.id AS "customer_id", FORMAT(o.total_amount, 0) AS "amount", o.order_status AS "order_status", COALESCE(l.points, 0) AS "amount_credited", 'Successful' AS "action" FROM tbl_order o LEFT JOIN tbl_users c ON o.user_id = c.id LEFT JOIN tbl_loyalty_point_transaction l ON o.id = l.order_id WHERE o.is_delete = 0 ${filterConditions} AND c.is_active = 1 AND c.is_delete = 0 AND o.admin_approval_status = 'approved' GROUP BY o.id;`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
        }
        catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: e.message });
        }
    },
    rider_wise: async (req, res) => {
        try {
            let { year, start_date, end_date, start_time, end_time, platform_type } = req.body;

            let filterConditions = buildFilterConditions(year, start_date, end_date, start_time, end_time, platform_type);

            // If !start_date or !end_date, assign current week dates
            if (!start_date || !end_date) {
                start_date = moment().startOf('week').format('YYYY-MM-DD');
                end_date = moment().endOf('week').format('YYYY-MM-DD');
            }

            // Generate dynamic columns for each date in the range
            let dynamicColumns = [];
            let currentDate = moment(start_date);
            let dayCount = 0;

            while (currentDate.isSameOrBefore(moment(end_date))) {
                const formattedDate = currentDate.format('YYYY-MM-DD');
                const dayOfMonth = currentDate.format('DD');
                const month = currentDate.format('MMM').toLowerCase();
                const suffix = getSuffix(parseInt(dayOfMonth));
                const columnName = `${dayOfMonth}${suffix}_${month}`;

                dynamicColumns.push(`COUNT(CASE WHEN DATE(o.order_date_time) = '${formattedDate}' THEN 1 END) AS '${columnName}'`);

                currentDate.add(1, 'days');
                dayCount++;
            }

            // Build the complete SQL query
            const query = `
                SELECT 
                    ROW_NUMBER() OVER(ORDER BY concat(rd.first_name, ' ', rd.last_name)) AS sr_no, 
                    concat(rd.first_name, ' ', rd.last_name) AS rider_name, 
                    (select name from tbl_restaurants where id = o.restaurant_branch_id) as branch,
                    ${dynamicColumns.join(', ')}
                FROM tbl_order o 
                LEFT JOIN tbl_rider_users rd ON o.rider_id = rd.id 
                WHERE o.is_active = 1 
                AND o.is_delete = 0 
                ${filterConditions}
                AND rd.is_delete = 0 
                AND rd.is_active = 1
                AND o.service_type = 'delivery'
                AND o.admin_approval_status != 'rejected' 
                AND DATE(o.order_date_time) BETWEEN '${start_date}' AND '${end_date}' 
                GROUP BY rd.id 
                ORDER BY rider_name`;

            let data = await SELECT.All(query);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);

            function getSuffix(day) {
                if (day > 3 && day < 21) return 'th';
                switch (day % 10) {
                    case 1: return 'st';
                    case 2: return 'nd';
                    case 3: return 'rd';
                    default: return 'th';
                }
            }

        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: e.message });
        }
    },
    customer_feedback: async (req, res) => {
        try {
            let { year, start_date, end_date, start_time, end_time, platform_type } = req.body;

            let filterConditions = buildFilterConditions(year, start_date, end_date, start_time, end_time, platform_type);

            let data = await SELECT.All(`SELECT ROW_NUMBER() OVER (ORDER BY o.order_date_time DESC) AS sr_no, o.order_no AS order_id, o.order_date_time AS order_date_time, o.service_type AS service_type, CONCAT(u.first_name, ' ', u.last_name) AS customer_name, auc.name AS customer_type, r.name AS branch, ff.name AS feedback_topic, 'N/A' AS complaint, f.avg_rating AS rating, trim(f.comment) AS comments, au.name AS handled_by, f.status AS status FROM tbl_feedback f JOIN tbl_order o ON f.order_id = o.id JOIN tbl_users u ON o.user_id = u.id LEFT JOIN tbl_admin_users_color_codes auc ON u.user_color_code_id = auc.id JOIN tbl_restaurants r ON o.restaurant_branch_id = r.id JOIN tbl_feedback_fields ff ON f.feedback_field_id = ff.id LEFT JOIN tbl_admin_users au ON f.resolved_by = au.id WHERE ff.is_delete = 0 AND u.is_active = 1 ${filterConditions} AND o.is_active = 1 AND r.is_active = 1 AND r.is_delete = 0 AND u.is_delete = 0 AND o.is_delete = 0 ORDER BY sr_no`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);

        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: e.message });
        }
    },
    rider_inventory: async (req, res) => {
        try {
            let { year, start_date, end_date, start_time, end_time } = req.body;

            let filterConditions = buildFilterConditions(year, start_date, end_date, start_time, end_time, undefined, 'a.created_at');

            let data = await SELECT.All(`SELECT ROW_NUMBER() OVER (ORDER BY a.received_date DESC) AS sr_no, a.created_at AS date_time, concat(ru.first_name, ' ', ru.last_name) AS rider_name, (select name from tbl_inventory_items where id = a.inventory_item_id) AS item_allocated, IF(a.type = 'recover', a.quantity, '-') AS item_recovered, IF(a.type = 'allocate', a.quantity, '-') AS item_qty, IF(a.type = 'allocate', 'Item Allocated', 'Item Recovered') AS admin_comments FROM tbl_inventory_allocations a JOIN tbl_rider_users ru ON a.rider_id = ru.id WHERE ru.is_active = 1 AND ru.is_delete = 0 ${filterConditions}`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);

        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: e.message });
        }
    },
    delivery_charges: async (req, res) => {
        try {
            let { year, start_date, end_date, start_time, end_time, platform_type } = req.body;

            let filterConditions = buildFilterConditions(year, start_date, end_date, start_time, end_time, platform_type);

            let data = await SELECT.All(`SELECT ROW_NUMBER() OVER (ORDER BY o.order_date_time DESC) AS sr_no, o.order_no, o.order_date_time, r.name AS branch_name, o.delivery_charges FROM tbl_order o JOIN tbl_restaurants r ON o.restaurant_branch_id = r.id WHERE o.service_type = 'delivery' AND o.delivery_charges > 0 AND r.is_active = 1 AND r.is_delete = 0 ${filterConditions} ORDER BY o.order_date_time DESC`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);

        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: e.message });
        }
    },
    rider_productivity: async (req, res) => {
        try {
            let { year, start_date, end_date, start_time, end_time, platform_type } = req.body;

            let filterConditions = buildFilterConditions(year, start_date, end_date, start_time, end_time, platform_type, 'ral.start_time');

            let data = await SELECT.All(`SELECT ROW_NUMBER() OVER (ORDER BY ral.start_time DESC) AS sr_no, CONCAT(ru.first_name, ' ', ru.last_name) AS rider_name, DATE_FORMAT(MIN(CASE WHEN ral.shift_status = 'start_shift' THEN ral.start_time END), '%H:%i %p') AS log_in_time, DATE_FORMAT(MAX(CASE WHEN ral.shift_status = 'end_shift' THEN ral.end_time END), '%H:%i %p') AS log_out_time, IFNULL(SUM(CASE WHEN ral.shift_status = 'on_break' THEN TIMESTAMPDIFF(MINUTE, ral.start_time, ral.end_time) ELSE 0 END), 0) AS in_breaktime_min, SEC_TO_TIME(IFNULL( TIMESTAMPDIFF(MINUTE, MIN(CASE WHEN ral.shift_status = 'start_shift' THEN ral.start_time END), MAX(CASE WHEN ral.shift_status = 'end_shift' THEN ral.end_time END) ) - SUM(CASE WHEN ral.shift_status = 'on_break' THEN TIMESTAMPDIFF(MINUTE, ral.start_time, ral.end_time) ELSE 0 END), 0) * 60) AS productivity_time_min, IFNULL(COUNT(DISTINCT ral.id), 0) AS status_changed, IFNULL(COUNT(DISTINCT o.id), 0) AS orders_delivered FROM tbl_rider_users ru LEFT JOIN tbl_rider_availability_log ral ON ru.id = ral.rider_id LEFT JOIN tbl_order o ON ru.id = o.rider_id AND DATE(o.delivered_date_time) = DATE(ral.start_time) WHERE ru.is_active = 1 AND ru.is_delete = 0 ${filterConditions} GROUP BY ru.id`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);

        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: e.message });
        }
    },
    refund_orders: async (req, res) => {
        try {
            let { year, start_date, end_date, start_time, end_time, platform_type } = req.body;

            let filterConditions = buildFilterConditions(year, start_date, end_date, start_time, end_time, platform_type);

            let data = await SELECT.All(`SELECT ROW_NUMBER() OVER (ORDER BY orrf.created_at DESC) AS sr_no, o.order_no AS order_id, o.order_date_time AS date_time, r.name AS branch_name, a.name AS refund_initiated_by, orrf.created_at AS refund_date_time, orrf.reason AS refund_reason, orrf.total_amount AS refund_amount, orrf.refund_payment_type AS refund_mode FROM tbl_order_replace_or_refund orrf JOIN tbl_order o ON orrf.order_id = o.id JOIN tbl_restaurants r ON o.restaurant_branch_id = r.id JOIN tbl_admin_users a ON orrf.created_by = a.id CROSS JOIN (SELECT @row_number := 0) AS rn WHERE orrf.type = 'refund' ${filterConditions} ORDER BY orrf.created_at DESC;`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);

        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: e.message });
        }
    }
};

module.exports = report_model;