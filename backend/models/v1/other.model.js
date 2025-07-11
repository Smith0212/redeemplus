const { SELECT, INSERT, UPDATE, DELETE } = require('../../utils/SQLWorker');
const { sendResponse } = require('../../middleware');
const { escape } = require('mysql2');
const cryptoLib = require('cryptlib');
const shaKey = cryptoLib.getHashSha256(process.env.PASSWORD_ENC_KEY, 32);
const { ADMIN_IMAGE_PATH } = require('../../config/constants');


let otherModel = {
    credentials: async (req, res) => {
        try {
            let keys = await SELECT.All('SELECT id, key_name, value FROM tbl_credentials');

            const result = keys.reduce((obj, item) => {
                obj[item.key_name] = cryptoLib.decrypt(item.value, shaKey, process.env.IV);
                return obj;
            }, {});

            return sendResponse(req, res, 200, 1, { keyword: "success" }, result);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed' });
        }
    },
    page_contents: {
        get: async (req, res) => {
            try {
                let { page_id } = req.body;

                let page = await SELECT.One(`SELECT id as page_id, name, content, user_type FROM tbl_page_contents WHERE id = ${page_id}`);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, page);
            }
            catch (err) {
                return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
            }
        },

        create: async (req, res) => {
            try {

                let { name, user_type } = req.body;

                let page_id = await INSERT('INSERT INTO tbl_page_contents SET ?', { name, user_type });

                return sendResponse(req, res, 200, 1, { keyword: "page_created" }, { page_id });
            }
            catch (err) {
                return sendResponse(req, res, 200, 0, { keyword: 'failed' });
            }
        },

        update: async (req, res) => {
            try {
                let { page_id, content, user_type } = req.body;

                let addWhere = '';
                if (user_type) {
                    addWhere = `user_type = '${user_type}',`;
                }

                await UPDATE(`UPDATE tbl_page_contents SET ${addWhere} content = ${escape(content)} WHERE id = ${page_id}`);

                return sendResponse(req, res, 200, 1, { keyword: "page_updated" });
            }
            catch (err) {
                return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_update' });
            }
        },

        list: async (req, res) => {
            try {
                let pages = await SELECT.All('SELECT id as page_id, name, user_type, created_at, updated_at FROM tbl_page_contents');

                return sendResponse(req, res, 200, 1, { keyword: "success" }, pages);
            }
            catch (err) {
                return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
            }
        },

        delete: async (req, res) => {
            try {
                let { page_id } = req.body;

                await DELETE(`DELETE FROM tbl_page_contents WHERE id = ${page_id}`);

                return sendResponse(req, res, 200, 1, { keyword: "deleted" });
            }
            catch (err) {
                return sendResponse(req, res, 200, 0, { keyword: 'failed_to_delete' });
            }
        }
    },

    faq: async (req, res) => {
        try {
            let { language_code, user_type } = req.body;

            let faq = await SELECT.All(`SELECT id as faq_id, question, answer FROM tbl_faq WHERE language_code = '${language_code}' AND user_type = '${user_type}' ORDER BY sort_order ASC`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, faq);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    crud_faq: async (req, res) => {
        try {
            let { type, value } = req.body;
            let { faq_id = null, question, answer, language_code, user_type, sort_order = 0 } = value;

            if (type === 'create') {

                await INSERT('INSERT INTO tbl_faq SET ?', { question, answer, language_code, user_type, sort_order });
                return sendResponse(req, res, 200, 1, { keyword: "created" });

            } else if (type === 'update') {

                await UPDATE(`UPDATE tbl_faq SET ? WHERE id = ${faq_id}`, {
                    question, answer, sort_order, language_code, user_type
                });
                return sendResponse(req, res, 200, 1, { keyword: "updated" });

            } else if (type === 'delete') {

                await DELETE(`DELETE FROM tbl_faq WHERE id = ${faq_id}`);
                return sendResponse(req, res, 200, 1, { keyword: "deleted" });

            } else if (type === 'get') {

                let faq = await SELECT.One(`SELECT id as faq_id, question, answer, language_code, user_type, sort_order FROM tbl_faq WHERE id = ${faq_id}`);
                return sendResponse(req, res, 200, 1, { keyword: "success" }, faq);

            } else {

                let faq = await SELECT.All(`SELECT id as faq_id, question, answer, language_code, user_type FROM tbl_faq ORDER BY sort_order ASC`);
                return sendResponse(req, res, 200, 1, { keyword: "success" }, faq);

            }
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    select_option_list: async (req, res) => {
        let { type, search, country, category_id } = req.body;
        try {
            let tableMap = {
                rider: 'tbl_rider_users',
                restaurant: 'tbl_restaurants',
                customer: 'tbl_users',
                category: 'tbl_categories',
                sub_category: 'tbl_sub_categories',
                inventory_category: 'tbl_inventory_categories',
                inventory_sub_category: 'tbl_inventory_sub_categories',
            };

            let addWhere = '';
            if (country) {
                if (tableMap[type] === 'tbl_rider_users' || tableMap[type] === 'tbl_users') {
                    addWhere = `WHERE country_name = '${country}'`;
                } else if (tableMap[type] === 'tbl_restaurants') {
                    addWhere = `WHERE currency_name = '${country}'`;
                }
            }

            if (search) {
                addWhere += addWhere ? ` AND name LIKE '%${search}%'` : `WHERE name LIKE '%${search}%'`;
            }

            let data = [];
            if (tableMap[type]) {
                let query = `SELECT id, name FROM ${tableMap[type]} ${addWhere}`;
                if (type === 'sub_category' || type === 'inventory_sub_category') {
                    query += addWhere ? ` AND category_id = ${category_id}` : `WHERE category_id = ${category_id}`;
                }

                data = await SELECT.All(query);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
            }

            return sendResponse(req, res, 200, 1, { keyword: "success" }, data);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    normal_option_list: async (req, res) => {
        try {
            let { type } = req.body;

            let list = await SELECT.All(`SELECT id as option_id, value FROM tbl_select_option_lists WHERE type = '${type}' Order by sort ASC`);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, list);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message || 'failed_to_fetch' });
        }
    },

    //////////////////////////////////////////////////////////////////////
    //                              Agent                               //
    //////////////////////////////////////////////////////////////////////

    add_agent: async (req, res) => {
        try {
            let { name, email, password, user_type, contact_number, alternative_contact, country, mac_address, shift_start_time, shift_end_time, ref_name, ref_contact, country_code, profile_image } = req.body;

            // Check if email already exists
            const existingUser = await SELECT.All(`SELECT id FROM tbl_agentadmin_users WHERE email = ${escape(email)}`, false);

            if (existingUser.length > 0) {
                return sendResponse(req, res, 200, 0, { keyword: "email_exist" });
            }

            // Encrypt password if needed
            const hashedPassword = cryptoLib.encrypt(password, shaKey, process.env.PASSWORD_ENC_IV);

            // Insert agent data
            const agent_id = await INSERT('INSERT INTO tbl_agentadmin_users SET ?', {
                name,
                email,
                password: hashedPassword,
                user_type,
                contact_number,
                alternative_contact,
                country,
                mac_address,
                shift_start_time,
                shift_end_time,
                ref_name,
                ref_contact,
                country_code: country_code,
                is_edit_permission: 1,
                is_delete_permission: 1,
                is_copy_permission: 1,
                is_view_permission: 1,
                is_download_permission: 1,
                profile_image: profile_image ? profile_image : 'default.png',
                created_at: new Date()
            });

            return sendResponse(req, res, 200, 1, { keyword: "created" }, { agent_id });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message });
        }
    },

    edit_agent: async (req, res) => {
        try {
            let { agent_id, name, email, password, user_type, contact_number, alternative_contact, country, mac_address, shift_start_time, shift_end_time, ref_name, ref_contact, country_code, profile_image } = req.body;

            // Check if email already exists
            const existingUser = await SELECT.All(`SELECT id FROM tbl_agentadmin_users WHERE email = ${escape(email)} AND id != ${agent_id}`, false);

            if (existingUser.length > 0) {
                return sendResponse(req, res, 200, 0, { keyword: "email_exist" });
            }

            // Encrypt password if needed
            const hashedPassword = password ? cryptoLib.encrypt(password, shaKey, process.env.PASSWORD_ENC_IV) : null;

            // Update agent data
            await UPDATE(`UPDATE tbl_agentadmin_users SET ? WHERE id = ${agent_id}`, {
                name,
                email,
                password: hashedPassword,
                user_type,
                contact_number,
                alternative_contact,
                profile_image,
                country,
                mac_address,
                shift_start_time,
                shift_end_time,
                ref_name,
                ref_contact,
                country_code: country_code
            });

            return sendResponse(req, res, 200, 1, { keyword: "updated" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message });
        }
    },

    list_agents: async (req, res) => {
        try {

            let query = `SELECT row_number() over (order by created_at desc) as sr_no, id as agent_id, name, email, contact_number, country_code, user_type, shift_start_time, shift_end_time, country, status, concat('${ADMIN_IMAGE_PATH}', profile_image) as profile_image, created_at FROM tbl_agentadmin_users WHERE is_delete = 0 ORDER BY created_at DESC`;

            const agents = await SELECT.All(query);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, agents);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message });
        }
    },

    delete_agent: async (req, res) => {
        try {
            let { agent_id } = req.body;

            await UPDATE(`UPDATE tbl_agentadmin_users SET is_delete = 1 WHERE id = ${agent_id}`);

            return sendResponse(req, res, 200, 1, { keyword: "deleted" });
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message });
        }
    },

    get_agent: async (req, res) => {
        try {
            let { agent_id } = req.body;

            let query = `SELECT id as agent_id, name, email, password, contact_number, country_code, user_type, shift_start_time, shift_end_time, country, status, mac_address, ref_name, alternative_contact, ref_contact, concat('${ADMIN_IMAGE_PATH}', profile_image) as profile_image FROM tbl_agentadmin_users WHERE id = ${agent_id}`;

            const agent = await SELECT.One(query);

            agent.password = cryptoLib.decrypt(agent.password, shaKey, process.env.PASSWORD_ENC_IV);

            return sendResponse(req, res, 200, 1, { keyword: "success" }, agent);
        }
        catch (err) {
            return sendResponse(req, res, 200, 0, { keyword: err.message });
        }
    }
}

module.exports = otherModel;