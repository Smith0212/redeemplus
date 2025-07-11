const { SELECT, INSERT, UPDATE, DELETE } = require('../../utils/SQLWorker');
const { sendResponse } = require('../../middleware');
const common = require('../../utils/common');
const moment = require('moment');
const cryptoLib = require('cryptlib');
const shaKey = cryptoLib.getHashSha256(process.env.PASSWORD_ENC_KEY, 32);
const { ADMIN_IMAGE_PATH, permissions, COUNTRY_IMAGE_PATH } = require('../../config/constants');
const NodeCache = require("node-cache");
// Cache instance stdTTL is set to 3600 seconds (60 minutes) and check period is set to 60 seconds
const myCache = new NodeCache({ stdTTL: 3600, checkperiod: 60 });

let auth_model = {

    access_account: async (req, res) => {
        try {
            let { email, password, country, device_details } = req.body;

            let { admin_id, stored_password } = await SELECT.One(`SELECT id as admin_id, password as stored_password FROM tbl_admin_users WHERE email = '${email}' AND is_active = 1 AND is_delete = 0`);

            let en_password = cryptoLib.encrypt(password, shaKey, process.env.PASSWORD_ENC_IV);

            if (stored_password === en_password) {

                let { stored_device_details_id } = await SELECT.One(`SELECT id as stored_device_details_id FROM tbl_admin_device WHERE admin_id = ${admin_id} AND uuid = '${device_details.uuid}'`, false);

                let admin_details = {};
                if (stored_device_details_id) {

                    // Use update_device_details if needed
                    await UPDATE(`UPDATE tbl_admin_device SET ? WHERE id = ${stored_device_details_id}`, {
                        device_name: device_details.device_name,
                        device_type: device_details.device_type,
                        device_token: device_details.device_token,
                        token: common.jwt_sign({ admin_id, device_id: stored_device_details_id, country: country }, '24h'),
                        model_name: device_details.model_name,
                        uuid: device_details.uuid,
                        os_version: device_details.os_version,
                        app_version: device_details.app_version,
                        ip: device_details.ip,
                        time_zone: device_details.time_zone,
                        last_active: moment().utc().format('YYYY-MM-DD HH:mm:ss')
                    });

                    admin_details = await common.admin_details(admin_id, stored_device_details_id);

                    return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, admin_details);

                } else {

                    let device_details_id = await INSERT(`INSERT INTO tbl_admin_device SET ?`, {
                        admin_id: admin_id,
                        device_name: device_details.device_name,
                        device_type: device_details.device_type,
                        device_token: device_details.device_token,
                        model_name: device_details.model_name,
                        uuid: device_details.uuid,
                        token: null,
                        os_version: device_details.os_version,
                        app_version: device_details.app_version,
                        ip: device_details.ip,
                        time_zone: device_details.time_zone,
                        last_active: moment().utc().format('YYYY-MM-DD HH:mm:ss')
                    });

                    await UPDATE(`UPDATE tbl_admin_device SET token = '${common.jwt_sign({ admin_id, device_id: device_details_id, country: country }, '24h')}' WHERE id = ${device_details_id}`);

                    admin_details = await common.admin_details(admin_id, device_details_id);

                    return sendResponse(req, res, 200, 1, { keyword: "login_success", components: {} }, admin_details);
                }
            } else {
                return sendResponse(req, res, 200, 0, { keyword: "invalid_password", components: {} });
            }
        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "invalid_credentials", components: {} });
        }
    },

    logout: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { device_id = 0 } = req.body;

            await DELETE(`DELETE FROM tbl_admin_device WHERE admin_id = ${admin_id} OR id = ${device_id}`);

            return sendResponse(req, res, 200, 1, { keyword: "logout_success", components: {} });
        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed", components: {} });
        }
    },

    change_password: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { old_password, new_password } = req.body;

            let result = await SELECT.One(`SELECT * FROM tbl_admin_users WHERE id = ${admin_id} AND is_active = 1 AND is_delete = 0`);

            let en_password = cryptoLib.encrypt(old_password, shaKey, process.env.PASSWORD_ENC_IV);

            if (result.password === en_password) {

                let en_new_password = cryptoLib.encrypt(new_password, shaKey, process.env.PASSWORD_ENC_IV);

                let update_password = {
                    password: en_new_password
                };

                await UPDATE(`UPDATE tbl_admin_users SET ? WHERE id = ${admin_id}`, update_password);

                return sendResponse(req, res, 200, 1, { keyword: "password_changed", components: {} });
            } else {
                return sendResponse(req, res, 200, 0, { keyword: "invalid_old_password", components: {} });
            }
        }
        catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed", components: {} });
        }
    },

    get_details: async (req, res) => {
        let admin_details = {};
        try {
            let { admin_id } = req.loginUser;
            if (req.body.admin_id) {
                admin_id = req.body.admin_id;
            }
            let only_permission = req.path;

            if (only_permission == '/get_details') {
                admin_details = await SELECT.One(`SELECT id as admin_id, name, email, password, '' as dec_password, user_type, contact_number, alternative_contact_number, country, mac_address, concat('${ADMIN_IMAGE_PATH}',profile_image) as profile_image, (select concat('${COUNTRY_IMAGE_PATH}', flag) from tbl_country where name = tbl_admin_users.country) as country_image, is_view_permission, is_edit_permission, is_copy_permission, is_delete_permission, is_download_permission,  is_active, is_delete, created_at, updated_at FROM tbl_admin_users WHERE id = ${admin_id}`);

                admin_details.dec_password = cryptoLib.decrypt(admin_details.password, shaKey, process.env.PASSWORD_ENC_IV);

                admin_details.logged_devices = await SELECT.All(`SELECT id as device_id, device_name, device_type, ip, last_active FROM tbl_admin_device WHERE admin_id = ${admin_id} order by id desc`, false);
            }

            let permissions = [];
            
            let permissions_object = myCache.get("permissions_" + admin_id) || [];

            if (permissions_object.length == 0) {
                permissions = await SELECT.All(`SELECT permission, 1 as is_active FROM tbl_admin_role_permission WHERE admin_id = ${admin_id}`, false);

                // Convert flat permissions to structured format
                let permissions_map = {};

                // Create a map of all permissions with their active status
                permissions.forEach(item => {
                    permissions_map[item.permission] = item.is_active;
                });

                // Define the permissions structure
                permissions_object = [
                    { "dashboards": permissions_map["dashboards"] || 0 },
                    { "customers": permissions_map["customers"] || 0 },
                    {
                        "restaurant": permissions_map["restaurant"] || 0,
                        "time_table": permissions_map["time_table"] || 0
                    },
                    {
                        "rider": permissions_map["rider"] || 0,
                        "leaderboard": permissions_map["leaderboard"] || 0,
                        "inventory": permissions_map["inventory"] || 0,
                        "rider_delayed": permissions_map["rider_delayed"] || 0
                    },
                    { "tutorials": permissions_map["tutorials"] || 0 },
                    {
                        "category": permissions_map["category"] || 0,
                        "sub_category": permissions_map["sub_category"] || 0
                    },
                    {
                        "order": permissions_map["order"] || 0,
                        "delivery": permissions_map["delivery"] || 0,
                        "pick_up": permissions_map["pick_up"] || 0,
                        "dine_in": permissions_map["dine_in"] || 0,
                        "carhop": permissions_map["carhop"] || 0,
                        "report_order": permissions_map["report_order"] || 0
                    },
                    {
                        "services": permissions_map["services"] || 0,
                        "promocodes": permissions_map["promocodes"] || 0,
                        "gift_card": permissions_map["gift_card"] || 0,
                        "campaigns": permissions_map["campaigns"] || 0,
                        "send_notification": permissions_map["send_notification"] || 0,
                        "app_escalation": permissions_map["app_escalation"] || 0
                    },
                    { "feedback": permissions_map["feedback"] || 0 },
                    {
                        "menus": permissions_map["menus"] || 0,
                        "add_items": permissions_map["add_items"] || 0,
                        "menu_list": permissions_map["menu_list"] || 0,
                        "accompaniment": permissions_map["accompaniment"] || 0,
                        "add_ons": permissions_map["add_ons"] || 0,
                        "delivery_charges": permissions_map["delivery_charges"] || 0
                    },
                    { "manage_pages": permissions_map["manage_pages"] || 0 },
                    {
                        "loyalty_points": permissions_map["loyalty_points"] || 0,
                        "rewards": permissions_map["rewards"] || 0,
                        "membership": permissions_map["membership"] || 0
                    },
                    {
                        "setting": permissions_map["setting"] || 0,
                        "reports": permissions_map["reports"] || 0,
                        "page_content": permissions_map["page_content"] || 0
                    },
                    {
                        "alerts": permissions_map["alerts"] || 0,
                        "alerts_customer": permissions_map["alerts_customer"] || 0,
                        "alerts_branch": permissions_map["alerts_branch"] || 0,
                        "alerts_rider": permissions_map["alerts_rider"] || 0,
                        "alerts_call_centre": permissions_map["alerts_call_centre"] || 0
                    }
                ];

                permissions_map = null;

                myCache.set("permissions_" + admin_id, permissions_object);
            }

            return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, (only_permission == '/get_details') ? admin_details : permissions_object);

        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_fetch", components: {} });
        } finally {
            admin_details = null;
        }
    },

    edit_profile: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { name, email, contact_number, user_type, profile_image } = req.body;

            let check_email = await SELECT.All(`SELECT * FROM tbl_admin_users WHERE email = '${email}' AND id != ${admin_id} AND is_active = 1 AND is_delete = 0`, false);

            if (check_email.length > 0) {
                return sendResponse(req, res, 200, 0, { keyword: "email_exist", components: {} });
            } else {
                let update_profile = {
                    name: name,
                    email: email,
                    contact_number: contact_number,
                    user_type: user_type,
                    profile_image: profile_image
                };

                await UPDATE(`UPDATE tbl_admin_users SET ? WHERE id = ${admin_id}`, update_profile);

                return sendResponse(req, res, 200, 1, { keyword: "updated", components: {} });
            }
        }
        catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_update", components: {} });
        }
    },

    admin_list: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;

            let admins = await SELECT.All(`SELECT id as admin_id, name, email, contact_number, user_type, mac_address, concat('${ADMIN_IMAGE_PATH}', profile_image) as profile_image FROM tbl_admin_users WHERE is_active = 1 AND is_delete = 0 AND id != ${admin_id}`, false);

            return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, admins);
        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "no_Data", components: {} });
        }
    },

    // role based access
    create_user: async (req, res) => {
        try {
            let { name, email, password, user_type, contact_number, alternative_contact_number, country, mac_address, profile_image } = req.body;

            // Check if email already exists
            let check_email = await SELECT.All(`SELECT id FROM tbl_admin_users WHERE email = '${email}' AND is_active = 1 AND is_delete = 0`, false);

            if (check_email.length > 0) {
                return sendResponse(req, res, 200, 0, { keyword: "email_exist", components: {} });
            } else {
                // Encrypt the password
                let en_password = cryptoLib.encrypt(password, shaKey, process.env.PASSWORD_ENC_IV);

                // Insert new admin user
                let new_admin_user = {
                    name: name,
                    email: email,
                    password: en_password,
                    user_type: user_type,
                    contact_number: contact_number,
                    alternative_contact_number: alternative_contact_number,
                    country: country,
                    mac_address: mac_address,
                    profile_image: profile_image ? profile_image : 'default.png',
                    ex_id: moment().unix()
                };

                let admin_id = await INSERT(`INSERT INTO tbl_admin_users SET ?`, new_admin_user);

                if (user_type == 'admin') {
                    // Convert Data into Array of Arrays
                    const values = permissions.map(permission => [admin_id, permission]);

                    // Insert Data
                    await INSERT(`INSERT INTO your_table_name (admin_id, permission) VALUES ?`, [values]);
                }

                return sendResponse(req, res, 200, 1, { keyword: "created", components: {} });
            }
        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_create", components: {} });
        }
    },

    manage_role_permissions: async (req, res) => {
        let { admin_id, type, module } = req.body;
        try {
            let check = await SELECT.All(`SELECT id FROM tbl_admin_role_permission WHERE admin_id = ${admin_id} AND permission = '${module}'`, false);

            if (type == 'add' && check.length == 0) {

                myCache.del("permissions_" + admin_id);

                await INSERT(`INSERT INTO tbl_admin_role_permission SET ?`, { admin_id: admin_id, permission: module });
            } else if (type == 'remove' && check.length > 0) {

                myCache.del("permissions_" + admin_id);

                await DELETE(`DELETE FROM tbl_admin_role_permission WHERE admin_id = ${admin_id} AND permission = '${module}'`);
            }

            return sendResponse(req, res, 200, 1, { keyword: "updated", components: {} });
        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_update", components: {} });
        }
    },

    action_admins: async (req, res) => {
        let { type, value, admin_id: action_admin_id } = req.body;
        try {

            let update = {};
            if (type == 'is_edit') {
                update = { is_edit_permission: value };
            } else if (type == 'is_delete') {
                update = { is_delete_permission: value };
            } else if (type == 'is_copy') {
                update = { is_copy_permission: value };
            } else if (type == 'is_download') {
                update = { is_download_permission: value };
            } else if (type == 'is_view') {
                update = { is_view_permission: value };
            } else if (type == 'user_type') {
                update = { user_type: value };
            } else if (type == 'profile_image') {
                update = { profile_image: value };
            } else if (type == 'password') {
                let en_password = cryptoLib.encrypt(value, shaKey, process.env.PASSWORD_ENC_IV);
                update = { password: en_password };
            }

            await UPDATE(`UPDATE tbl_admin_users SET ? WHERE id = ${action_admin_id}`, update);

            return sendResponse(req, res, 200, 1, { keyword: "updated", components: {} });
        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_update", components: {} });
        }
    },

    edit_user: async (req, res) => {
        try {
            let { admin_id, name, email, user_type, contact_number, alternative_contact_number,
                country, mac_address, profile_image, password } = req.body;

            // Check if email already exists for another user
            if (email) {
                let check_email = await SELECT.All(
                    `SELECT id FROM tbl_admin_users WHERE email = '${email}' AND id != ${admin_id} AND is_active = 1 AND is_delete = 0`,
                    false
                );

                if (check_email.length > 0) {
                    return sendResponse(req, res, 200, 0, { keyword: "email_exist", components: {} });
                }
            }

            // Prepare update object
            let update_user = {
                name: name,
                email: email,
                user_type: user_type,
                contact_number: contact_number,
                alternative_contact_number: alternative_contact_number,
                country: country,
                mac_address: mac_address
            };

            // Add profile image if provided
            if (profile_image) {
                update_user.profile_image = profile_image;
            }

            // Update password if provided
            if (password) {
                update_user.password = cryptoLib.encrypt(password, shaKey, process.env.PASSWORD_ENC_IV);
            }

            // Update user record
            await UPDATE(`UPDATE tbl_admin_users SET ? WHERE id = ${admin_id}`, update_user);

            // Handle permissions if user type is admin
            if (user_type === 'admin') {
                // First check if permissions already exist
                let existing_permissions = await SELECT.All(
                    `SELECT * FROM tbl_admin_role_permission WHERE admin_id = ${admin_id}`,
                    false
                );

                if (existing_permissions.length === 0) {
                    // Convert Data into Array of Arrays
                    const values = permissions.map(permission => [admin_id, permission]);

                    // Insert Data
                    await INSERT(`INSERT INTO tbl_admin_role_permission (admin_id, permission) VALUES ?`, [values]);
                }
            }

            return sendResponse(req, res, 200, 1, { keyword: "updated", components: {} });
        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_update", components: {} });
        }
    },

    delete_user: async (req, res) => {
        try {
            let { admin_id } = req.body;

            // Update user record to mark as deleted
            await UPDATE(`UPDATE tbl_admin_users SET is_delete = 1 WHERE id = ?`, [admin_id]);

            // Optionally, delete related device entries
            await DELETE(`DELETE FROM tbl_admin_device WHERE admin_id = ?`, [admin_id]);
            // Optionally, delete related permission entries
            await DELETE(`DELETE FROM tbl_admin_role_permission WHERE admin_id = ?`, [admin_id]);

            return sendResponse(req, res, 200, 1, { keyword: "deleted", components: {} });
        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_delete", components: {} });
        }
    },

};

module.exports = auth_model;