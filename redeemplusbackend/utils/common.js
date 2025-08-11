require('dotenv').config();
const moment = require('moment');
const moment_tz = require('moment-timezone');
const jwt = require('jsonwebtoken');
const { SELECT, INSERT, DELETE } = require('../utils/SQLWorker');
const each = require('async-each');
const typeOf = require('just-typeof');
const _ = require('lodash');

const common = {

    jwt_validate: async (token) => {
        try {
            const verified = jwt.verify(token, process.env.JWT_SECRET_KEY);

            if (verified) {
                return verified;
            } else {
                throw new Error("token_invalid");
            }
        } catch (error) {
            // Access Denied 
            throw new Error("token_invalid");
        }
    },

    jwt_sign: (data, expiresIn = "365days") => {
        const enc_data = {
            expiresIn,
            data: data
        }

        const token = jwt.sign(enc_data, process.env.JWT_SECRET_KEY);

        return token;
    },

    admin_details: async (admin_id, admin_device_id) => {
        try {
            let admin_details = await SELECT.One(`SELECT id as admin_id, name, email, password, user_type, contact_number, alternative_contact_number, country, mac_address, profile_image, ex_id, is_active, is_delete, created_at, updated_at FROM tbl_admin_users WHERE id = ${admin_id}`);

            let device_details = await SELECT.One(`SELECT id as admin_device_id, admin_id, token, device_name, device_type, device_token, model_name, uuid, os_version, app_version, ip, time_zone, last_active, created_at, updated_at FROM tbl_admin_device WHERE id = ${admin_device_id}`);

            return { admin_details, device_details };
        } catch (e) {
            throw new Error("user_not_found");
        }
    },

    utcToLocal: (utcTime, timezone, inputTimeFormat = undefined, outputTimeFormat = undefined) => {
        // Parse the provided time string as UTC time
        utcTime = moment.utc(utcTime, inputTimeFormat);

        // Convert to Indian Standard Time (IST)
        const timezoneTime = utcTime.tz(timezone);

        // Format the time as HH:mm in Indian Standard Time
        return timezoneTime.format(outputTimeFormat);
    },

    localToUtc: (localTime, timezone, inputTimeFormat = undefined, outputTimeFormat = undefined) => {
        // Convert to UTC time
        return moment_tz.tz(localTime, inputTimeFormat, timezone).utc().format(outputTimeFormat)
    },

    pagination: (page, limit) => {
        let query = "";
        if (page != undefined && page != "") {

            if (page == 0) page = 1

            query += " LIMIT " + `${(parseInt(page) - 1) * parseInt(limit)},${limit}` + " ";
        } else {
            query += " LIMIT 10";
        }

        return query;
    },
}

module.exports = common;
