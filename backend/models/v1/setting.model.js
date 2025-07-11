const { SELECT, UPDATE, INSERT, DELETE } = require('../../utils/SQLWorker');
const { sendResponse, checkRolePermissionInModel } = require('../../middleware');
const constants = require('../../config/constants');
const { category_or_sub_category } = require('../../utils/common');
const _ = require('lodash');
const moment = require('moment');
const { escape } = require('mysql2');

const SETTING_KEYS = {
    SERVICE_TYPE: 'app_service_type',
    PAYMENT_MODES: 'app_payment_modes',
    REGION: 'app_region',
    WELCOME_SCREEN: 'app_welcome_screen',
    SCHEDULE_ORDERS: 'schedule_orders',
    SOCIAL_MEDIA_LOGIN: 'social_media_logins',
    CANCLE_ORDER_TIME: 'cancle_order_time',
    ORDER_APPROVAL: 'order_approval',
    MAX_MIN_AMOUNT_DELIVERY: 'max_min_amount_delivery',
    QUANTITY_OF_SINGLE_ITEM: 'quantity_of_single_item',
    CANCELLATION_DISCLAIMER: 'cancellation_disclaimer',
    WORD_LIMIT_INSTRUCTIONS: 'word_limit_instructions',
    CLEAR_ABANDONED_CART: 'clear_abandoned_cart',
    THIRD_PARTY_APPS: 'third_party_apps',
    GRACE_TIME: 'grace_time',
    GPS_KEYS: 'gps_keys',
    OTHER_SETTING: 'other_setting'
}

