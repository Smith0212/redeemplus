const { SELECT, INSERT, UPDATE, DELETE } = require('../../utils/SQLWorker');
const constants = require('../../config/constants');
const { sendResponse, checkRolePermissionInModel } = require('../../middleware');
const sortBy = require('lodash/sortBy');
let events_allowed_media_files = ['mp4', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
const { check_file_format } = require('../../utils/common');
const sendPush = require('../../utils/configNotification');
const { sendKenyaSMS } = require('../../utils/configMessage');
const { sendUgandaMail, sendKenyaMail } = require('../../utils/configEmailSMTP');
const isEmpty = require('lodash/isEmpty');
const moment = require('moment');
const each = require('async-each');

//////////////////////////////////////////////////////////////////////
//                            Promo Code                            //
//////////////////////////////////////////////////////////////////////

const promo_code = {
    create: async (req, res) => {
        try {
            let { admin_id, country } = req.loginUser;
            let { promo_code, amount, start_datetime, expiry_datetime, notification_title, notification_description } = req.body;

            // Check if promo code already exists
            let existingPromoCode = await SELECT.All(`SELECT id FROM tbl_promo_code WHERE promo_code = '${promo_code}' AND is_delete = 0`, false);

            if (existingPromoCode.length) {
                return sendResponse(req, res, 200, 0, { keyword: "promo_code_already_exist" });
            }

            await INSERT('INSERT INTO tbl_promo_code SET ?', {
                promo_code,
                amount,
                start_datetime,
                expiry_datetime,
                country: country,
                created_by: admin_id,
                notification_title: notification_title,
                notification_description: notification_description,
            });

            return sendResponse(req, res, 200, 1, { keyword: "created" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_create' });
        }
    },
    delete: async (req, res) => {
        try {
            let { promo_code_id } = req.body;

            await DELETE(`DELETE FROM tbl_notif_admin_sent_init WHERE ref_pm_id = ${promo_code_id} AND ref_tbl_name = 'tbl_promo_code'`);

            await UPDATE(`UPDATE tbl_promo_code SET is_delete = 1 WHERE id = ${promo_code_id}`);

            return sendResponse(req, res, 200, 1, { keyword: "deleted" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_delete' });
        }
    },
    list: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let promo_codes = await SELECT.All(`select id as promo_code_id, promo_code, amount, start_datetime, expiry_datetime, created_at, receiver_type, CASE WHEN start_datetime > NOW() THEN 'Active' WHEN expiry_datetime < NOW() THEN 'Expired' WHEN start_datetime <= NOW() AND expiry_datetime >= NOW() THEN 'Active' ELSE 'Unknown' END AS status from tbl_promo_code where is_delete = 0 and country = '${country}' order by id desc`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, promo_codes);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    get_user_list: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { promo_code_id, receiver_type, search_phone } = req.body;

            let promo_code = await SELECT.One(`select id as promo_code_id, start_datetime, expiry_datetime from tbl_promo_code where id = ${promo_code_id} AND is_delete = 0`);

            let user_list = [];
            if (receiver_type == 'All customers') {
                user_list = await SELECT.All(`select id as user_id, concat(first_name, ' ', last_name) as full_name, country_code, phone, date_of_birth, created_at from tbl_users where country_name = '${country}' AND is_verify = 1 AND is_delete = 0 and is_active = 1`);
            } else if (receiver_type == 'Single users') {
                user_list = await SELECT.All(`select id as user_id, concat(first_name, ' ', last_name) as full_name, country_code, phone, date_of_birth, created_at from tbl_users where country_name = '${country}' AND is_verify = 1 AND is_delete = 0 AND is_active = 1 AND is_guest_user = 0 AND CONCAT(country_code, ' ',phone) LIKE '%${search_phone}%' LIMIT 15`);
            } else if (receiver_type == 'Premium') {
                user_list = [];
                throw new Error('no_data');
            } else if (receiver_type == 'Gold customer') {
                user_list = [];
                throw new Error('no_data');
            } else if (receiver_type == 'Silver customer') {
                user_list = [];
                throw new Error('no_data');
            } else if (receiver_type == 'Platinum customer') {
                user_list = [];
                throw new Error('no_data');
            } else if (receiver_type == 'Female') {
                user_list = await SELECT.All(`select id as user_id, concat(first_name, ' ', last_name) as full_name, country_code, phone, date_of_birth, created_at from tbl_users where country_name = '${country}' AND gender = 'female' AND is_verify = 1 AND is_delete = 0 and is_active = 1`);
            } else if (receiver_type == 'Male') {
                user_list = await SELECT.All(`select id as user_id, concat(first_name, ' ', last_name) as full_name, country_code, phone, date_of_birth, created_at from tbl_users where country_name = '${country}' AND gender = 'male' AND is_verify = 1 AND is_delete = 0 and is_active = 1`);
            } else if (receiver_type == 'Birthday') {
                user_list = await SELECT.All(`select id as user_id, concat(first_name, ' ', last_name) as full_name, country_code, phone, date_of_birth, created_at from tbl_users where country_name = '${country}' AND date_of_birth between '${promo_code.start_datetime}' and '${promo_code.expiry_datetime}' AND is_verify = 1 AND is_delete = 0 and is_active = 1`);
            }

            return sendResponse(req, res, 200, 1, { keyword: "success" }, user_list);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    get_details: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { promo_code_id } = req.body;

            let promo_code = await SELECT.One(`select id as promo_code_id, promo_code, amount, start_datetime, expiry_datetime, receiver_type, single_receiver_id from tbl_promo_code where id = ${promo_code_id} AND country = '${country}' AND is_delete = 0`);

            let user_list = [];
            if (promo_code.receiver_type == 'All customers') {
                user_list = await SELECT.All(`select id as user_id, concat(first_name, ' ', last_name) as full_name, country_code, phone, date_of_birth, created_at from tbl_users where country_name = '${country}' AND is_verify = 1 AND is_delete = 0 and is_active = 1`);
            } else if (promo_code.receiver_type == 'Single users') {
                user_list = await SELECT.All(`select id as user_id, concat(first_name, ' ', last_name) as full_name, country_code, phone, date_of_birth, created_at from tbl_users where id in (${promo_code.single_receiver_id})`);
            } else if (promo_code.receiver_type == 'Premium') {
                user_list = [];
                throw new Error('no_data');
            } else if (promo_code.receiver_type == 'Gold customer') {
                user_list = [];
                throw new Error('no_data');
            } else if (promo_code.receiver_type == 'Silver customer') {
                user_list = [];
                throw new Error('no_data');
            } else if (promo_code.receiver_type == 'Platinum customer') {
                user_list = [];
                throw new Error('no_data');
            } else if (promo_code.receiver_type == 'Female') {
                user_list = await SELECT.All(`select id as user_id, concat(first_name, ' ', last_name) as full_name, country_code, phone, date_of_birth, created_at from tbl_users where country_name = '${country}' AND gender = 'female' AND is_verify = 1 AND is_delete = 0 and is_active = 1`);
            } else if (promo_code.receiver_type == 'Male') {
                user_list = await SELECT.All(`select id as user_id, concat(first_name, ' ', last_name) as full_name, country_code, phone, date_of_birth, created_at from tbl_users where country_name = '${country}' AND gender = 'male' AND is_verify = 1 AND is_delete = 0 and is_active = 1`);
            } else if (promo_code.receiver_type == 'Birthday') {
                user_list = await SELECT.All(`select id as user_id, concat(first_name, ' ', last_name) as full_name, country_code, phone, date_of_birth, created_at from tbl_users where country_name = '${country}' AND date_of_birth between '${promo_code.start_date}' and '${promo_code.expiry_date}' AND is_verify = 1 AND is_delete = 0 and is_active = 1`);
            }

            promo_code.user_list = user_list;

            return sendResponse(req, res, 200, 1, { keyword: "success" }, promo_code);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    send_to_users: async (req, res) => {
        try {
            let { admin_id, country } = req.loginUser;
            let { promo_code_id, receiver_type, single_receiver_id } = req.body;

            let check = await SELECT.One(`select receiver_type from tbl_promo_code where id = ${promo_code_id} AND is_delete = 0`, false);

            if (check.receiver_type != null) {
                return sendResponse(req, res, 200, 0, { keyword: "already_user_type_assigned" });
            }

            let user_list = [];
            if (receiver_type == 'All customers') {
                user_list = await SELECT.One(`select count(id) as number from tbl_users where country_name = '${country}' AND is_verify = 1 AND is_delete = 0 and is_active = 1`, false);
            } else if (receiver_type == 'Single users') {
                user_list = {
                    number: 1
                };
            } else if (receiver_type == 'Premium') {
                user_list = {
                    number: 0
                };
            } else if (receiver_type == 'Gold customer') {
                user_list = {
                    number: 0
                };
            } else if (receiver_type == 'Silver customer') {
                user_list = {
                    number: 0
                };
            } else if (receiver_type == 'Platinum customer') {
                user_list = {
                    number: 0
                };
            } else if (receiver_type == 'Female') {
                user_list = await SELECT.One(`select count(id) as number from tbl_users where country_name = '${country}' AND gender = 'female' AND is_verify = 1 AND is_delete = 0 and is_active = 1`, false);
            } else if (receiver_type == 'Male') {
                user_list = await SELECT.One(`select count(id) as number from tbl_users where country_name = '${country}' AND gender = 'male' AND is_verify = 1 AND is_delete = 0 and is_active = 1`, false);
            } else if (receiver_type == 'Birthday') {
                user_list = await SELECT.One(`select count(id) as number from tbl_users where country_name = '${country}' AND date_of_birth between '${promo_code.start_datetime}' and '${promo_code.expiry_datetime}' AND is_verify = 1 AND is_delete = 0 and is_active = 1`, false);
            }

            await UPDATE(`UPDATE tbl_promo_code SET receiver_type = '${receiver_type}', user_count = ${user_list.number}, single_receiver_id = ${receiver_type == 'Single users' ? single_receiver_id : null} WHERE id = ${promo_code_id}`);

            let promo_code = await SELECT.One(`select id as promo_code_id, promo_code, amount, start_datetime, expiry_datetime, receiver_type, single_receiver_id, notification_title, notification_description from tbl_promo_code where id = ${promo_code_id} AND is_delete = 0`);

            let filter_mode = 'Customer';
            let main_filter_id = null;
            let main_sub_filter_id = null;
            let notif_filter_value = null;

            if (promo_code.receiver_type == 'All customers') {
                main_filter_id = 1;
            } else if (promo_code.receiver_type == 'Single users') {
                filter_mode = 'Single Device';
                notif_filter_value = promo_code.single_receiver_id;
            } else if (promo_code.receiver_type == 'Premium') {
                main_filter_id = 2;
            } else if (promo_code.receiver_type == 'Gold customer') {
                main_filter_id = 17;
                main_sub_filter_id = 44;
            } else if (promo_code.receiver_type == 'Silver customer') {
                main_filter_id = 17;
                main_sub_filter_id = 43;
            } else if (promo_code.receiver_type == 'Platinum customer') {
                main_filter_id = 17;
                main_sub_filter_id = 45;
            } else if (promo_code.receiver_type == 'Female') {
                main_filter_id = 12;
            } else if (promo_code.receiver_type == 'Male') {
                main_filter_id = 13;
            } else if (promo_code.receiver_type == 'Birthday') {
                main_filter_id = 14;
            }

            each(['SMS', 'WhatsApp', 'Push Notification'], async (mode, next) => {
                INSERT('INSERT INTO tbl_notif_admin_sent_init SET ?', {
                    title: promo_code.notification_title,
                    description: promo_code.notification_description,
                    send_date: moment(promo_code.start_datetime).format('YYYY-MM-DD'),
                    send_time: moment(promo_code.start_datetime).format('HH:mm:ss'),
                    send_utc_datetime: moment(promo_code.start_datetime).format('YYYY-MM-DD HH:mm:ss'),
                    mode: mode,
                    user_type: filter_mode,
                    media_name: null,
                    push_tag: "promo_code_notification",
                    notif_filter_id: main_filter_id,
                    notif_sub_filter_id: main_sub_filter_id,
                    notif_filter_value: notif_filter_value,
                    excel_sheet_name: null,
                    created_by: admin_id,
                    country: country,
                    is_send_internal: 1,
                    internal_type: "promo_code_user",
                    ref_pm_id: promo_code.promo_code_id,
                    ref_tbl_name: "tbl_promo_code",
                    other_data: JSON.stringify({
                        receiver_type: promo_code.receiver_type,
                        start_datetime: promo_code.start_datetime,
                        expiry_datetime: promo_code.expiry_datetime,
                    })
                });

                next();
            }, err => {
                if (err) {
                    console.error(err);
                }
            });

            return sendResponse(req, res, 200, 1, { keyword: "success" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_send' });
        }
    },
    get_counts: async (req, res) => {
        try {
            let { country } = req.loginUser;

            let promo_code_counts = await SELECT.One(`select sum(if(status = 'Active', user_count, 0)) as active_unused_count, sum(if(status = 'Expired', user_count, 0)) as expired_unused_count, sum(if(status = 'Active', used_user_count, 0)) as active_used_count, sum(if(status = 'Expired', used_user_count, 0)) as expired_used_count from (select id as promo_code_id, user_count, (select count(id) from tbl_order where promo_code_id = tbl_promo_code.id) as used_user_count, CASE WHEN start_datetime > NOW() THEN 'Active' WHEN expiry_datetime < NOW() THEN 'Expired' WHEN start_datetime <= NOW() AND expiry_datetime >= NOW() THEN 'Active' ELSE 'Unknown' END AS status from tbl_promo_code where is_delete = 0 AND country = '${country}') AS promo_codes`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, promo_code_counts);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    }
}

//////////////////////////////////////////////////////////////////////
//                            Feedback                              //
//////////////////////////////////////////////////////////////////////

const feedback = {

    questions: async (req, res) => {
        try {
            let fields = await SELECT.All(`select id as field_id, name, created_at from tbl_feedback_fields where is_delete = 0 order by id desc`);
            let questions = await SELECT.All(`select id as question_id, feedback_field_id, question, description, created_at from tbl_feedback_questions where feedback_field_id in (${fields.map(o => o.field_id)}) AND is_delete = 0`, false);

            // add questions to fields
            fields = fields.map(type => {
                type.questions = questions.filter(question => question.feedback_field_id == type.field_id);
                return type;
            });

            return sendResponse(req, res, 200, 1, { keyword: "success" }, fields);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    crud_field: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { type, value } = req.body;
            let keyword = "";
            if (type == 'add') {

                await checkRolePermissionInModel(admin_id, "feedback", "edit");

                await INSERT('INSERT INTO tbl_feedback_fields SET ?', {
                    name: value,
                    created_by: admin_id
                });
                keyword = "added";

            } else if (type == 'delete') {

                await checkRolePermissionInModel(admin_id, "feedback", "delete");

                await DELETE(`DELETE FROM tbl_feedback_questions WHERE id = ${value}`);
                await DELETE(`DELETE FROM tbl_feedback_fields WHERE id = ${value}`);
                keyword = "deleted";

            } else if (type == 'edit') {

                await checkRolePermissionInModel(admin_id, "feedback", "edit");

                await UPDATE(`UPDATE tbl_feedback_fields SET ? WHERE id = ${value.field_id}`, {
                    name: value.name,
                    updated_by: admin_id
                });
                keyword = "edited";

            }

            return sendResponse(req, res, 200, 1, { keyword });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed' });
        }
    },

    crud_question: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { type, value } = req.body;
            let keyword = "";

            if (type == 'add') {

                await checkRolePermissionInModel(admin_id, "feedback", "edit");

                await INSERT('INSERT INTO tbl_feedback_questions SET ?', {
                    feedback_field_id: value.feedback_field_id,
                    question: value.question,
                    description: value.description,
                    created_by: admin_id
                });
                keyword = "added";

            } else if (type == 'delete') {

                await checkRolePermissionInModel(admin_id, "feedback", "delete");

                await UPDATE(`UPDATE tbl_feedback_questions SET is_delete = 1 WHERE id = ${value}`);
                keyword = "deleted";

            } else if (type == 'edit') {

                await checkRolePermissionInModel(admin_id, "feedback", "edit");

                await UPDATE(`UPDATE tbl_feedback_questions SET ? WHERE id = ${value.question_id}`, {
                    question: value.question,
                    description: value.description,
                    updated_by: admin_id
                });
                keyword = "edited";

            }

            return sendResponse(req, res, 200, 1, { keyword });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed' });
        }
    },

    get_details: async (req, res) => {
        try {
            let { feedback_id } = req.body;

            let feedback = await SELECT.One(`select id as feedback_id, rider_id, restaurant_id, feedback_field_id, (select name from tbl_feedback_fields where id = tbl_feedback.feedback_field_id) as field_name, user_id, (select concat(first_name, ' ', last_name) from tbl_users where id = tbl_feedback.user_id) as user_name, (select CONCAT('${constants.USER_IMAGE_PATH}', IF(profile_image = '' OR profile_image IS null, 'default.png', profile_image)) from tbl_users where id = tbl_feedback.user_id) as user_profile_image, order_id, (select tbl_order.order_no from tbl_order where tbl_order.id = tbl_feedback.order_id) as order_no, comment, media, status, resolved_by, IF(status = 'resolved', (select name from tbl_admin_users where id = tbl_feedback.resolved_by), null) as resolved_by_name, resolved_at, created_at from tbl_feedback where id = ${feedback_id} AND feedback_field_id in (select id from tbl_feedback_fields where is_delete = 0)`);

            feedback.media = feedback.media ? feedback?.media.map(media => `${constants.FEEDBACK_REVIEW_IMAGE_PATH}${media}`) : [];

            feedback.feedback_ratings = await SELECT.All(`select fr.id as rating_id, fq.question, fq.description, rating from tbl_feedback_ratings as fr join tbl_feedback_questions as fq on fr.feedback_question_id = fq.id where feedback_id = ${feedback_id} AND fq.is_delete = 0`, false);

            if (feedback.rider_id && feedback.feedback_field_id == 3) {
                feedback.rider_details = await SELECT.One(`SELECT r.id AS rider_id, CONCAT(r.first_name, ' ', r.last_name) AS full_name, concat('${constants.RIDER_IMAGE_PATH}', ifnull(profile_image, 'default.png')) AS profile_image FROM tbl_rider_users r WHERE r.id = ${feedback.rider_id}`);
            } else {
                feedback.rider_details = null;
            }

            feedback.admin_comments = await SELECT.All(`select id as comment_id, comment from tbl_feedback_admin_comments where feedback_id = ${feedback_id}`, false);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, feedback);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    add_comment: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { feedback_id, comment } = req.body;

            await INSERT('INSERT INTO tbl_feedback_admin_comments SET ?', {
                feedback_id,
                comment,
                admin_id: admin_id
            });

            return sendResponse(req, res, 200, 1, { keyword: "added" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_add' });
        }
    },

    status_change: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { feedback_id, status } = req.body;

            await UPDATE(`UPDATE tbl_feedback SET status = '${status}', resolved_by = ${admin_id}, resolved_at = NOW() WHERE id = ${feedback_id}`);

            return sendResponse(req, res, 200, 1, { keyword: "status_updated" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_update_status' });
        }
    },

    history_types: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { date } = req.body;

            let addWhere = '';
            if (date) {
                addWhere = `WHERE date(created_at) = '${date}'`;
            }

            let types = await SELECT.All(`select id as feedback_field_id, name, (select count(id) from tbl_feedback where feedback_field_id = tbl_feedback_fields.id AND country = '${country}') as total from tbl_feedback_fields ${addWhere} order by id desc`, false);

            types = [{
                feedback_field_id: 0,
                name: 'All',
                total: types.reduce((acc, type) => acc + type.total, 0)
            }, ...types];

            return sendResponse(req, res, 200, 1, { keyword: "success" }, types);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    history: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { date, feedback_field_id, star } = req.body;

            let addWhere = '';
            if (date) {
                addWhere = ` AND date(created_at) = '${date}'`;
            }

            let addWhere_2 = '';
            if (feedback_field_id > 0) {
                addWhere_2 = `AND feedback_field_id = ${feedback_field_id}`;
            }

            if (star) {
                addWhere_2 += ` AND avg_rating = ${star}`;
            }

            let feedbacks = await SELECT.All(`select id as feedback_id, feedback_field_id, (select name from tbl_feedback_fields where id = tbl_feedback.feedback_field_id) as field_name, user_id, (select concat(first_name, ' ', last_name) from tbl_users where id = tbl_feedback.user_id) as user_name, order_id, (select tbl_order.order_no from tbl_order where tbl_order.id = tbl_feedback.order_id) as order_no, comment, avg_rating as rating, status, created_at from tbl_feedback where country = '${country}' ${addWhere + addWhere_2} order by id desc`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, feedbacks);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    summary: async (req, res) => {
        try {
            let { country } = req.loginUser;

            let { restaurant_id } = req.body;

            let addWhere = '';
            if (restaurant_id) {
                addWhere = `AND (select tbl_order.restaurant_branch_id from tbl_order where tbl_order.id = tbl_feedback.order_id) = ${restaurant_id}`;
            }

            let feedback_summary = await SELECT.All(`select feedback_field_id, (select name from tbl_feedback_fields where id = tbl_feedback.feedback_field_id) as name, count(id) as total, SUM(if(avg_rating = 1, 1, 0)) as star_1, SUM(if(avg_rating = 2, 1, 0)) as star_2, SUM(if(avg_rating = 3, 1, 0)) as star_3, SUM(if(avg_rating = 4, 1, 0)) as star_4, SUM(if(avg_rating = 5, 1, 0)) as star_5 from tbl_feedback where country = '${country}' ${addWhere} group by feedback_field_id;`, false);

            let feedback_fields = await SELECT.All(`select id as feedback_field_id, name from tbl_feedback_fields`);

            feedback_summary = feedback_fields.map(field => {
                let found = feedback_summary.find(summary => summary.feedback_field_id == field.feedback_field_id);
                if (!found) {
                    return { ...field, total: 0, star_1: 0, star_2: 0, star_3: 0, star_4: 0, star_5: 0 }
                } else {
                    return found;
                }
            });

            return sendResponse(req, res, 200, 1, { keyword: "success" }, feedback_summary);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    }
}

//////////////////////////////////////////////////////////////////////
//                              Career                              //
//////////////////////////////////////////////////////////////////////

const careers = {
    list: async (req, res) => {
        try {

            let careers = await SELECT.All(`select id as career_id, full_name, email_address, position, concat('${constants.CAREER_IMAGE_PATH}', attachment) as attachment, created_at from tbl_careers`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, careers);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    delete: async (req, res) => {
        try {
            let { career_id } = req.body;

            await DELETE(`DELETE FROM tbl_careers WHERE id = ${career_id}`);

            return sendResponse(req, res, 200, 1, { keyword: "deleted" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_delete' });
        }
    }
}

//////////////////////////////////////////////////////////////////////
//                            Gift Card                             //
//////////////////////////////////////////////////////////////////////

const gift_card_occasion = {
    create: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { name, image } = req.body;

            await INSERT('INSERT INTO tbl_gift_card_occasion SET ?', {
                name,
                image,
                created_by: admin_id
            });

            return sendResponse(req, res, 200, 1, { keyword: "created" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_create' });
        }
    },

    update: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { occasion_id, name, image } = req.body;

            await UPDATE('UPDATE tbl_gift_card_occasion SET ? WHERE id = ?', [{
                name,
                image,
                updated_by: admin_id
            }, occasion_id]);

            return sendResponse(req, res, 200, 1, { keyword: "edited" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_edit' });
        }
    },

    get: async (req, res) => {
        try {
            let occasions = await SELECT.One(`SELECT id as occasion_id, name, concat('${constants.GIFT_CARD_IMAGE_PATH}', image) as image, is_active, created_at, updated_at FROM tbl_gift_card_occasion where id = ${req.body.occasion_id} AND is_delete = 0`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, occasions);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || "failed_to_fetch" });
        }
    },

    list: async (req, res) => {
        try {
            let occasions = await SELECT.All(`SELECT id as occasion_id, name, concat('${constants.GIFT_CARD_IMAGE_PATH}', image) as image, (select count(id) from tbl_gift_card_admin where occasion_id = tbl_gift_card_occasion.id and tbl_gift_card_admin.is_delete = 0) as total_gift_cards, is_active, created_at, updated_at FROM tbl_gift_card_occasion WHERE is_delete = 0 order by created_at desc`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, occasions);
        }
        catch (err) {
            return sendResponse(req, res, 200, 2, { keyword: err.message || "failed_to_fetch" });
        }
    },

    action: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { is_active, occasion_id } = req.body;

            await UPDATE(`UPDATE tbl_gift_card_occasion SET is_active = ${is_active}, updated_by = ${admin_id} WHERE id in (${occasion_id})`);

            return sendResponse(req, res, 200, 1, { keyword: "status_updated" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_update_status" });
        }
    },

    delete: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { occasion_id } = req.body;

            await UPDATE(`UPDATE tbl_gift_card_occasion SET is_delete = 1, updated_by = ${admin_id} WHERE id in (${occasion_id})`);

            return sendResponse(req, res, 200, 1, { keyword: "deleted" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_delete" });
        }
    }
}

//////////////////////////////////////////////////////////////////////
//                            Gift Card                             //
//////////////////////////////////////////////////////////////////////

const gift_card = {
    change_setting: async (req, res) => {
        try {
            let { type, value } = req.body;

            let { setting_value } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${constants.GIFT_CARD_SETTING_KEY}'`);

            if (type == 'get_all') {
                setting_value.image = constants.APP_IMAGE_PATH + setting_value.image;
                return sendResponse(req, res, 200, 1, { keyword: "success" }, setting_value);
            } else {
                if (type == 'pre_defined_amounts') {

                    let amounts = setting_value.pre_defined_amounts;

                    let { amount, action_type } = value;

                    if (action_type == 'add') {
                        amounts.push(amount);
                    } else if (action_type == 'delete') {
                        let deleted = false;
                        amounts = amounts.filter(a => {
                            if (a != amount || deleted) {
                                return true;
                            } else {
                                deleted = true;
                                return false;
                            }
                        });
                    }

                    let updateAmount = sortBy(amounts, [function (o) { return o; }]);

                    setting_value[type] = updateAmount;
                } else {
                    setting_value[type] = value;
                }

                await UPDATE(`UPDATE tbl_app_setting SET setting_value = '${JSON.stringify(setting_value)}' WHERE setting_key = '${constants.GIFT_CARD_SETTING_KEY}'`);

                return sendResponse(req, res, 200, 1, { keyword: "updated" });
            }
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_update" });
        }
    },
    orders: async (req, res) => {
        try {
            let orders = await SELECT.All(`SELECT payment_method, COUNT(*) AS total_orders FROM tbl_order where order_status in ('delivered', 'completed') GROUP BY payment_method ORDER BY total_orders DESC;`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, orders);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_fetch" });
        }
    },
    total_purchase: async (req, res) => {
        let { date } = req.body;
        try {
            let all_occasions = await SELECT.All(`SELECT id as occasion_id, name FROM tbl_gift_card_occasion WHERE is_delete = 0`);

            let occasion_ids = all_occasions.map(o => o.occasion_id);

            let addWhere = '';
            if (date) {
                addWhere = ` AND date(tbl_gift_card_purchase.created_at) = '${date}'`;
            }

            let all_gift_cards = await SELECT.All(`SELECT id as gift_card_id, occasion_id, name, (select count(*) from tbl_gift_card_purchase where gift_card_id = tbl_gift_card_admin.id ${addWhere}) as count FROM tbl_gift_card_admin WHERE occasion_id in (${occasion_ids}) AND is_delete = 0`, false);

            let result = all_occasions.map(occasion => {
                let gift_cards = all_gift_cards.filter(card => card.occasion_id === occasion.occasion_id);
                let subcategories = gift_cards.reduce((acc, card) => {
                    acc[card.name] = (acc[card.name] || 0) + card.count;
                    return acc;
                }, {});

                return {
                    occasion_id: occasion.occasion_id,
                    occasion: occasion.name,
                    details: {
                        total: gift_cards.reduce((acc, card) => acc + card.count, 0),
                        subcategories: subcategories
                    }
                };
            }).filter(occasion => Object.keys(occasion.details.subcategories).length > 0);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, result);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_fetch" });
        }
    },
    create: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { occasion_id, name, image } = req.body;

            let { setting_value } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${constants.GIFT_CARD_SETTING_KEY}'`);

            await INSERT('INSERT INTO tbl_gift_card_admin SET ?', {
                occasion_id,
                name,
                image,
                usage_type: setting_value.usage_type,
                expiry_days: setting_value.expiry_days,
                created_by: admin_id
            });

            return sendResponse(req, res, 200, 1, { keyword: "added" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_add" });
        }
    },
    update: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { gift_card_id, occasion_id, name, image } = req.body;

            let { setting_value } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${constants.GIFT_CARD_SETTING_KEY}'`);

            await UPDATE('UPDATE tbl_gift_card_admin SET ? WHERE id = ?', [{
                occasion_id,
                name,
                image,
                usage_type: setting_value.usage_type,
                expiry_days: setting_value.expiry_days,
                updated_by: admin_id
            }, gift_card_id]);

            return sendResponse(req, res, 200, 1, { keyword: "edited" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_edit" });
        }
    },
    get: async (req, res) => {
        try {
            let gift_card = await SELECT.One(`SELECT id as gift_card_id, occasion_id, name, concat('${constants.GIFT_CARD_IMAGE_PATH}', image) as image, usage_type, expiry_days, is_active, created_at, updated_at FROM tbl_gift_card_admin WHERE id = ${req.body.gift_card_id} AND is_delete = 0`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, gift_card);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || "failed_to_fetch" });
        }
    },
    list: async (req, res) => {
        try {
            let { occasion_id } = req.body;

            let addWhere = '';
            if (occasion_id) {
                addWhere = `AND occasion_id = ${occasion_id}`;
            }

            let gift_cards = await SELECT.All(`SELECT id as gift_card_id, occasion_id, name, concat('${constants.GIFT_CARD_IMAGE_PATH}', image) as image, usage_type, expiry_days, is_active, created_at, updated_at FROM tbl_gift_card_admin WHERE is_delete = 0 ${addWhere} order by created_at desc`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, gift_cards);
        }
        catch (err) {
            return sendResponse(req, res, 200, 2, { keyword: err.message || "failed_to_fetch" });
        }
    },
    purchase_history: async (req, res) => {
        try {
            let date = req.body?.date;
            let { occasion_id } = req.body;

            let addWhere = '';
            if (date) addWhere = ` AND date(created_at) = '${date}'`;
            if (occasion_id) addWhere += ` AND occasion_id = ${occasion_id}`;

            let data = await SELECT.All(`select gift_order_number as gift_card_purchase_id, user_id, (select concat(first_name, ' ', last_name) from tbl_users where id = gcp.user_id) as sender_name, (select name from tbl_gift_card_admin where id = gcp.gift_card_id) as gift_card_name, receiver_name, is_fully_redeem, payment_method, is_active, created_at from tbl_gift_card_purchase as gcp where gcp.is_delete = 0 ${addWhere} order by id desc`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || "failed_to_fetch" });
        }
    },
    purchase_details: async (req, res) => {
        try {
            let { gift_card_purchase_id } = req.body;

            let gift_card = await SELECT.One(`select gcp.id as gift_card_purchase_id, gcp.gift_card_id, gcp.user_id, (select id from tbl_users where country_code = gcp.receiver_country_code and phone = gcp.receiver_phone_number) as receiver_id, gcp.receiver_name, gcp.receiver_country_code, gcp.receiver_phone_number, gcp.receiver_email, gca.name as gift_card_name, concat('${constants.GIFT_CARD_IMAGE_PATH}', gca.image) as gift_card_image, gcp.gift_code, gcp.title, gcp.message, gcp.amount, gcp.created_at, gcp.expiry_date, gcp.transaction_id, gcp.payment_method from tbl_gift_card_purchase as gcp join tbl_gift_card_admin as gca on gcp.gift_card_id = gca.id where gcp.id = ${gift_card_purchase_id} AND gcp.is_delete = 0`);

            let buyer_details = await SELECT.One(`select id as user_id, concat(first_name, ' ', last_name) as full_name, country_code, phone, concat('${constants.USER_IMAGE_PATH}', if(profile_image IS NULL OR profile_image = '', 'default.png', profile_image)) as profile_image, currency_name as currency from tbl_users where id = ${gift_card.user_id}`);

            let receiver_details = {};
            if (gift_card.receiver_id) {
                receiver_details = await SELECT.One(`select id as user_id, concat(first_name, ' ', last_name) as full_name, country_code, phone, concat('${constants.USER_IMAGE_PATH}', if(profile_image IS NULL OR profile_image = '', 'default.png', profile_image)) as profile_image, currency_name as currency from tbl_users where id = ${gift_card.receiver_id}`);
            } else {
                receiver_details = {
                    user_id: null,
                    full_name: gift_card.receiver_name,
                    country_code: gift_card.receiver_country_code,
                    phone: gift_card.receiver_phone_number,
                    profile_image: constants.USER_IMAGE_PATH + 'default.png',
                    currency: buyer_details.currency
                }
            }

            let card_history = await SELECT.All(`SELECT gcu.id as reedem_id, (SELECT order_no FROM tbl_order WHERE id = gcu.order_id) as order_no, (SELECT service_type FROM tbl_order WHERE id = gcu.order_id) as service_type, gcu.usage_amount, gcu.redeem_type, 'debit' as transaction_type, gcu.created_at FROM tbl_gift_card_usage_histroy as gcu WHERE gcu.gift_id = ${gift_card_purchase_id}`, false);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, {
                gift_card,
                buyer_details,
                receiver_details,
                card_history: [{
                    "reedem_id": 0,
                    "order_no": null,
                    "service_type": null,
                    "usage_amount": gift_card.amount,
                    "currency": buyer_details.currency,
                    "redeem_type": "Received",
                    "transaction_type": "credit",
                    "created_at": gift_card.created_at
                }, ...card_history?.map(history => {
                    history.balance = gift_card.amount - history.usage_amount;
                    history.currency = buyer_details.currency;
                    return history;
                })]
            });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || "failed_to_fetch" });
        }
    },
    user_gift_card_action: async (req, res) => {
        try {
            let { gift_card_purchase_id, type, value } = req.body;

            await UPDATE(`UPDATE tbl_gift_card_purchase SET ${type} = ${value} WHERE id = ${gift_card_purchase_id}`);

            return sendResponse(req, res, 200, 1, { keyword: "updated" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_update" });
        }
    },
    action: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { is_active, gift_card_id } = req.body;

            await UPDATE(`UPDATE tbl_gift_card_admin SET is_active = ${is_active}, updated_by = ${admin_id} WHERE id in (${gift_card_id})`);

            return sendResponse(req, res, 200, 1, { keyword: "status_updated" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_update_status" });
        }
    },
    delete: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { gift_card_id } = req.body;

            await UPDATE(`UPDATE tbl_gift_card_admin SET is_delete = 1, updated_by = ${admin_id} WHERE id in (${gift_card_id})`);

            return sendResponse(req, res, 200, 1, { keyword: "deleted" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_delete" });
        }
    },
    resend: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { gift_card_purchase_id } = req.body;

            let { gift_card_id, user_id, receiver_country_code, receiver_phone_number, is_active, is_delete } = await SELECT.One(`SELECT gift_card_id, user_id, receiver_country_code, receiver_phone_number, is_active, is_delete FROM tbl_gift_card_purchase WHERE id = ${gift_card_purchase_id}`);

            if (is_active == 0) {
                return sendResponse(req, res, 200, 0, { keyword: "gift_card_deactivated" });
            } else if (is_delete == 1) {
                return sendResponse(req, res, 200, 0, { keyword: "gift_card_deleted" });
            }

            let [{ first_name: sender_first_name }, receiverUserDetails, { image }] = await Promise.all([
                SELECT.One(`SELECT id, first_name FROM tbl_users WHERE id = '${user_id}' AND is_active = 1 AND is_delete = 0 ORDER BY created_at DESC`, false),
                SELECT.One(`SELECT tu.id, tu.first_name, tud.device_token, tud.device_type FROM tbl_users AS tu LEFT JOIN tbl_user_device AS tud ON tu.id = tud.user_id WHERE ((tu.country_code = '${receiver_country_code}' AND tu.phone = '${receiver_phone_number}') OR (tu.whatsapp_country_code = '${receiver_country_code}' AND tu.whatsapp_phone = '${receiver_phone_number}')) AND tu.is_active = 1 AND tu.is_delete = 0 ORDER BY tu.created_at DESC`, false),
                SELECT.One(`SELECT expiry_days, image FROM tbl_gift_card_admin WHERE id = '${gift_card_id}'`)
            ]);

            if (isEmpty(receiverUserDetails)) {
                // ----- PENDING ----- : If the receiver is not registered, Still the sender can place the order, As soon as the Receiver registers then they receives the pop up right away..
                return sendResponse(req, res, 200, 0, { keyword: "receiver_not_registered" });
            } else {
                let push_params = {
                    sender_id: admin_id,
                    sender_type: 'admin',
                    receiver_id: receiverUserDetails.id,
                    receiver_type: "customer",
                    title: `You've Got a Gift Card!`,
                    body: `Dear ${receiverUserDetails.first_name} you received a gift card from ${sender_first_name}`,
                    tag: "purchase_gift_card",
                    is_read: 0,
                    is_insert: 1,
                    image_url: constants.GIFT_CARD_IMAGE_PATH + image,
                    image: image, // gift card image
                    ref_id: gift_card_purchase_id, // id of purchased gift
                    ref_tbl_name: "gift_card",
                };

                setTimeout(() => {
                    sendPush(push_params);
                }, 1000);

                return sendResponse(req, res, 200, 1, { keyword: "success" });
            }
        }
        catch (e) {
            console.log('e :', e);
            return sendResponse(req, res, 200, 0, { keyword: "failed" });
        }
    }
}

//////////////////////////////////////////////////////////////////////
//                            campaigns                             //
//////////////////////////////////////////////////////////////////////

const campaigns = {
    add_event: async (req, res) => {
        let { admin_id, country } = req.loginUser;
        let { name, description, start_date, start_time, end_date, end_time, media_file, pop_up_display_times } = req.body;

        if (check_file_format([media_file], events_allowed_media_files)) {
            return sendResponse(req, res, 200, 0, {
                keyword: "invalid_file_format",
                components: { format: events_allowed_media_files.join(', ') }
            });
        }

        try {
            let event_id = await INSERT('INSERT INTO tbl_campaign_events SET ?', {
                name,
                description,
                start_date,
                start_time,
                end_date,
                end_time,
                media_file: media_file,
                pop_up_display_times,
                country: country
            });

            let total_minites = moment(end_date + ' ' + end_time).diff(moment(start_date + ' ' + start_time), 'minutes');
            let array_push_times = [];

            for (let i = 0; i < pop_up_display_times; i++) {
                let time = moment(start_date + ' ' + start_time).add(i * total_minites / pop_up_display_times, 'minutes').format('YYYY-MM-DD HH:mm:ss');
                array_push_times.push(time);

                await INSERT('INSERT INTO tbl_notif_admin_sent_init SET ?', {
                    title: name,
                    description: description,
                    send_date: moment(time).format('YYYY-MM-DD'),
                    send_time: moment(time).format('HH:mm:ss'),
                    send_utc_datetime: time,
                    mode: "Push Notification",
                    user_type: "Customer",
                    media_name: media_file,
                    push_tag: "campaign_notification",
                    country: country,
                    notif_filter_id: 1,
                    notif_sub_filter_id: null,
                    notif_filter_value: null,
                    excel_sheet_name: null,
                    created_by: admin_id,
                    is_send_internal: 1,
                    internal_type: "campaign",
                    ref_pm_id: event_id,
                    ref_tbl_name: "tbl_campaign_events",
                    other_data: JSON.stringify({
                        image_url: constants.CAMPAIGN_EVENTS_MEDIA_PATH + media_file,
                    }),
                });
            }

            return sendResponse(req, res, 200, 1, { keyword: "added" }, { event_id });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_add' });
        }
    },
    edit_event: async (req, res) => {
        let { admin_id } = req.loginUser;
        let { event_id, name, description, start_date, start_time, end_date, end_time, media_file, pop_up_display_times } = req.body;

        if (check_file_format([media_file], events_allowed_media_files)) {
            return sendResponse(req, res, 200, 0, {
                keyword: "invalid_file_format",
                components: { format: events_allowed_media_files.join(', ') }
            });
        }

        try {
            await UPDATE(`UPDATE tbl_campaign_events SET ? WHERE id = ${event_id}`, {
                name,
                description,
                start_date,
                start_time,
                end_date,
                end_time,
                media_file,
                pop_up_display_times
            });

            let total_minites = moment(end_date + ' ' + end_time).diff(moment(start_date + ' ' + start_time), 'minutes');
            let array_push_times = [];

            DELETE(`DELETE FROM tbl_notif_admin_sent_init WHERE ref_pm_id = ${event_id} AND ref_tbl_name = 'tbl_campaign_events'`).then(async() => {

                for (let i = 0; i < pop_up_display_times; i++) {
                    let time = moment(start_date + ' ' + start_time).add(i * total_minites / pop_up_display_times, 'minutes').format('YYYY-MM-DD HH:mm:ss');
                    array_push_times.push(time);

                    await INSERT('INSERT INTO tbl_notif_admin_sent_init SET ?', {
                        title: name,
                        description: description,
                        send_date: moment(time).format('YYYY-MM-DD'),
                        send_time: moment(time).format('HH:mm:ss'),
                        send_utc_datetime: time,
                        mode: "Push Notification",
                        user_type: "Customer",
                        media_name: media_file,
                        push_tag: "campaign_notification",
                        notif_filter_id: 1,
                        notif_sub_filter_id: null,
                        notif_filter_value: null,
                        excel_sheet_name: null,
                        created_by: admin_id,
                        is_send_internal: 1,
                        internal_type: "campaign",
                        ref_pm_id: event_id,
                        ref_tbl_name: "tbl_campaign_events",
                        other_data: JSON.stringify({
                            image_url: constants.CAMPAIGN_EVENTS_MEDIA_PATH + media_file,
                        }),
                    });
                }
            });

            return sendResponse(req, res, 200, 1, { keyword: "edited" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_edit' });
        }
    },
    list_events: async (req, res) => {
        try {
            let events = await SELECT.All(`SELECT id as event_id, name, description, concat('${constants.CAMPAIGN_EVENTS_MEDIA_PATH}', media_file) as media_file, is_active FROM tbl_campaign_events ORDER BY created_at DESC`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, events);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_fetch' });
        }
    },
    get_event: async (req, res) => {
        try {
            let { event_id } = req.body;

            let event = await SELECT.One(`SELECT id as event_id, name, description, DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date, start_time, DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date, end_time, concat('${constants.CAMPAIGN_EVENTS_MEDIA_PATH}', media_file) as media_file, pop_up_display_times, created_at FROM tbl_campaign_events WHERE id = ${event_id}`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, event);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    action: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { event_id, type, value } = req.body;

            let allowd_types = ['is_active', 'is_delete'];
            if (!allowd_types.includes(type)) {
                return sendResponse(req, res, 200, 0, { keyword: "invalid_type" });
            }

            if (type === 'is_delete') {
                await checkRolePermissionInModel(admin_id, "campaigns", "delete");

                await DELETE(`DELETE FROM tbl_campaign_events WHERE id = ${event_id}`);

                await DELETE(`DELETE FROM tbl_notif_admin_sent_init WHERE ref_pm_id = ${event_id} AND ref_tbl_name = 'tbl_campaign_events'`);
            } else {
                await checkRolePermissionInModel(admin_id, "campaigns", "edit");

                await UPDATE(`UPDATE tbl_campaign_events SET is_active = ${value} WHERE id = ${event_id}`);
            }

            return sendResponse(req, res, 200, 1, { keyword: "status_updated" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_update_status' });
        }
    }
}

//////////////////////////////////////////////////////////////////////
//                           Notification                           //
//////////////////////////////////////////////////////////////////////

const notification = {
    send: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;

            let { title, description, send_date, send_time, send_utc_datetime, mode, user_type, media_name = null, notif_filter_name, notif_sub_filter_name, notif_filter_value, excel_sheet_name } = req.body;

            let notif_filter_id = null;
            let notif_sub_filter_id = null;

            // Fetch the main filter ID and sub-filter ID concurrently
            let [main_filter, sub_filter] = await Promise.all([
                SELECT.One(`SELECT id FROM tbl_notif_admin_filters WHERE filter_type = '${user_type}' AND filter_name = '${notif_filter_name}'`, false),
                notif_sub_filter_name
                    ? SELECT.One(`SELECT id FROM tbl_notif_admin_filters WHERE filter_type = '${user_type}' AND filter_name = '${notif_sub_filter_name}' AND sub_filter = '${notif_filter_name}'`, false)
                    : Promise.resolve(null)
            ]);

            notif_filter_id = main_filter?.id || null;
            notif_sub_filter_id = sub_filter?.id || null;

            await INSERT('INSERT INTO tbl_notif_admin_sent_init SET ?', {
                title,
                description,
                send_date,
                send_time,
                send_utc_datetime,
                mode,
                user_type,
                media_name,
                notif_filter_id: notif_filter_id,
                notif_sub_filter_id: notif_sub_filter_id || null,
                notif_filter_value: notif_filter_value || null,
                excel_sheet_name: excel_sheet_name || null,
                created_by: admin_id
            });

            return sendResponse(req, res, 200, 1, { keyword: "added" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_add" });
        }
    },
    filter_listing: async (req, res) => {
        try {
            let { filter_type, main_filter, user_type } = req.body;

            let filter = [];
            if (filter_type == 'main_filter') {
                filter = await SELECT.All(`SELECT id as main_filter_id, filter_name as name, is_required_value, (select count(*) as count from tbl_notif_admin_filters where sub_filter = main.filter_name) != 0 as has_sub_filters FROM tbl_notif_admin_filters as main WHERE filter_type = '${user_type}' AND sub_filter IS NULL`);
            } else {
                filter = await SELECT.All(`SELECT id as sub_filter_id, filter_name as name, is_required_value FROM tbl_notif_admin_filters WHERE filter_type = '${user_type}' AND sub_filter = '${main_filter}'`);
            }

            return sendResponse(req, res, 200, 1, { keyword: "success" }, filter);

        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    list_count: async (req, res) => {
        try {

            let data = await SELECT.One(`SELECT COUNT(*) as total, ifnull(sum(case when status = 'Sent' then 1 else 0 end), 0) as success, ifnull(sum(case when status = 'Failed' then 1 else 0 end), 0) as failed FROM tbl_notif_admin_sent_log`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);

        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    list: async (req, res) => {
        try {

            let data = await SELECT.All(`SELECT id as notification_id, title, description, send_date, send_time, send_utc_datetime, mode, user_type, ifnull(concat('${constants.OTHER_IMAGE_PATH}', media_name), '') as media_name, status FROM tbl_notif_admin_sent_init where is_send_internal = 0 order by id`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    history: async (req, res) => {
        try {
            let { notification_id } = req.body;

            let history = await SELECT.All(`SELECT n.id as notif_sent_id, n.receiver_id, ni.title as title, ni.description as description, case when n.receiver_id is null then 'Unknown' when ni.user_type in ('Customer', 'Single Device', 'Excel Upload') then ifnull(concat(u.first_name, ' ', u.last_name), 'Unknown') when ni.user_type = 'Rider' then ifnull(concat(ru.first_name, ' ', ru.last_name), 'Unknown') when ni.user_type = 'Branch' then ifnull(ra.name, 'Unknown') else 'Unknown' end as receiver_name, case when n.receiver_id is null then concat('${constants.USER_IMAGE_PATH}', 'default.png') when ni.user_type in ('Customer', 'Single Device', 'Excel Upload') then concat('${constants.USER_IMAGE_PATH}', if(u.profile_image IS NULL OR u.profile_image = '', 'default.png', u.profile_image)) when ni.user_type = 'Rider' then concat('${constants.RIDER_IMAGE_PATH}', IFNULL(ru.profile_image, 'default.png')) when ni.user_type = 'Branch' then (select concat('${constants.RESTAURANT_IMAGE_PATH}', tbl_media_files.name) from tbl_media_files where id in (ra.image_ids) limit 1) else 'Unknown' end as receiver_profile, ni.user_type, ni.mode, n.status, n.created_at FROM tbl_notif_admin_sent_log AS n join tbl_notif_admin_sent_init AS ni on n.notification_id = ni.id left join tbl_users AS u on n.receiver_id = u.id left join tbl_rider_users AS ru on n.receiver_id = ru.id left join tbl_restaurants AS ra on n.receiver_id = ra.id WHERE n.notification_id = ${notification_id} ORDER BY n.id DESC`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, history);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    retry: async (req, res) => {
        try {
            let { notif_sent_id } = req.body;

            let notification = await SELECT.One(`SELECT ni.created_by as admin_id, ni.title, ni.description, ni.media_name, ni.mode, ni.user_type, n.receiver_id, n.phone, n.country_code FROM tbl_notif_admin_sent_log AS n join tbl_notif_admin_sent_init AS ni on n.notification_id = ni.id WHERE n.id = ${notif_sent_id}`);

            let receiver_data = {};
            let query = '';
            if (notification.user_type == 'Customer' || notification.user_type == 'Single Device') {

                let field = `id as receiver_id, (SELECT group_concat(device_token) FROM tbl_user_device WHERE user_id = tbl_users.id AND CHAR_LENGTH(device_token) > 140) as device_token`; // default push notification
                if (notification.mode == 'SMS') { // SMS
                    field = 'id as receiver_id, country_code, phone';
                } else if (notification.mode == 'Email') { // Email
                    field = 'id as receiver_id, email, country_name as country';
                } else if (notification.mode == 'WhatsApp') { // WhatsApp
                    field = `id as receiver_id, IF( whatsapp_country_code IS NOT NULL AND whatsapp_country_code != '', whatsapp_country_code, null ) AS country_code, IF( whatsapp_phone IS NOT NULL AND whatsapp_phone != '', whatsapp_phone, null ) AS phone`;
                }

                query = `SELECT ${field} FROM tbl_users WHERE is_verify = 1 AND is_delete = 0 AND is_active = 1 AND is_guest_user = 0 AND id = ${notification.receiver_id}`;

            } else if (notification.user_type == 'Branch') {

                let field = 'id as receiver_id, if(CHAR_LENGTH(device_token) > 140, device_token, null) as device_token' // default push notification
                if (notification.mode == 'SMS' || notification.mode == 'WhatsApp') { // SMS or WhatsApp
                    field = `id as receiver_id, (CASE WHEN country = 'Uganda' THEN '+256' WHEN country = 'Kenya' THEN '+254' ELSE NULL END) as country_code, phone_number as phone`
                } else if (notification.mode == 'Email') { // Email
                    field = 'id as receiver_id, email, country'
                }

                query = `SELECT ${field} FROM tbl_restaurants WHERE is_delete = 0 AND is_active = 1 AND id = ${notification.receiver_id}`;

            } else if (notification.user_type == 'Rider') {

                let field = 'id as receiver_id, (SELECT group_concat(device_token) FROM tbl_rider_user_device WHERE rider_id = tbl_rider_users.id AND CHAR_LENGTH(device_token) > 140) as device_token' // default push notification

                if (notification.mode == 'SMS' || notification.mode == 'WhatsApp') { // SMS or WhatsApp
                    field = `id as receiver_id, (CASE WHEN country_name = 'Uganda' THEN '+256' WHEN country_name = 'Kenya' THEN '+254' ELSE NULL END) as country_code, phone`
                } else if (notification.mode == 'Email') { // Email
                    field = 'id as receiver_id, email, country_name as country'
                }

                query = `SELECT ${field} FROM tbl_rider_users WHERE is_active = 1 AND is_delete = 0 AND id = ${notification.receiver_id}`;

            } else if (notification.user_type == 'Excel Upload') {

                receiver_data.country_code = notification.country_code;
                receiver_data.phone = notification.phone;

            }

            if (notification.user_type != 'Excel Upload') {

                receiver_data = await SELECT.One(query);

            }

            let response = {
                status: false,
                error: null
            };

            if (notification.mode == 'Push Notification') {

                let push_params = {
                    sender_id: notification.admin_id,
                    sender_type: 'admin',
                    receiver_id: receiver_data.receiver_id,
                    receiver_type: (notification.user_type == 'Customer' || notification.user_type == 'Single Device') ? 'customer' : notification.user_type == 'Rider' ? 'rider' : notification.user_type == 'Branch' ? 'branch' : notification.user_type == 'Call Center' ? 'call_center' : 'system',
                    title: notification.title,
                    body: notification.description,
                    device_token: receiver_data.device_token,
                    tag: "admin_notification",
                    image_url: constants.OTHER_IMAGE_PATH + notification.media_name,
                    image: notification.media_name, // gift card image
                };

                response = await sendPush(push_params);

            } else if (notification.mode == 'SMS') {

                if (receiver_data.country_code === '+256') {

                    response = {
                        status: false,
                        error: 'Under Development'
                    };

                } else if (receiver_data.country_code === '+254') {

                    response = await sendKenyaSMS({
                        country_code: receiver_data.country_code,
                        phone: receiver_data.phone,
                        message: `${notification.title}\n${notification.description}`
                    });

                }

            } else if (notification.mode == 'Email') {

                if (receiver_data.country === 'Uganda') {

                    response = await sendUgandaMail({
                        from: `"${constants.APP_NAME}" <${process.env.EMAIL_SMTP_UGANDA_USERNAME}>`,
                        to: receiver_data.email,
                        subject: notification.title,
                        html: notification.description,
                    });

                } else if (receiver_data.country === 'Kenya') {

                    response = await sendKenyaMail({
                        from: `"${constants.APP_NAME}" <${process.env.EMAIL_SMTP_KENYA_USERNAME}>`,
                        to: receiver_data.email,
                        subject: notification.title,
                        html: notification.description
                    });

                }

            } else if (notification.mode == 'WhatsApp') {

                response = {
                    status: false,
                    error: 'Under Development'
                }

            }

            if (response.status !== undefined) {
                await UPDATE(`update tbl_notif_admin_sent_log set ? where id = ${notif_sent_id}`, {
                    status: response.status ? 'Sent' : 'Failed',
                    failed_reason: response.status ? null : (response?.error || 'Unknown error')
                });
            }

            return sendResponse(req, res, 200, 1, { keyword: "status_updated" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_update_status' });
        }
    },
    search_user: async (req, res) => {
        try {
            let { search_phone } = req.body;

            let users = await SELECT.All(`SELECT id as user_id, concat(first_name, ' ', last_name) as full_name, CONCAT(country_code, ' ',phone) as phone FROM tbl_users WHERE is_verify = 1 AND is_delete = 0 AND is_active = 1 AND is_guest_user = 0 AND CONCAT(country_code, ' ',phone) LIKE '%${search_phone}%' LIMIT 15`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, users);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    sub_category_list: async (req, res) => {
        try {

            let data = await SELECT.All(`SELECT id as sub_category_id, name from tbl_sub_categories where category_id not in (select id from tbl_categories where is_delete = 1 And is_active = 0) and is_active = 1 and is_delete = 0 order by name`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    delete_log: async (req, res) => {
        try {
            let { notif_sent_id } = req.body;

            await DELETE(`DELETE FROM tbl_notif_admin_sent_log WHERE id = ${notif_sent_id}`);

            return sendResponse(req, res, 200, 1, { keyword: "deleted" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_delete' });
        }
    },
    get_log_details: async (req, res) => {
        try {
            let { notif_sent_id } = req.body;

            let details = await SELECT.One(`SELECT n.id as notif_sent_id, ni.title as title, ni.description as description, ni.user_type, ni.mode, n.status, ifnull(concat(ni.media_name, '${constants.OTHER_IMAGE_PATH}'), '') as media_name, n.created_at FROM tbl_notif_admin_sent_log AS n join tbl_notif_admin_sent_init AS ni on n.notification_id = ni.id WHERE n.id = ${notif_sent_id}`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, details);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    }
}

//////////////////////////////////////////////////////////////////////
//                              Wallet                              //
//////////////////////////////////////////////////////////////////////

const wallet = {
    dashboard: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { start_date, end_date } = req.body;

            let addWhere = '';
            if (start_date && end_date) {
                addWhere = `AND t.created_at BETWEEN '${start_date}' AND '${end_date}'`;
            } else if (start_date) {
                addWhere = `AND t.created_at >= '${start_date}'`;
            } else if (end_date) {
                addWhere = `AND t.created_at <= '${end_date}'`;
            }

            // main cards
            let data = await SELECT.One(`SELECT SUM(t.wallet_amount) AS total_revenue, SUM(CASE WHEN t.transaction_type = 'credit' THEN t.wallet_amount ELSE 0 END) AS total_credits, SUM(CASE WHEN t.transaction_type = 'debit' THEN t.wallet_amount ELSE 0 END) AS total_debits FROM tbl_user_wallet_transaction_history t join tbl_users u on t.user_id = u.id WHERE u.is_active = 1 AND is_delete = 0 AND country_name = '${country}' ${addWhere}`, false);

            let { setting_value } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${constants.WALLET_PAYMENT_MODES_SETTINGS_KEY}' AND country_name = '${country}'`, false);

            // report
            let reports = await SELECT.All(`SELECT DATE(t.created_at) AS transaction_date, SUM(t.wallet_amount) AS total_revenue, SUM(CASE WHEN t.transaction_type = 'credit' THEN t.wallet_amount ELSE 0 END) AS total_credits, SUM(CASE WHEN t.transaction_type = 'debit' THEN t.wallet_amount ELSE 0 END) AS total_debits FROM tbl_user_wallet_transaction_history t join tbl_users u on t.user_id = u.id WHERE u.is_active = 1 AND is_delete = 0 AND country_name = '${country}' ${addWhere} GROUP BY DATE(t.created_at) ORDER BY transaction_date ASC;`, false);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, {
                total_revenue: data.total_revenue || 0,
                total_credits: data.total_credits || 0,
                total_debits: data.total_debits || 0,
                payment_modes: setting_value || {},
                reports
            });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    history: async (req, res) => {
        try {
            let { country } = req.loginUser;

            let history = await SELECT.All(`select tuwth.id as wallet_transaction_id, tuwth.user_id, concat(u.first_name, ' ', u.last_name) as user_name, (select name from tbl_admin_users_color_codes where id = u.user_color_code_id) as user_type, transaction_type, transaction_id, payment_method, tuwth.wallet_amount, payment_status, tuwth.created_at from tbl_user_wallet_transaction_history as tuwth join tbl_users as u on tuwth.user_id = u.id where u.country_name = '${country}' AND u.is_active = 1 and u.is_delete = 0`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, history);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    user_list: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { year, date } = req.body;

            let addWhere = '';
            if (year) {
                addWhere = `AND YEAR(created_at) = ${year}`;
            }
            if (date) {
                addWhere = `AND DATE(created_at) = '${date}'`;
            }

            let users = await SELECT.All(`SELECT row_number() over (order by id desc) AS sr_no, u.id AS user_id, CONCAT(u.first_name, ' ', u.last_name) AS customer_name, u.external_id AS customer_id, u.phone AS contact_number, u.email AS email_address, u.wallet_amount AS wallet_balance FROM tbl_users as u WHERE u.country_name = '${country}' AND u.signup_step = 'PERSONAL_INFO' AND is_active = 1 AND is_delete = 0 ${addWhere} ORDER BY created_at DESC`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, users);
        } catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    user_details: async (req, res) => {
        try {
            let { user_id } = req.body;

            let user = await SELECT.One(`SELECT id as user_id, CONCAT(first_name, ' ', last_name) as full_name, concat('${constants.USER_IMAGE_PATH}', if(profile_image IS NULL OR profile_image = '', 'default.png', profile_image)) as profile_image, phone, external_id, email, wallet_amount FROM tbl_users WHERE id = ${user_id} AND is_active = 1 AND is_delete = 0`);

            let { total_credit = 0, total_debit = 0 } = await SELECT.One(`SELECT ifnull(SUM(IF(transaction_type = 'credit', wallet_amount, 0)), 0) AS total_credit, ifnull(SUM(IF(transaction_type = 'debit', wallet_amount, 0)), 0) AS total_debit FROM tbl_user_wallet_transaction_history t where user_id = ${user_id}`, false);

            let wallet_history = await SELECT.All(`SELECT row_number() over (order by id desc) as row_num, id as wallet_transaction_id, user_id, transaction_type, transaction_id, wallet_amount, payment_method, payment_status, created_at, admin_comment FROM tbl_user_wallet_transaction_history where user_id = ${user_id}`, false);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, {
                user,
                balance: {
                    total_credit: total_credit || 0,
                    total_debit: total_debit || 0,
                    wallet_balance: user.wallet_amount || 0
                },
                wallet_history
            });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },
    edit_wallet: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { user_id, wallet_amount, transaction_type, admin_comment } = req.body;

            let { wallet_amount: current_wallet_amount } = await SELECT.One(`SELECT wallet_amount FROM tbl_users WHERE id = ${user_id} AND is_active = 1 AND is_delete = 0`);

            let insert_wallet_amount = parseFloat(wallet_amount);
            if (transaction_type == 'credit') {
                wallet_amount = parseFloat(current_wallet_amount) + parseFloat(wallet_amount);
            } else if (transaction_type == 'debit') {
                // if current wallet amount is ex:- 1000 and admin has debit 1100 user wallet amount will be 0 not minus.
                if (parseFloat(current_wallet_amount) < parseFloat(wallet_amount)) {
                    wallet_amount = 0;
                    insert_wallet_amount = parseFloat(current_wallet_amount);
                } else {
                    wallet_amount = parseFloat(current_wallet_amount) - parseFloat(wallet_amount);
                }
            }

            await INSERT('INSERT INTO tbl_user_wallet_transaction_history SET ?', {
                user_id,
                type: 'admin',
                transaction_type,
                transaction_id: null,
                wallet_amount: insert_wallet_amount,
                payment_method: 'wallet',
                payment_status: 'paid',
                admin_comment: admin_comment || null,
                is_by_admin: 1,
                admin_id: admin_id
            });

            // update in user data
            await UPDATE(`UPDATE tbl_users SET wallet_amount = ${wallet_amount} WHERE id = ${user_id}`);

            return sendResponse(req, res, 200, 1, { keyword: "added" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_add' });
        }
    },
    edit_payment_mode: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { mode, status } = req.body;

            let { setting_value } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${constants.WALLET_PAYMENT_MODES_SETTINGS_KEY}' AND country_name = '${country}'`);

            setting_value[mode] = (status == 'active') ? true : false;

            await UPDATE(`UPDATE tbl_app_setting SET setting_value = '${JSON.stringify(setting_value)}' WHERE setting_key = '${constants.WALLET_PAYMENT_MODES_SETTINGS_KEY}' AND country_name = '${country}'`);

            return sendResponse(req, res, 200, 1, { keyword: "success" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message });
        }
    }
}

module.exports = {
    promo_code,
    feedback,
    careers,
    gift_card_occasion,
    gift_card,
    campaigns,
    notification,
    wallet
};