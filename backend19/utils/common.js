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

   


    // // Update user details in tbl_user (PostgreSQL, async/await)
    // updateUserInfo: async (user_id, data) => {
    //     if (!user_id || !data || Object.keys(data).length === 0) {
    //         throw new Error("Invalid user ID or no data provided");
    //     }

    //     // Build SET clause dynamically
    //     const setClauses = [];
    //     const values = [];
    //     let idx = 1;
    //     for (const key in data) {
    //         setClauses.push(`"${key}" = $${idx++}`);
    //         values.push(data[key]);
    //     }
    //     values.push(user_id); // For WHERE clause

    //     const updateQuery = `UPDATE tbl_user SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`;

    //     const result = await SELECT.One(updateQuery, false, values);
    //     if (!result) {
    //         throw new Error("User not found or no changes made");
    //     }
    //     return result;
    // },

    // // Update device details in tbl_device_info (PostgreSQL, async/await)
    // updateDeviceInfo: async (user_id, data) => {
    //     if (!user_id || !data || Object.keys(data).length === 0) {
    //         throw new Error("Invalid user ID or no data provided");
    //     }

    //     // Build SET clause dynamically
    //     const setClauses = [];
    //     const values = [];
    //     let idx = 1;
    //     for (const key in data) {
    //         setClauses.push(`"${key}" = $${idx++}`);
    //         values.push(data[key]);
    //     }
    //     values.push(user_id); // For WHERE clause

    //     const updateQuery = `UPDATE tbl_device_info SET ${setClauses.join(', ')} WHERE user_id = $${idx} RETURNING *`;

    //     const result = await SELECT.One(updateQuery, false, values);
    //     if (!result) {
    //         throw new Error("No rows updated. Check if user_id exists.");
    //     }
    //     return result;
    // },

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

    save_multiple_images: async (images) => {
        let save_images = [];
        if (images.length > 0) {
            await new Promise((resolve) => {
                each(images, async (image, callback) => {
                    let insertObj = {};
                    if (typeOf(image) === 'object') {
                        insertObj.name = image.image_name;
                        insertObj.extension = image.image_name.split('.').pop();
                        insertObj.type = image.type;
                    } else {
                        insertObj.name = image;
                        insertObj.extension = image.split('.').pop();
                    }

                    try {
                        let image_id = await INSERT(`INSERT INTO tbl_media_files SET ?`, insertObj);

                        save_images.push(image_id);
                        callback();
                    } catch (err) {
                        console.error("Error inserting image:", err);
                        callback();
                    }
                }, function (err) {
                    resolve();
                });
            });
        }

        return save_images;
    },

    // old_images = [{image_id: 1, image_name: 'image1.jpg'}, {image_id: 1, image_name: 'image2.jpg'}]
    // new_images = {image_name: image, type: null}
    update_multiple_images: async (old_images = [], new_images = [], old_image_delete = true) => {

        let existingImagesArray = new_images.map(image => image.image_name);

        let existingImages = old_images.filter(row => existingImagesArray.includes(row.image_name));

        let newImages = new_images.filter(image => !existingImages.some(row => row.image_name === image.image_name));

        let notExistingImages = old_images.filter(row => !existingImagesArray.includes(row.image_name));

        let newImagesIds = [];
        if (newImages.length > 0) {
            newImagesIds = await common.save_multiple_images(newImages);
        }

        if (notExistingImages.length > 0 && old_image_delete) {
            await DELETE(`DELETE FROM tbl_media_files WHERE id IN (${notExistingImages.map(image => image.image_id)})`);
        }

        return _.concat(existingImages.map(image => image.image_id), newImagesIds);
    },

    check_file_format: (files, allowd_media_files) => {
        let invalidFiles = files.filter(file => {
            let ext = file.split('.').pop() || '';
            return !allowd_media_files.includes(ext);
        });

        return invalidFiles.length > 0;
    },

    category_or_sub_category: async (category_id, sub_category_id) => {
        try {
            if (category_id != 0) {
                let { is_active } = await SELECT.One(`select id, is_active from tbl_categories where id = ${category_id} AND is_delete = 0`, true, {
                    no_data_msg: "category_not_found",
                    failed_msg: "failed_to_fetch_category"
                });

                if (is_active == 0) {
                    throw new Error("category_is_not_active");
                }
            }

            if (sub_category_id != 0) {
                let { is_active } = await SELECT.One(`select id, is_active from tbl_sub_categories where id = ${sub_category_id} AND is_delete = 0`, true, {
                    no_data_msg: "sub_category_not_found",
                    failed_msg: "failed_to_fetch_sub_category"
                });

                if (is_active == 0) {
                    throw new Error("sub_category_is_not_active");
                }
            }

            return true;
        }
        catch (e) {
            throw new Error(e.message);
        }
    },

    // Convert a number to a suffix (e.g. 1000 -> 1K, 1000000 -> 1M, 1000000000 -> 1B, etc.)
    convertNumberToSuffix: (num) => {
        if (num < 1e3) return num;  // If number is less than 1000, return as is.

        const suffixes = ["", "K", "M", "B", "T"];
        const magnitude = Math.floor(Math.log10(num) / 3);  // Find the power of 1000
        const scaledNum = num / Math.pow(1000, magnitude);  // Scale the number down

        // Return the number without decimal if it's a whole number
        const formattedNum = (scaledNum % 1 === 0) ? scaledNum.toFixed(0) : scaledNum.toFixed(1);

        return formattedNum + suffixes[magnitude];  // Append the appropriate suffix
    }

}

module.exports = common;