const setting_model = {

    service_type: async (req, res) => {
        if (req.method === 'POST') {
            try {
                let { admin_id } = req.loginUser;
                let body = req.body;

                let service_type = body.service_type;
                let enabled = body.enabled;
                let image = body.image;
                let description = body.description;

                let { setting_value: oldSetting } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.SERVICE_TYPE}'`);

                let updatedSetting = _.cloneDeep(oldSetting);

                updatedSetting[service_type] = {
                    enabled: enabled,
                    sequence: updatedSetting[service_type].sequence,
                    image_url: image,
                    updated_at: moment().utc().format('YYYY-MM-DD HH:mm:ss'),
                    description: description
                }

                await UPDATE(`update tbl_app_setting set setting_value = ${escape(JSON.stringify(updatedSetting))}, updated_by = ${admin_id} where setting_key = '${SETTING_KEYS.SERVICE_TYPE}'`);

                const mappedServices = _.mapValues(updatedSetting, service => {
                    service.image_url = constants.SETTING_IMAGE_PATH + service.image_url;
                    return service;
                });

                return sendResponse(req, res, 200, 1, { keyword: "saved" }, mappedServices);
            } catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_save" });
            }
        } else {
            try {
                let { setting_value: oldSetting } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.SERVICE_TYPE}'`);

                const mappedServices = _.mapValues(oldSetting, service => {
                    service.image_url = constants.SETTING_IMAGE_PATH + service.image_url;
                    return service;
                });

                return sendResponse(req, res, 200, 1, { keyword: "success" }, mappedServices);
            } catch (error) {
                return sendResponse(req, res, 200, 2, { keyword: error.message || "failed_to_fetch" });
            }
        }

    },

    payment_modes: async (req, res) => {
        if (req.method === 'POST') {
            try {
                let { admin_id } = req.loginUser;
                let body = req.body;

                let payment_mode = body.payment_mode;
                let service_type = body.service_type;
                let enabled = body.enabled;

                let { setting_value: oldSetting } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.PAYMENT_MODES}'`);

                let updatedSetting = _.cloneDeep(oldSetting);

                if (service_type === '') {
                    updatedSetting[payment_mode].enabled = enabled;
                    updatedSetting[payment_mode].updated_at = moment().utc().format('YYYY-MM-DD HH:mm:ss');
                } else {
                    updatedSetting[payment_mode].service_type[service_type] = enabled;
                    updatedSetting[payment_mode].updated_at = moment().utc().format('YYYY-MM-DD HH:mm:ss');
                }


                await UPDATE(`update tbl_app_setting set setting_value = '${JSON.stringify(updatedSetting)}', updated_by = ${admin_id} where setting_key = '${SETTING_KEYS.PAYMENT_MODES}'`);

                return sendResponse(req, res, 200, 1, { keyword: "saved" }, updatedSetting);
            }
            catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_save" });
            }
        } else {
            try {
                let { setting_value: oldSetting } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.PAYMENT_MODES}'`);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, oldSetting);
            }
            catch (error) {
                return sendResponse(req, res, 200, 2, { keyword: error.message || "failed_to_fetch" });
            }
        }
    },

    region: async (req, res) => {
        if (req.method === 'POST') {
            try {
                let { admin_id } = req.loginUser;
                let body = req.body;

                let { setting_value: oldSetting } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.REGION}'`);

                let updatedSetting = _.cloneDeep(oldSetting);

                updatedSetting[body.country] = {
                    enabled: body.enabled,
                    image_url: body.image,
                    description: body.description,
                    updated_at: moment().utc().format('YYYY-MM-DD HH:mm:ss')
                }

                await UPDATE(`update tbl_app_setting set setting_value = ${escape(JSON.stringify(updatedSetting))}, updated_by = ${admin_id} where setting_key = '${SETTING_KEYS.REGION}'`);

                const mappedregions = _.mapValues(updatedSetting, region => {
                    region.image_url = constants.SETTING_IMAGE_PATH + region.image_url;
                    return region;
                });

                return sendResponse(req, res, 200, 1, { keyword: "saved" }, mappedregions);
            }
            catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_save" });
            }
        } else {
            try {
                let { setting_value: oldSetting } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.REGION}'`);

                const mappedregions = _.mapValues(oldSetting, region => {
                    region.image_url = constants.SETTING_IMAGE_PATH + region.image_url;
                    return region;
                });

                return sendResponse(req, res, 200, 1, { keyword: "success" }, mappedregions);
            }
            catch (error) {
                return sendResponse(req, res, 200, 2, { keyword: error.message || "failed_to_fetch" });
            }
        }
    },

    welcome_screen: async (req, res) => {
        if (req.method === 'POST') {
            try {
                let { admin_id } = req.loginUser;
                let body = req.body;

                let { setting_value: oldSetting } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.WELCOME_SCREEN}'`);

                let updatedSetting = _.cloneDeep(oldSetting);

                updatedSetting[body.user_type] = {
                    title: body.title,
                    sub_title: body.sub_title,
                    updated_at: moment().utc().format('YYYY-MM-DD HH:mm:ss'),
                    file_format: body.file_format,
                    file_upload: body.file_upload,
                    display_time_on_screen: body.display_time_on_screen
                }

                await UPDATE(`update tbl_app_setting set setting_value = ${escape(JSON.stringify(updatedSetting))}, updated_by = ${admin_id} where setting_key = '${SETTING_KEYS.WELCOME_SCREEN}'`);

                let mappedServices = _.mapValues(updatedSetting, service => {
                    service.file_upload = constants.SETTING_IMAGE_PATH + service.file_upload;
                    return service;
                });

                return sendResponse(req, res, 200, 1, { keyword: "saved" }, mappedServices);
            }
            catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_save" });
            }
        } else {
            try {
                let { setting_value: oldSetting } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.WELCOME_SCREEN}'`);

                let mappedServices = _.mapValues(oldSetting, service => {
                    service.file_upload = constants.SETTING_IMAGE_PATH + service.file_upload;
                    return service;
                });

                return sendResponse(req, res, 200, 1, { keyword: "success" }, mappedServices);
            }
            catch (error) {
                return sendResponse(req, res, 200, 2, { keyword: error.message || "failed_to_fetch" });
            }
        }
    },

    gps_keys: async (req, res) => {
        try {

            if (req.method === 'GET') {
                let { setting_value: oldSetting } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.GPS_KEYS}'`);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, oldSetting);
            } else if (req.method === 'POST') {
                let { gps_key, is_on, country } = req.body;

                let { setting_value: oldSetting } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.GPS_KEYS}'`);

                let updatedSetting = _.cloneDeep(oldSetting);

                updatedSetting[country].gps_key = gps_key;
                updatedSetting[country].is_on = is_on;

                await UPDATE(`update tbl_app_setting set setting_value = ${escape(JSON.stringify(updatedSetting))} where setting_key = '${SETTING_KEYS.GPS_KEYS}'`);
            }

            return sendResponse(req, res, 200, 1, { keyword: "saved" });
        }
        catch (error) {
            return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_save" });
        }
    },

    schedule_orders: async (req, res) => {
        let { admin_id, country } = req.loginUser;
        if (req.method === 'POST') {
            try {
                let body = req.body;
                let payment_mode_type = body.payment_mode_type;
                let service_type = body.service_type;
                let enabled = body.enabled;

                let { setting_value: oldSetting } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.SCHEDULE_ORDERS}' AND country_name = '${country}'`);

                let updatedSetting = _.cloneDeep(oldSetting);

                if (payment_mode_type === '') {
                    updatedSetting.schedule_orders = body.schedule_orders || true;
                    updatedSetting.advance_days_of_scheduling = body.advance_days_of_scheduling || 3;
                } else {
                    updatedSetting.payment_modes.map(payment => {
                        if (payment.type == payment_mode_type) {
                            if (service_type === '') {
                                payment.enabled = enabled;
                            } else {
                                payment.actions.map(action => {
                                    if (action.type == service_type) {
                                        action.enabled = enabled;
                                    }
                                });
                            }
                        }
                    });
                }

                await UPDATE(`update tbl_app_setting set setting_value = ${escape(JSON.stringify(updatedSetting))}, updated_by = ${admin_id} where setting_key = '${SETTING_KEYS.SCHEDULE_ORDERS}' AND country_name = '${country}'`);

                return sendResponse(req, res, 200, 1, { keyword: "saved" }, updatedSetting);
            }
            catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_save" });
            }
        } else {
            try {
                let { setting_value } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.SCHEDULE_ORDERS}' AND country_name = '${country}'`);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, setting_value);
            }
            catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_fetch" });
            }
        }

    },

    social_media_logins: async (req, res) => {
        let { admin_id, country } = req.loginUser;
        if (req.method === 'POST') {
            try {
                let { social_media_name, enabled } = req.body;

                let { setting_value: oldSetting } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.SOCIAL_MEDIA_LOGIN}' AND country_name = '${country}'`);

                let updatedSetting = _.cloneDeep(oldSetting);

                updatedSetting[social_media_name] = enabled;

                await UPDATE(`update tbl_app_setting set setting_value = ${escape(JSON.stringify(updatedSetting))}, updated_by = ${admin_id} where setting_key = '${SETTING_KEYS.SOCIAL_MEDIA_LOGIN}' AND country_name = '${country}'`);

                return sendResponse(req, res, 200, 1, { keyword: "saved" }, updatedSetting);
            }
            catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_save" });
            }
        } else {
            try {
                let { setting_value } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.SOCIAL_MEDIA_LOGIN}' AND country_name = '${country}'`);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, setting_value);
            }
            catch (error) {
                return sendResponse(req, res, 200, 2, { keyword: error.message || "failed_to_fetch" });
            }
        }

    },

    cancle_order_time: async (req, res) => {
        let { admin_id, country } = req.loginUser;
        if (req.method === 'POST') {
            try {
                let { cancle_order_time } = req.body;

                await UPDATE(`update tbl_app_setting set setting_value = '${JSON.stringify({ cancle_order_time: cancle_order_time })}', updated_by = ${admin_id} where setting_key = '${SETTING_KEYS.CANCLE_ORDER_TIME}' AND country_name = '${country}'`);

                return sendResponse(req, res, 200, 1, { keyword: "saved" }, {
                    cancle_order_time: cancle_order_time
                });
            } catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_save" });
            }
        } else {
            try {
                let { setting_value } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.CANCLE_ORDER_TIME}' AND country_name = '${country}'`);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, setting_value);
            } catch (error) {
                return sendResponse(req, res, 200, 2, { keyword: error.message || "failed_to_fetch" });
            }
        }
    },

    order_approval: async (req, res) => {
        let { admin_id, country } = req.loginUser;
        if (req.method === 'POST') {
            try {
                let { type, value } = req.body;

                let { setting_value: oldSetting } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.ORDER_APPROVAL}' AND country_name = '${country}'`);

                updatedSetting = _.cloneDeep(oldSetting);

                updatedSetting[type] = value;

                await UPDATE(`update tbl_app_setting set setting_value = '${JSON.stringify(updatedSetting)}', updated_by = ${admin_id} where setting_key = '${SETTING_KEYS.ORDER_APPROVAL}' AND country_name = '${country}'`);

                return sendResponse(req, res, 200, 1, { keyword: "saved" }, updatedSetting);
            }
            catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_save" });
            }
        } else {
            try {
                let { setting_value } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.ORDER_APPROVAL}' AND country_name = '${country}'`);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, setting_value);
            }
            catch (error) {
                return sendResponse(req, res, 200, 2, { keyword: error.message || "failed_to_fetch" });
            }
        }

    },

    max_min_amount_delivery: async (req, res) => {

        let { admin_id, country } = req.loginUser;
        let { amount, currency, type } = req.body;

        if (req.method === 'POST') {
            try {

                let { setting_value: oldSetting } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.MAX_MIN_AMOUNT_DELIVERY}' AND country_name = '${country}'`);

                let updatedSetting = _.cloneDeep(oldSetting);

                if (type == 'min') {
                    updatedSetting.min_amount = parseFloat(amount);
                    updatedSetting.min_amount_currency = currency;
                } else if (type == 'max') {
                    updatedSetting.max_amount = parseFloat(amount);
                    updatedSetting.max_amount_currency = currency;
                }

                await UPDATE(`update tbl_app_setting set setting_value = '${JSON.stringify(updatedSetting)}', updated_by = ${admin_id} where setting_key = '${SETTING_KEYS.MAX_MIN_AMOUNT_DELIVERY}' AND country_name = '${country}'`);

                return sendResponse(req, res, 200, 1, { keyword: "saved" }, updatedSetting);
            }
            catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_save" });
            }
        } else {
            try {
                let { setting_value } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.MAX_MIN_AMOUNT_DELIVERY}' AND country_name = '${country}'`);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, setting_value);
            }
            catch (error) {
                return sendResponse(req, res, 200, 2, { keyword: error.message || "failed_to_fetch" });
            }
        }

    },

    quantity_of_single_item: async (req, res) => {

        let { admin_id, country } = req.loginUser;

        if (req.method === 'POST') {
            try {
                let { max_quantity } = req.body;

                await UPDATE(`update tbl_app_setting set setting_value = '${JSON.stringify({ max_quantity: max_quantity })}', updated_by = ${admin_id} where setting_key = '${SETTING_KEYS.QUANTITY_OF_SINGLE_ITEM}' AND country_name = '${country}'`);

                return sendResponse(req, res, 200, 1, { keyword: "saved" }, {
                    max_quantity: max_quantity
                });
            } catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_save" });
            }
        } else {
            try {
                let { setting_value } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.QUANTITY_OF_SINGLE_ITEM}' AND country_name = '${country}'`);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, setting_value);
            } catch (error) {
                return sendResponse(req, res, 200, 2, { keyword: error.message || "failed_to_fetch" });
            }
        }
    },

    cancellation_disclaimer: async (req, res) => {
        let { admin_id, country } = req.loginUser;
        if (req.method === 'POST') {
            try {

                let { setting_value: oldSetting } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.CANCELLATION_DISCLAIMER}' AND country_name = '${country}'`);

                let updatedSetting = _.cloneDeep(oldSetting);

                if (req.body.title) {
                    updatedSetting.title = req.body.title;
                } else if (req.body.description) {
                    updatedSetting.description = req.body.description;
                }

                await UPDATE(`update tbl_app_setting set setting_value = '${JSON.stringify(updatedSetting)}', updated_by = ${admin_id} where setting_key = '${SETTING_KEYS.CANCELLATION_DISCLAIMER}' AND country_name = '${country}'`);

                return sendResponse(req, res, 200, 1, { keyword: "saved" }, updatedSetting);
            } catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_save" });
            }
        } else {
            try {
                let { setting_value } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.CANCELLATION_DISCLAIMER}' AND country_name = '${country}'`);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, setting_value);
            } catch (error) {
                return sendResponse(req, res, 200, 2, { keyword: error.message || "failed_to_fetch" });
            }
        }

    },

    word_limit_instructions: async (req, res) => {
        let { admin_id, country } = req.loginUser;
        if (req.method === 'POST') {
            try {
                let { type, value } = req.body;

                let { setting_value: oldSetting } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.WORD_LIMIT_INSTRUCTIONS}' AND country_name = '${country}'`);

                let updatedSetting = _.cloneDeep(oldSetting);

                updatedSetting[type] = parseInt(value);

                await UPDATE(`update tbl_app_setting set setting_value = '${JSON.stringify(updatedSetting)}', updated_by = ${admin_id} where setting_key = '${SETTING_KEYS.WORD_LIMIT_INSTRUCTIONS}' AND country_name = '${country}'`);

                return sendResponse(req, res, 200, 1, { keyword: "saved" }, updatedSetting);
            } catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_save" });
            }
        } else {
            try {
                let { setting_value } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.WORD_LIMIT_INSTRUCTIONS}' AND country_name = '${country}'`);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, setting_value);
            } catch (error) {
                return sendResponse(req, res, 200, 2, { keyword: error.message || "failed_to_fetch" });
            }
        }
    },

    clear_abandoned_cart: async (req, res) => {
        let { admin_id, country } = req.loginUser;
        if (req.method === 'POST') {
            try {
                let { type, value } = req.body;

                let { setting_value: oldSetting } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.CLEAR_ABANDONED_CART}' AND country_name = '${country}'`);

                let updatedSetting = _.cloneDeep(oldSetting);

                updatedSetting[type] = (type == 'cart_checkout_push_notification_message') ? value : parseInt(value);

                await UPDATE(`update tbl_app_setting set setting_value = '${JSON.stringify(updatedSetting)}', updated_by = ${admin_id} where setting_key = '${SETTING_KEYS.CLEAR_ABANDONED_CART}' AND country_name = '${country}'`);

                return sendResponse(req, res, 200, 1, { keyword: "saved" }, updatedSetting);
            } catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_save" });
            }
        } else {
            try {
                let { setting_value } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.CLEAR_ABANDONED_CART}' AND country_name = '${country}'`);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, setting_value);
            } catch (error) {
                return sendResponse(req, res, 200, 2, { keyword: error.message || "failed_to_fetch" });
            }
        }
    },

    third_party_apps: async (req, res) => {

        let { admin_id } = req.loginUser;

        if (req.method === 'POST') {
            try {
                let { type, value } = req.body;

                let { setting_value: oldSetting } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.THIRD_PARTY_APPS}'`);

                let updatedSetting = _.cloneDeep(oldSetting);

                updatedSetting = updatedSetting.map(app => {
                    if (app.type == type) {
                        app.enabled = (value == 'true' || value == true);
                    }
                    return app;
                });

                await UPDATE(`update tbl_app_setting set setting_value = '${JSON.stringify(updatedSetting)}', updated_by = ${admin_id} where setting_key = '${SETTING_KEYS.CLEAR_ABANDONED_CART}'`);

                return sendResponse(req, res, 200, 1, { keyword: "saved" }, updatedSetting);
            } catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_save" });
            }
        } else {
            try {
                let { setting_value } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.THIRD_PARTY_APPS}'`);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, setting_value);
            } catch (error) {
                return sendResponse(req, res, 200, 2, { keyword: error.message || "failed_to_fetch" });
            }
        }
    },

    grace_time: async (req, res) => {

        let { admin_id } = req.loginUser;

        if (req.method === 'POST') {
            try {
                let { type, value } = req.body;

                let { setting_value: oldSetting } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.GRACE_TIME}'`);

                let updatedSetting = _.cloneDeep(oldSetting);

                updatedSetting[type] = parseInt(value);

                await UPDATE(`update tbl_app_setting set setting_value = '${JSON.stringify(updatedSetting)}', updated_by = ${admin_id} where setting_key = '${SETTING_KEYS.GRACE_TIME}'`);

                return sendResponse(req, res, 200, 1, { keyword: "saved" }, updatedSetting);
            } catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_save" });
            }
        } else {
            try {
                let { setting_value } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.GRACE_TIME}'`);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, setting_value);
            } catch (error) {
                return sendResponse(req, res, 200, 2, { keyword: error.message || "failed_to_fetch" });
            }
        }
    },

    user_order_condition: {
        add_or_edit_or_list: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;

                let { order_condition_id, name } = req.body;

                let order_conditions = undefined;

                if (order_condition_id) {

                    await checkRolePermissionInModel(admin_id, 'setting', 'edit');

                    await UPDATE(`UPDATE tbl_allergies SET name = '${name}', updated_by = ${admin_id} WHERE id = ${order_condition_id}`);
                } else if (!order_condition_id && name) {

                    await checkRolePermissionInModel(admin_id, 'setting', 'edit');

                    await INSERT('INSERT INTO tbl_allergies SET ?', { name, created_by: admin_id });
                } else {

                    await checkRolePermissionInModel(admin_id, 'setting', 'view');

                    order_conditions = await SELECT.All(`SELECT id as order_condition_id, name, is_active, created_at FROM tbl_allergies WHERE is_delete = 0`);
                }

                return sendResponse(req, res, 200, 1, { keyword: "success" }, order_conditions);
            }
            catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_save" });
            }
        },

        is_active_or_delete: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { order_condition_id, is_active, is_delete } = req.body;

                if (is_active) {

                    await checkRolePermissionInModel(admin_id, 'setting', 'edit');

                    await UPDATE(`UPDATE tbl_allergies SET is_active = ${is_active}, updated_by = ${admin_id} WHERE id = ${order_condition_id}`);
                } else if (is_delete == 1) {

                    await checkRolePermissionInModel(admin_id, 'setting', 'delete');

                    await UPDATE(`UPDATE tbl_allergies SET is_delete = 1, updated_by = ${admin_id} WHERE id = ${order_condition_id}`);
                }

                return sendResponse(req, res, 200, 1, { keyword: "success" });
            }
            catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_save" });
            }
        }
    },

    address_preferences: {
        add_or_edit_or_list: async (req, res) => {
            try {
                let { admin_id, country } = req.loginUser;

                let { delivery_preference_id, name } = req.body;

                let delivery_preference_list = undefined;

                if (delivery_preference_id) {

                    await checkRolePermissionInModel(admin_id, 'setting', 'edit');

                    await UPDATE(`UPDATE tbl_admin_delivery_preference SET name = '${name}', updated_by = ${admin_id} WHERE id = ${delivery_preference_id}`);
                } else if (!delivery_preference_id && name) {

                    await checkRolePermissionInModel(admin_id, 'setting', 'edit');

                    await INSERT('INSERT INTO tbl_admin_delivery_preference SET ?', { name, created_by: admin_id, country_name: country });
                } else {

                    await checkRolePermissionInModel(admin_id, 'setting', 'view');

                    delivery_preference_list = await SELECT.All(`SELECT id as delivery_preference_id, name, is_active, created_at FROM tbl_admin_delivery_preference WHERE is_delete = 0 AND country_name = '${country}'`);
                }

                return sendResponse(req, res, 200, 1, { keyword: "success" }, delivery_preference_list);
            }
            catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_save" });
            }
        },

        is_active_or_delete: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { delivery_preference_id, is_active, is_delete } = req.body;

                if (is_active != undefined) {

                    await checkRolePermissionInModel(admin_id, 'setting', 'edit');

                    await UPDATE(`UPDATE tbl_admin_delivery_preference SET is_active = ${is_active}, updated_by = ${admin_id} WHERE id = ${delivery_preference_id}`);
                } else if (is_delete == 1) {

                    await checkRolePermissionInModel(admin_id, 'setting', 'delete');

                    await UPDATE(`UPDATE tbl_admin_delivery_preference SET is_delete = 1, updated_by = ${admin_id} WHERE id = ${delivery_preference_id}`);
                }

                return sendResponse(req, res, 200, 1, { keyword: "success" });
            }
            catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_save" });
            }
        }
    },

    customer_color_codes: {
        add_or_edit_or_list: async (req, res) => {
            try {
                let { admin_id, country } = req.loginUser;

                let { color_code_id, name, color_code } = req.body;

                let color_codes = undefined;

                if (color_code_id) {

                    await checkRolePermissionInModel(admin_id, 'setting', 'edit');

                    await UPDATE(`UPDATE tbl_admin_users_color_codes SET name = '${name}', color_code = '${color_code}', updated_by = ${admin_id} WHERE id = ${color_code_id}`);

                } else if (!color_code_id && name && color_code) {

                    await checkRolePermissionInModel(admin_id, 'setting', 'edit');

                    await INSERT('INSERT INTO tbl_admin_users_color_codes SET ?', { name, color_code, created_by: admin_id, country: country });

                } else {

                    await checkRolePermissionInModel(admin_id, 'setting', 'view');

                    color_codes = await SELECT.All(`SELECT id as color_code_id, name, color_code, country, is_active, created_at FROM tbl_admin_users_color_codes WHERE is_delete = 0 AND country in ('${country}', 'all')`);

                }

                return sendResponse(req, res, 200, 1, { keyword: "success" }, color_codes);
            }
            catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_save" });
            }
        },

        is_active_or_delete: async (req, res) => {
            try {
                let { admin_id } = req.loginUser;
                let { color_code_id, is_active, is_delete } = req.body;

                if (is_active == 0 || is_active == 1) {

                    await checkRolePermissionInModel(admin_id, 'setting', 'edit');

                    await UPDATE(`UPDATE tbl_admin_users_color_codes SET is_active = ${is_active}, updated_by = ${admin_id} WHERE id = ${color_code_id}`);

                } else if (is_delete == 1) {

                    await checkRolePermissionInModel(admin_id, 'setting', 'delete');

                    await UPDATE(`UPDATE tbl_admin_users_color_codes SET is_delete = 1, updated_by = ${admin_id} WHERE id = ${color_code_id} AND country != 'all'`);

                }

                return sendResponse(req, res, 200, 1, { keyword: "success" });
            }
            catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_save" });
            }
        }
    },

    advert_banners: {
        add_or_edit_or_list: async (req, res) => {
            try {

                let { admin_id, country } = req.loginUser;

                let { banner_id, sub_category_id = null, banner_media } = req.body;

                (sub_category_id != null && req.method == 'POST') ? await category_or_sub_category(0, sub_category_id) : null;

                let advert_banners = undefined;

                if (banner_id && banner_media && req.method == 'POST') {

                    await checkRolePermissionInModel(admin_id, 'setting', 'edit');

                    await UPDATE(`UPDATE tbl_admin_banner SET banner_media = '${banner_media}', category_id = (select category_id from tbl_sub_categories where id = ${sub_category_id}), sub_category_id = ${sub_category_id}, updated_by = ${admin_id} WHERE id = ${banner_id}`);

                } else if (!banner_id && banner_media && req.method == 'POST') {

                    await checkRolePermissionInModel(admin_id, 'setting', 'edit');

                    let { category_id } = await SELECT.One(`select category_id from tbl_sub_categories where id = '${sub_category_id}'`, false);

                    await INSERT('INSERT INTO tbl_admin_banner SET ?', {
                        banner_media: banner_media,
                        category_id: category_id || null,
                        sub_category_id: sub_category_id != 0 ? sub_category_id : null,
                        created_by: admin_id,
                        country_name: country
                    });

                } else {

                    await checkRolePermissionInModel(admin_id, 'setting', 'view');

                    advert_banners = await SELECT.All(`select ab.id as banner_id, concat('${constants.ADMIN_BANNER_PATH}', ab.banner_media) as banner_media, ab.page_link, ab.sub_category_id, c.id as category_id, c.name as category_name, sc.name as sub_category_name from tbl_admin_banner ab LEFT JOIN tbl_sub_categories sc ON ab.sub_category_id = sc.id LEFT JOIN tbl_categories c ON sc.category_id = c.id WHERE ab.is_delete = 0 AND ab.country_name = '${country}'`);

                }

                return sendResponse(req, res, 200, 1, { keyword: "success" }, advert_banners);
            }
            catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_save" });
            }
        },

        delete: async (req, res) => {
            try {
                let { banner_id } = req.body;

                await DELETE(`DELETE FROM tbl_admin_banner WHERE id = ${banner_id}`);

                return sendResponse(req, res, 200, 1, { keyword: "success" });
            }
            catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_save" });
            }
        },

        show_category_or_sub_category: async (req, res) => {
            try {
                let { category_id } = req.body;

                let result = [];
                if (category_id) {
                    result = await SELECT.All(`SELECT sc.id as sub_category_id, sc.name as sub_category_name FROM tbl_sub_categories sc JOIN tbl_categories c ON sc.category_id = c.id LEFT JOIN tbl_admin_users tau on sc.updated_by = tau.id WHERE sc.category_id = ${category_id} AND sc.is_delete = 0 AND c.is_delete = 0 order by sc.sequence asc`);
                } else {
                    result = await SELECT.All(`SELECT id as category_id, name FROM tbl_categories WHERE is_delete = 0 order by sequence asc`);
                }

                return sendResponse(req, res, 200, 1, { keyword: "success" }, result);
            }
            catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_fetch" });
            }
        }
    },

    other_setting: async (req, res) => {

        let { admin_id } = req.loginUser;

        if (req.method === 'POST') {
            try {
                let { type, value } = req.body;

                let { setting_value: oldSetting } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.OTHER_SETTING}'`);

                let updatedSetting = _.cloneDeep(oldSetting);

                updatedSetting[type] = value;

                await UPDATE(`update tbl_app_setting set setting_value = '${JSON.stringify(updatedSetting)}', updated_by = ${admin_id} where setting_key = '${SETTING_KEYS.OTHER_SETTING}'`);

                return sendResponse(req, res, 200, 1, { keyword: "saved" }, updatedSetting);
            } catch (error) {
                return sendResponse(req, res, 200, 0, { keyword: "failed_to_save" });
            }
        } else {
            try {
                let { setting_value } = await SELECT.One(`SELECT setting_value FROM tbl_app_setting WHERE setting_key = '${SETTING_KEYS.OTHER_SETTING}'`);

                return sendResponse(req, res, 200, 1, { keyword: "success" }, setting_value);
            } catch (error) {
                return sendResponse(req, res, 200, 2, { keyword: error.message || "failed_to_fetch" });
            }
        }
    },

    manage_devices: async (req, res) => {
        try {
            let { country } = req.loginUser;
            let { user_type = 'admin', search } = req.body;

            let addWhere = (search) ? ` AND (LOWER(au.name) LIKE '%${search.toLowerCase()}%' OR LOWER(au.email) LIKE '%${search.toLowerCase()}%' OR au.contact_number LIKE '%${search}%' OR LOWER(ad.device_name) LIKE '%${search.toLowerCase()}%')` : '';

            let devices = await SELECT.All(`SELECT ad.id as admin_device_id, au.id as admin_id, au.name, au.email, au.contact_number, au.user_type, ad.device_name, ad.last_active FROM tbl_admin_device as ad join tbl_admin_users as au on ad.admin_id = au.id where au.is_delete = 0 AND au.is_active = 1 AND au.user_type = '${user_type}' AND au.country = '${country}' ${addWhere}`);

            return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, devices);
        }
        catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: error.message || "failed_to_fetch", components: {} });
        }
    },

    logout_device: async (req, res) => {
        try {
            let { admin_device_id } = req.body;

            await DELETE(`DELETE FROM tbl_admin_device WHERE id = ${admin_device_id}`);

            return sendResponse(req, res, 200, 1, { keyword: "success" });
        }
        catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: "failed_to_save" });
        }
    }
}

module.exports = setting_model;