const { SELECT, INSERT, UPDATE } = require('../../utils/SQLWorker');
const { sendResponse } = require('../../middleware');
const { USER_MEMBERSHIP_SETTING_KEY, LOYALTY_IMAGE_PATH, USER_IMAGE_PATH } = require('../../config/constants');

let LOYALTY_SETTING_KEY = 'loyalty_points';

let loyaltyPointModel = {
    save_setting: async (req, res) => {
        let { country } = req.loginUser;
        try {
            let { type, value } = req.body;

            let oldSetting = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${LOYALTY_SETTING_KEY}' AND country_name = '${country}'`);

            oldSetting.setting_value[type] = value;

            await UPDATE(`UPDATE tbl_app_setting SET setting_value = '${JSON.stringify(oldSetting.setting_value)}' WHERE setting_key = '${LOYALTY_SETTING_KEY}' AND country_name = '${country}'`);

            return sendResponse(req, res, 200, 1, { keyword: "saved" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_save' });
        }
    },
    view_setting: async (req, res) => {
        let { country } = req.loginUser;
        try {
            let { setting_value } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${LOYALTY_SETTING_KEY}' AND country_name = '${country}'`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, setting_value);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err?.message || 'failed_to_fetch' });
        }
    },
    total_listing: async (req, res) => {
        let { country } = req.loginUser;
        let { year, date } = req.body;
        try {
            let addWhere = '';
            if (year) {
                addWhere = ` AND YEAR(created_at) = ${year}`;
            }
            if (date) {
                addWhere += ` AND DATE(created_at) = '${date}'`;
            }

            let data = await SELECT.One(`select SUM(if(type = 'receive' AND admin_id IS null, points, 0)) as total_points_credited, SUM(if(type = 'redeem' AND admin_id IS null, points, 0)) as total_points_debited, SUM(if(type = 'receive' AND admin_id IS not null, points, 0)) as total_points_credited_by_admin, SUM(if(type = 'redeem' AND admin_id IS not null, points, 0)) as total_points_debited_by_admin from tbl_loyalty_point_transaction where country = '${country}' ${addWhere}`, false);

            let list_data = await SELECT.All(`select SUM(if(type = 'receive', points, 0)) as total_credits, SUM(if(type = 'redeem', points, 0)) as total_debiteds, MAX(if(type = 'receive', points, 0)) as highest_credited_of_day, MAX(if(type = 'redeem', points, 0)) as highest_debited_of_day, date(created_at) as date from tbl_loyalty_point_transaction where country = '${country}' ${addWhere} group by date ORDER BY date desc LIMIT 30`, false);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, {
                header_data: {
                    total_points_credited: data.total_points_credited || 0,
                    total_points_debited: data.total_points_debited || 0,
                    total_points_credited_by_admin: data.total_points_credited_by_admin || 0,
                    total_points_debited_by_admin: data.total_points_debited_by_admin || 0
                },
                list_data
            });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    criteria_list: async (req, res) => {
        let { country } = req.loginUser;
        try {
            let criteria = await SELECT.All(`SELECT id as criteria_id, name, is_active FROM tbl_loyalty_point_criteria where country = '${country}' order by is_active desc`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, criteria);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    criteria_action: async (req, res) => {
        try {
            let { admin_id, country } = req.loginUser;
            let { is_active, criteria_id } = req.body;

            await UPDATE(`UPDATE tbl_loyalty_point_criteria SET is_active = ?, updated_by = ? WHERE id IN (?) AND country = ?`, [is_active, admin_id, criteria_id, country]);

            return sendResponse(req, res, 200, 1, { keyword: "status_updated" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_update_status' });
        }
    },
    history: async (req, res) => {
        let { country } = req.loginUser;
        try {
            let { year, date } = req.body;

            let addWhere = '';
            if (year) {
                addWhere = ` AND YEAR(lpt.created_at) = ${year}`;
            } else if (date) {
                addWhere = ` AND DATE(lpt.created_at) = '${date}'`;
            }

            let data = await SELECT.All(`select lpt.id as loyalty_tra_id, lpt.order_id, o.order_no, o.service_type, concat(u.first_name, ' ', u.last_name) as full_name, null as customer_ex_id, o.order_date_time, o.total_amount as full_amount, SUM(CASE WHEN lpt.type = 'redeem' THEN lpt.points ELSE 0 END) as amount_credit, SUM(CASE WHEN lpt.type = 'receive' THEN lpt.points ELSE 0 END) as amount_debit from tbl_loyalty_point_transaction as lpt join tbl_order as o on lpt.order_id = o.id join tbl_users as u on o.user_id = u.id where u.country_name = '${country}' ${addWhere} group by lpt.order_id UNION ALL SELECT lpt.id as loyalty_tra_id, null as order_id, null as order_no, null as service_type, concat(u.first_name, ' ', u.last_name) as full_name, null as customer_ex_id, null as order_date_time, null as full_amount, if(lpt.type = 'receive', lpt.points, 0) as amount_credit, if(lpt.type = 'redeem', lpt.points, 0) as amount_debit FROM tbl_loyalty_point_transaction as lpt JOIN tbl_users as u on lpt.user_id = u.id WHERE u.country_name = '${country}' AND u.is_active = 1 AND u.is_delete = 0 AND u.is_verify = 1 AND lpt.order_id is null ${addWhere} ORDER BY loyalty_tra_id DESC;`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data.map((item) => {
                item.service_type = item.service_type == 'delivery' ? 'Delivery' : item.service_type == 'pick_up' ? 'Pick up' : item.service_type == 'carhop' ? 'Carhop' : item.service_type == 'dine_in' ? 'Dine In' : item.service_type;
                return item;
            }));
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    users_balance_list: async (req, res) => {
        let { country } = req.loginUser;
        try {
            let { year, date } = req.body;

            let addWhere = '';
            if (year) {
                addWhere = ` AND YEAR(created_at) = ${year}`;
            } else if (date) {
                addWhere = ` AND DATE(created_at) = '${date}'`;
            }

            let data = await SELECT.All(`select id as user_id, concat(first_name, ' ', last_name) as full_name, email, country_code, phone, total_loyalty_points from tbl_users where country_name = '${country}' AND is_active = 1 AND is_delete = 0 AND is_verify = 1 ${addWhere}`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    user_profile: async (req, res) => {
        try {
            let { user_id } = req.body;

            let uset_details = await SELECT.One(`select id as user_id, concat(first_name, ' ', last_name) as full_name, concat('${USER_IMAGE_PATH}', if(profile_image = '' OR profile_image is null, 'default.png', profile_image)) as profile_image, email, country_code, phone, total_loyalty_points from tbl_users where id = ${user_id} AND is_active = 1 AND is_delete = 0 AND is_verify = 1`);

            let points = await SELECT.One(`select sum(if(type = 'receive', points, 0)) as total_earned_points, sum(if(type = 'redeem', points, 0)) as total_redeemed_points from tbl_loyalty_point_transaction where user_id = ${user_id}`, false);

            points.total_earned_points = points.total_earned_points || 0;
            points.total_redeemed_points = points.total_redeemed_points || 0;
            points.total_balance_points = points.total_earned_points - points.total_redeemed_points;

            let history = await SELECT.All(`select lpt.id as loyalty_tra_id, lpt.order_id, o.order_no, o.service_type, o.order_date_time, o.total_amount as full_amount, SUM(CASE WHEN lpt.type = 'redeem' THEN lpt.points ELSE 0 END) as amount_credit, SUM(CASE WHEN lpt.type = 'receive' THEN lpt.points ELSE 0 END) as amount_debit, lpt.comment from tbl_loyalty_point_transaction as lpt join tbl_order as o on lpt.order_id = o.id where lpt.user_id = ${user_id} group by lpt.order_id UNION ALL SELECT lpt.id as loyalty_tra_id, '-' as order_id, 'Admin' as order_no, '-' as service_type, lpt.created_at as order_date_time, '-' as full_amount, if(lpt.type = 'receive', lpt.points, 0) as amount_credit, if(lpt.type = 'redeem', lpt.points, 0) as amount_debit, lpt.comment FROM tbl_loyalty_point_transaction as lpt WHERE lpt.user_id = ${user_id} AND lpt.order_id is null ORDER BY loyalty_tra_id DESC`, false);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, {
                uset_details,
                points,
                history
            });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    adjust_points: async (req, res) => {
        try {
            let { user_id, points, type, comment } = req.body;
            let { admin_id } = req.loginUser;

            if (type == 'deduct') {
                type = 'redeem';
            } else if (type == 'add') {
                type = 'receive';
            }

            await INSERT(`INSERT INTO tbl_loyalty_point_transaction SET ?`, { user_id, points, type, comment: comment || null, admin_id });
            await UPDATE(`UPDATE tbl_users SET total_loyalty_points = total_loyalty_points + ? WHERE id = ?`, [type == 'receive' ? points : -points, user_id]);

            return sendResponse(req, res, 200, 1, { keyword: "updated" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_update' });
        }
    }
}

let membershipModel = {
    user_list: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { start_date, end_date } = req.body;

            let addWhere = '';
            if (start_date && end_date) {
                addWhere = ` AND DATE(ubm.created_at) BETWEEN '${start_date}' AND '${end_date}'`;
            } else if (start_date) {
                addWhere += ` AND DATE(ubm.created_at) >= '${start_date}'`;
            } else if (end_date) {
                addWhere += ` AND DATE(ubm.created_at) <= '${end_date}'`;
            }

            let list = await SELECT.All(`SELECT u.id AS user_id, CONCAT(u.first_name, ' ', u.last_name) AS customer_name, u.external_id AS customer_id, ubm.start_date_time AS date_of_joining, mp.title AS plan_type, ubm.end_date_time AS date_of_expiry, ubm.payment_method, ubm.transaction_id, COALESCE(COUNT(o.id), 0) AS total_orders FROM tbl_user_buy_membership ubm JOIN tbl_membership_plans mp ON ubm.plan_id = mp.id JOIN tbl_users u ON ubm.user_id = u.id LEFT JOIN tbl_order o ON o.user_id = ubm.user_id AND o.admin_approval_status = 'approved' AND o.order_date_time BETWEEN ubm.start_date_time AND ubm.end_date_time WHERE ubm.is_active = 1 AND ubm.payment_status = 'paid' ${addWhere} AND mp.is_active = 1 AND mp.is_delete = 0 AND u.country_name = '${country}' AND u.is_active = 1 AND u.is_delete = 0 AND u.is_verify = 1 GROUP BY u.id, ubm.start_date_time, ubm.end_date_time, ubm.payment_method, ubm.transaction_id, mp.title ORDER BY ubm.start_date_time DESC;`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, list);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message });
        }
    },

    user_count: async (req, res) => {
        try{
            let { country } = req.loginUser;
            let { start_date, end_date } = req.body;

            let addWhere = '';
            if (start_date && end_date) {
                addWhere = ` AND DATE(ubm.start_date_time) BETWEEN '${start_date}' AND '${end_date}'`;
            } else if (start_date) {
                addWhere += ` AND DATE(ubm.start_date_time) >= '${start_date}'`;
            } else if (end_date) {
                addWhere += ` AND DATE(ubm.start_date_time) <= '${end_date}'`;
            }

            let list = await SELECT.All(`SELECT COUNT(DISTINCT ubm.user_id) AS total_premium_customers, mp.title AS plan_title FROM tbl_membership_plans mp LEFT JOIN tbl_user_buy_membership ubm ON mp.id = ubm.plan_id AND ubm.is_active = 1 AND ubm.payment_status = 'paid' ${addWhere} LEFT JOIN tbl_users u ON ubm.user_id = u.id AND u.country_name = '${country}' AND u.is_active = 1 AND u.is_delete = 0 AND u.is_verify = 1 WHERE mp.is_active = 1 AND mp.is_delete = 0 GROUP BY mp.title, mp.valid_range ORDER BY mp.valid_range;`, false);

            list = [{
                total_premium_customers: list.reduce((acc, item) => acc + item.total_premium_customers, 0),
                plan_title: 'Total Premium Customers'
            }, ...list];

            return sendResponse(req, res, 200, 1, { keyword: "success" }, list);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message });
        }
    },

    edit: async (req, res) => {
        try {
            let { admin_id, country } = req.loginUser;
            let { title, description, current_benefits_ids } = req.body;

            let checkBenefit = await SELECT.All(`SELECT id FROM tbl_membership_benefits WHERE id IN (${current_benefits_ids}) AND is_active = 1 AND is_delete = 0 AND country = '${country}'`);

            if (checkBenefit.length != current_benefits_ids.length) {
                return sendResponse(req, res, 200, 0, { keyword: 'benefit_not_found' });
            }

            await UPDATE(`UPDATE tbl_app_setting SET setting_value = ?, updated_by = ${admin_id} WHERE setting_key = ? AND country_name = '${country}'`, [JSON.stringify({ title, description, current_benefits_ids }), USER_MEMBERSHIP_SETTING_KEY]);

            return sendResponse(req, res, 200, 1, { keyword: "edited_details" }, { title, description, current_benefits_ids });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_edit_details' });
        }
    },

    view: async (req, res) => {
        try {
            let { setting_value } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${USER_MEMBERSHIP_SETTING_KEY}' AND country_name = '${req.loginUser.country}'`);

            let benefits = await SELECT.All(`SELECT id as benefit_id, name, concat('${LOYALTY_IMAGE_PATH}', image) as image FROM tbl_membership_benefits WHERE id IN (${setting_value.current_benefits_ids}) AND is_active = 1 AND is_delete = 0 AND country = '${req.loginUser.country}'`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, {
                title: setting_value.title,
                description: setting_value.description,
                benefits
            });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    benefit: {
        add_edit: async (req, res) => {
            try {
                let { admin_id, country } = req.loginUser;
                let { benefit_id, name, image } = req.body;

                if (benefit_id) {
                    await UPDATE(`UPDATE tbl_membership_benefits SET name = ?, image = ?, updated_by = ? WHERE id = ? AND country = ?`, [name, image || null, admin_id, benefit_id, country]);

                    return sendResponse(req, res, 200, 1, { keyword: "edited" });
                } else {
                    await INSERT(`INSERT INTO tbl_membership_benefits (name, image, created_by, country) VALUES (?, ?, ?, ?)`, [name, image || null, admin_id, country]);

                    return sendResponse(req, res, 200, 1, { keyword: "added" });
                }
            }
            catch (err) {
                return sendResponse(req, res, 200, 0, { keyword: 'failed' });
            }
        },

        action: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { is_active, benefit_id } = req.body;

                await UPDATE(`UPDATE tbl_membership_benefits SET is_active = ?, updated_by = ? WHERE id IN (?)`, [is_active, admin_id, benefit_id]);

                return sendResponse(req, res, 200, 1, { keyword: "status_updated" });
            }
            catch (err) {
                return sendResponse(req, res, 200, 0, { keyword: 'failed_to_update_status' });
            }
        },

        delete: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { benefit_id } = req.body;

                await UPDATE(`UPDATE tbl_membership_benefits SET is_delete = 1, updated_by = ? WHERE id IN (?)`, [admin_id, benefit_id]);

                return sendResponse(req, res, 200, 1, { keyword: "deleted" });
            }
            catch (err) {
                return sendResponse(req, res, 200, 0, { keyword: 'failed_to_delete' });
            }
        },

        view: async (req, res) => {
            try {
                let { country } = req.loginUser;
                let { benefit_id } = req.body;

                let data;
                if (benefit_id) {
                    data = await SELECT.One(`SELECT id as benefit_id, name, concat('${LOYALTY_IMAGE_PATH}', image) as image, is_active FROM tbl_membership_benefits WHERE id = ${benefit_id} and is_delete = 0 AND country = '${country}'`);
                } else {
                    data = await SELECT.All(`SELECT id as benefit_id, name, concat('${LOYALTY_IMAGE_PATH}', image) as image, is_active FROM tbl_membership_benefits where is_delete = 0 AND country = '${country}'`);
                }

                return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
            }
            catch (err) {
                return sendResponse(req, res, 200, 2, { keyword: err.message || 'failed_to_fetch' });
            }
        }
    },

    plan: {
        add_edit: async (req, res) => {
            try {
                let { admin_id, country } = req.loginUser;
                let { plan_id, title, valid_range, price } = req.body;

                if (plan_id) {
                    await UPDATE(`UPDATE tbl_membership_plans SET country = ?, title = ?, valid_range = ?, price = ?, updated_by = ? WHERE id = ?`, [country, title, valid_range, price, admin_id, plan_id]);

                    return sendResponse(req, res, 200, 1, { keyword: "edited" });
                } else {
                    await INSERT(`INSERT INTO tbl_membership_plans (country, title, valid_range, price, created_by) VALUES (?, ?, ?, ?, ?)`, [country, title, valid_range, price, admin_id]);

                    return sendResponse(req, res, 200, 1, { keyword: "added" });
                }
            }
            catch (err) {
                return sendResponse(req, res, 200, 0, { keyword: 'failed' });
            }
        },

        action: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { is_active, plan_id } = req.body;

                await UPDATE(`UPDATE tbl_membership_plans SET is_active = ?, updated_by = ? WHERE id IN (?)`, [is_active, admin_id, plan_id]);

                return sendResponse(req, res, 200, 1, { keyword: "status_updated" });
            }
            catch (err) {
                return sendResponse(req, res, 200, 0, { keyword: 'failed_to_update_status' });
            }
        },

        delete: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { plan_id } = req.body;

                await UPDATE(`UPDATE tbl_membership_plans SET is_delete = 1, updated_by = ? WHERE id IN (?)`, [admin_id, plan_id]);

                return sendResponse(req, res, 200, 1, { keyword: "deleted" });
            }
            catch (err) {
                return sendResponse(req, res, 200, 0, { keyword: 'failed_to_delete' });
            }
        },

        view: async (req, res) => {
            try {
                let { plan_id } = req.body;

                let data;
                if (plan_id) {
                    data = await SELECT.One(`SELECT id as plan_id, title, valid_range, price, is_active FROM tbl_membership_plans WHERE id = ${plan_id} AND is_delete = 0`);
                } else {
                    data = await SELECT.All(`SELECT id as plan_id, title, valid_range, price, is_active FROM tbl_membership_plans where is_delete = 0`);
                }

                return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
            }
            catch (err) {
                return sendResponse(req, res, 200, 2, { keyword: err.message || 'failed_to_fetch' });
            }
        }
    }
}

let rewardModel = {
    benefit: {
        add_edit: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { benefit_id, name, price, currency, image } = req.body;

                let country = (currency == 'UGX') ? 'Uganda' : 'Kenya';

                if (benefit_id) {
                    await UPDATE(`UPDATE tbl_reward_benefits SET name = ?, price = ?, image = ?, country = ?, currency = ?, updated_by = ? WHERE id = ?`, [name, price, image || null, country, currency, admin_id, benefit_id]);

                    return sendResponse(req, res, 200, 1, { keyword: "edited" });
                } else {
                    await INSERT(`INSERT INTO tbl_reward_benefits (name, price, image, country, currency, created_by) VALUES (?, ?, ?, ?, ?, ?)`, [name, price, image || null, country, currency, admin_id]);

                    return sendResponse(req, res, 200, 1, { keyword: "added" });
                }
            }
            catch (err) {
                return sendResponse(req, res, 200, 0, { keyword: 'failed' });
            }
        },

        action: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { is_active, benefit_id } = req.body;

                await UPDATE(`UPDATE tbl_reward_benefits SET is_active = ?, updated_by = ? WHERE id IN (?)`, [is_active, admin_id, benefit_id]);

                return sendResponse(req, res, 200, 1, { keyword: "status_updated" });
            }
            catch (err) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_update_status" });
            }
        },

        delete: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { benefit_id } = req.body;

                await UPDATE(`UPDATE tbl_reward_benefits SET is_delete = 1, updated_by = ? WHERE id IN (?)`, [admin_id, benefit_id]);

                return sendResponse(req, res, 200, 1, { keyword: "deleted" });
            }
            catch (err) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_delete" });
            }
        },

        view: async (req, res) => {
            try {
                let { benefit_id } = req.body;

                let data;
                if (benefit_id) {
                    data = await SELECT.One(`SELECT id as benefit_id, name, price, concat('${LOYALTY_IMAGE_PATH}', image) as image, country, currency, is_active FROM tbl_reward_benefits WHERE id = ${benefit_id} AND is_delete = 0`);
                } else {
                    data = await SELECT.All(`SELECT id as benefit_id, name, price, concat('${LOYALTY_IMAGE_PATH}', image) as image, country, currency, is_active FROM tbl_reward_benefits where is_delete = 0`);
                }

                return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
            }
            catch (err) {
                return sendResponse(req, res, 200, 2, { keyword: err.message || 'failed_to_fetch' });
            }
        }
    },

    tier: {
        add_edit: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { tier_id, name, from_credits, upto_credits, benefit_ids } = req.body;

                if (from_credits >= upto_credits) {
                    return sendResponse(req, res, 200, 0, { keyword: 'invalid_credits' });
                }

                let addWhere = '';
                if (tier_id) {
                    addWhere = ` AND id != ${tier_id || 0}`;
                }

                let { count } = await SELECT.One(`SELECT COUNT(*) as count FROM tbl_reward_tiers WHERE NOT (upto_credits <= ${from_credits} OR from_credits >= ${upto_credits}) ${addWhere}`);

                if (count > 0) {
                    return sendResponse(req, res, 200, 0, { keyword: 'overlap_values', components: { "type": "Tier credits" } });
                }

                if (tier_id) {
                    await UPDATE(`UPDATE tbl_reward_tiers SET ? WHERE id = ${tier_id}`, {
                        name,
                        from_credits,
                        upto_credits,
                        benefit_ids: benefit_ids.join(','),
                        updated_by: admin_id
                    });
                    return sendResponse(req, res, 200, 1, { keyword: "edited_details" });
                } else {
                    await INSERT(`INSERT INTO tbl_reward_tiers SET ?`, {
                        name,
                        from_credits,
                        upto_credits,
                        benefit_ids: benefit_ids.join(','),
                        created_by: admin_id
                    });
                    return sendResponse(req, res, 200, 1, { keyword: "added_details" });
                }


            }
            catch (err) {
                return sendResponse(req, res, 200, 0, { keyword: 'failed' });
            }
        },

        list: async (req, res) => {
            try {
                let data = await SELECT.All(`SELECT id as tier_id, name, from_credits, upto_credits, benefit_ids as benefits FROM tbl_reward_tiers`);

                for (let i = 0; i < data.length; i++) {
                    data[i].benefits = await SELECT.All(`SELECT id as benefit_id, name, price, concat('${LOYALTY_IMAGE_PATH}', image) as image, country, currency, is_active FROM tbl_reward_benefits WHERE id IN (${data[i].benefits}) AND is_delete = 0 AND is_active = 1`, false);
                }

                return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
            }
            catch (err) {
                return sendResponse(req, res, 200, 2, { keyword: err.message || 'failed_to_fetch' });
            }
        },

        view: async (req, res) => {
            try {
                let { tier_id } = req.body;

                let data = await SELECT.One(`SELECT id as tier_id, name, from_credits, upto_credits, benefit_ids as benefits FROM tbl_reward_tiers WHERE id = ${tier_id}`);

                data.benefits = await SELECT.All(`SELECT id as benefit_id, name, price, concat('${LOYALTY_IMAGE_PATH}', image) as image, country, currency, is_active FROM tbl_reward_benefits WHERE id IN (${data.benefits}) AND is_delete = 0 AND is_active = 1`, false);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
            }
            catch (err) {
                return sendResponse(req, res, 200, 2, { keyword: err.message || 'failed_to_fetch' });
            }
        }
    }
}

module.exports = {
    loyaltyPointModel,
    membershipModel,
    rewardModel
};