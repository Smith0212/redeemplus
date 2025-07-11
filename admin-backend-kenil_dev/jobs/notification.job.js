const Bottleneck = require('bottleneck');
const os = require('os');
const limiter = new Bottleneck({ maxConcurrent: os.cpus().length * 2, minTime: 500 });
const { APP_NAME, USER_COLOR_CODES, OTHER_IMAGE_PATH } = require('../config/constants');
const xlsx = require("xlsx");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const { SELECT, INSERT, UPDATE } = require('../utils/SQLWorker');
const { sendUgandaMail, sendKenyaMail } = require('../utils/configEmailSMTP');
const sendPush = require('../utils/configNotification');
const { sendKenyaSMS } = require('../utils/configMessage');
const moment = require('moment');

async function sendNotificationJob(notification) {
    try {
        // Process all notification types through a unified flow
        if (['Customer', 'Rider', 'Single Device', 'Branch', 'Call Centre', 'Excel Upload'].includes(notification.user_type)) {
            let users = [];

            if (notification.user_type === 'Excel Upload') {
                let numbers = await getExcelNumbers(notification.excel_sheet_name);

                // Create optimized chunks for processing
                let chunks = [];
                const chunk = 20;

                for (let i = 0; i < numbers.length; i += chunk) {
                    const temparray = numbers.slice(i, i + chunk);
                    chunks.push(temparray.map(String));
                }

                // Process each chunk to get users
                for (const phoneChunk of chunks) {
                    if (phoneChunk.length === 0) continue;

                    let query = `SELECT ${notification.id} as notification_id, id as receiver_id, country_code, phone, CONCAT(country_code, phone) as full_phone FROM tbl_users WHERE is_verify = 1 AND is_delete = 0 AND is_active = 1 AND is_guest_user = 0 AND CONCAT(country_code, phone) IN (${phoneChunk.map(phone => `'+${phone}'`).join(',')})`;

                    let chunkUsers = await SELECT.All(query, false);

                    // Identify users not found in the database
                    let notFound = phoneChunk.filter(x => !((chunkUsers || []).map(y => y.full_phone).includes("+" + String(x))));

                    if (notFound.length > 0) {
                        notFound.forEach((phone) => {
                            chunkUsers.push({
                                notification_id: notification.id,
                                receiver_id: null,
                                country_code: null,
                                phone: phone,
                                receiver_name: 'Unknown'
                            });
                        });
                    }

                    // Send notifications for this chunk
                    await sendNotification(notification, users.concat(chunkUsers));
                }
            } else {
                // For other user types, generate and execute query
                let query = await makeQuery(notification);

                // Execute only if we have a valid query
                if (!query || query.trim() === '') {
                    await UPDATE(`update tbl_notif_admin_sent_init set ? where id = ${notification.id}`, {
                        status: 'failed',
                        failed_reason: 'Invalid query generated'
                    });
                    return;
                }

                let offset = 0;
                const limit = 100;
                let users = [];

                do {
                    // Modify the query to include LIMIT and OFFSET for pagination
                    const paginatedQuery = `${query} LIMIT ${limit} OFFSET ${offset}`;
                    const batchUsers = await SELECT.All(paginatedQuery, false);

                    if (batchUsers.length === 0) {
                        break; // Exit the loop if no more data is found
                    }

                    // Process the batch of users
                    users = users.concat(batchUsers);

                    // Increment the offset for the next batch
                    offset += limit;

                    // Process the current batch (e.g., send notifications)
                    await sendNotification(notification, batchUsers);

                } while (true); // Exit loop when no more data is found
            }

            // Mark notification as successful once all batches are processed
            await UPDATE(`update tbl_notif_admin_sent_init set ? where id = ${notification.id} AND status = 'in_process'`, {
                status: 'success'
            });
        }
    }
    catch (error) {
        await UPDATE(`update tbl_notif_admin_sent_init set ? where id = ${notification.id} AND status = 'in_process'`, {
            status: 'failed',
            failed_reason: error.message || 'Unknown error'
        });
    }
}

// No changes needed for makeQuery function
async function makeQuery({ user_type, notif_filter_id, notif_sub_filter_id, notif_filter_value, mode, send_date, other_data, country }) {
    let query = ``;

    if (user_type == 'Customer') { // All Customers

        let field = `id as receiver_id, (SELECT group_concat(device_token) FROM tbl_user_device WHERE user_id = tbl_users.id {device_type} AND CHAR_LENGTH(device_token) > 140) as device_token`; // default push notification
        if (mode == 'SMS') { // SMS
            field = 'id as receiver_id, country_code, phone';
        } else if (mode == 'Email') { // Email
            field = 'id as receiver_id, email, country_name as country';
        } else if (mode == 'WhatsApp') { // WhatsApp
            field = `id as receiver_id, IF( whatsapp_country_code IS NOT NULL AND whatsapp_country_code != '', whatsapp_country_code, null ) AS country_code, IF( whatsapp_phone IS NOT NULL AND whatsapp_phone != '', whatsapp_phone, null ) AS phone`;
        };

        query = `SELECT ${field} FROM tbl_users WHERE ${(country != null) ? `country_name = '${country}' AND` : ''} is_verify = 1 AND is_delete = 0 AND is_active = 1 AND is_guest_user = 0 `;
        if (notif_filter_id == 1 && notif_sub_filter_id == 47) { // Frequent Order
            query += ``;
        } else if (notif_filter_id == 2) { // Membership Customers
            query += `AND id in (select distinct user_id from tbl_user_buy_membership where is_active = 1 AND payment_status = 'paid')`;
            if (notif_sub_filter_id == 37) { // One Month
                query += `AND id in (select distinct user_id from tbl_user_buy_membership where is_active = 1 AND payment_status = 'paid')`;
            } else if (notif_sub_filter_id == 38) { // -- Three Months
                query += `AND id in (select distinct user_id from tbl_user_buy_membership where is_active = 1 AND payment_status = 'paid')`;
            } else if (notif_sub_filter_id == 39) { // -- Six Months
                query += `AND id in (select distinct user_id from tbl_user_buy_membership where is_active = 1 AND payment_status = 'paid')`;
            } else if (notif_sub_filter_id == 40) { // -- One Year
                query += `AND id in (select distinct user_id from tbl_user_buy_membership where is_active = 1 AND payment_status = 'paid')`;
            }
        } else if (notif_filter_id == 3) { // Regular Customers
            query += `AND user_color_code_id = ${USER_COLOR_CODES.REGULAR}`;
        } else if (notif_filter_id == 4) { // New Customers
            query += `AND user_color_code_id = ${USER_COLOR_CODES.NEW}`;
        } else if (notif_filter_id == 5) { // Inactive Customers
            query += `AND user_color_code_id = ${USER_COLOR_CODES.INACTIVE}`;
        } else if (notif_filter_id == 6) { // Blocked Customers
            query += `AND user_color_code_id = ${USER_COLOR_CODES.BLOCKED}`;
        } else if (notif_filter_id == 7) { // Red Flag Customers
            query += `AND user_color_code_id = ${USER_COLOR_CODES.RED_FLAG}`;
        } else if (notif_filter_id == 8) { // Prank Customers
            query += `AND user_color_code_id = ${USER_COLOR_CODES.PRANK}`;
        } else if (notif_filter_id == 9) { // Cancelling Customers
            query += `AND user_color_code_id = ${USER_COLOR_CODES.CANCELLING}`;
        } else if (notif_filter_id == 10) { // Double Order Customers
            query += `AND user_color_code_id = ${USER_COLOR_CODES.DOUBLE_ORDER}`;
        } else if (notif_filter_id == 11) { // Wrong Address Customers
            query += `AND user_color_code_id = ${USER_COLOR_CODES.WRONG_ADDRESS}`;
        } else if (notif_filter_id == 12) { // Women Customers
            query += `AND gender = 'female'`;
            if (notif_sub_filter_id == 41) { // -- Premium Customers
                query += `AND gender = 'female' AND id in (select distinct user_id from tbl_user_buy_membership where is_active = 1 AND payment_status = 'paid')`;
            }
        } else if (notif_filter_id == 13) { // Men Customers
            query += `AND gender = 'male'`;
            if (notif_sub_filter_id == 42) { // -- Premium Customers
                query += `AND gender = 'male' AND id in (select distinct user_id from tbl_user_buy_membership where is_active = 1 AND payment_status = 'paid')`;
            }
        } else if (notif_filter_id == 14) { // Birthday Customers
            if (other_data?.receiver_type == 'Birthday') { // for promocode
                // query to get the birthday customers beetween the date range
                query += `AND DATE_FORMAT(date_of_birth, '%Y-%m-%d') BETWEEN DATE_FORMAT('${moment(other_data?.start_datetime).format('YYYY-MM-DD')}', '%Y-%m-%d') AND DATE_FORMAT('${moment(other_data?.end_datetime).format('YYYY-MM-DD')}', '%Y-%m-%d')`;
            } else {
                query += `AND DATE_FORMAT(date_of_birth, '%m-%d') = DATE_FORMAT('${send_date}', '%m-%d')`;
            }
        } else if (notif_filter_id == 15) { // Silver Tier Customers
            query += ``;
        } else if (notif_filter_id == 16) { // Gold Tier Customers
            query += ``;
        } else if (notif_filter_id == 17) { // Rewards Customers
            query += ``;
            if (notif_sub_filter_id == 43) { // -- Silver Tier Customers
                query += ``;
            } else if (notif_sub_filter_id == 44) { // -- Gold Tier Customers
                query += ``;
            } else if (notif_sub_filter_id == 45) { // -- Platinum Tier Customers
                query += ``;
            } else if (notif_sub_filter_id == 46) { // -- Diamond Tier Customers
                query += ``;
            }
        } else if (notif_filter_id == 18) { // Android Customers
            query = query.replace('{device_type}', `AND device_type = 'A'`);
            query += `AND id in (SELECT user_id FROM tbl_user_devices WHERE device_type = 'A')`;
        } else if (notif_filter_id == 19) { // iOS Customers
            query = query.replace('{device_type}', `AND device_type = 'I'`);
            query += `AND id in (SELECT user_id FROM tbl_user_devices WHERE device_type = 'I')`;
        } else if (notif_filter_id == 20) { // Website Customers
            query = query.replace('{device_type}', `AND device_type = 'W'`);
            query += `AND id in (SELECT user_id FROM tbl_user_devices WHERE device_type = 'W')`;
        } else if (notif_filter_id == 21) { // Call Center Customers
            query += ``;
        } else if (notif_filter_id == 22) { // Customer Order Average Value Below 50,000 UGX
            query += `AND id in (SELECT distinct user_id FROM tbl_order WHERE total_amount < 50000 AND country = 'Uganda')`;
        } else if (notif_filter_id == 23) { // Customer Order Average Value Below 1800 KSH (Kenya Only)
            query += `AND id in (SELECT distinct user_id FROM tbl_order WHERE total_amount < 1800 AND country = 'Kenya')`;
        } else if (notif_filter_id == 24) { // Customer Order Average Value Below 100,000 UGX
            query += `AND id in (SELECT distinct user_id FROM tbl_order WHERE total_amount < 100000 AND country = 'Uganda')`;
        } else if (notif_filter_id == 25) { // Customer Order Average Value 3500 KSH (Kenya Only)
            query += `AND id in (SELECT distinct user_id FROM tbl_order WHERE total_amount < 3500 AND country = 'Kenya')`;
        } else if (notif_filter_id == 36) { // Wallet Money Customers
            query += `And wallet_amount > 0`;
        }
    } else if (user_type == 'Rider') {  // All Riders

        let field = 'id as receiver_id, (SELECT group_concat(device_token) FROM tbl_rider_user_device WHERE rider_id = tbl_rider_users.id AND CHAR_LENGTH(device_token) > 140) as device_token' // default push notification
        if (mode == 'SMS' || mode == 'WhatsApp') { // SMS or WhatsApp
            field = `id as receiver_id, (CASE WHEN country_name = 'Uganda' THEN '+256' WHEN country_name = 'Kenya' THEN '+254' ELSE NULL END) as country_code, phone`
        } else if (mode == 'Email') { // Email
            field = 'id as receiver_id, email, country_name as country'
        }

        query = `SELECT ${field} FROM tbl_rider_users WHERE is_active = 1 AND is_delete = 0`;
        if (notif_filter_id == 26 && notif_sub_filter_id == 27) { // -- In-house
            query += `AND rider_type = 'in_house'`;
        } else if (notif_filter_id == 26 && notif_sub_filter_id == 28) { // -- Boda Riders
            query += `AND rider_type = '3rd_party'`;
        }
    } else if (user_type == 'Branch') {  // All Branch

        let field = 'id as receiver_id, if(CHAR_LENGTH(device_token) > 140, device_token, null) as device_token' // default push notification
        if (mode == 'SMS' || mode == 'WhatsApp') { // SMS or WhatsApp
            field = `id as receiver_id, (CASE WHEN country = 'Uganda' THEN '+256' WHEN country = 'Kenya' THEN '+254' ELSE NULL END) as country_code, phone_number as phone`
        } else if (mode == 'Email') { // Email
            field = 'id as receiver_id, email, country'
        }

        query = `SELECT ${field} FROM tbl_restaurants WHERE is_delete = 0 AND is_active = 1 `;
        if (notif_filter_id == 29 && notif_sub_filter_id == 30) { // -- Branches with Delivery Service
            query += `AND is_delivery = 1`;
        } else if (notif_filter_id == 29 && notif_sub_filter_id == 31) { // -- Individual Branch List
            query += `AND id in (${notif_filter_value.split(',').map(Number)})`;
        }
    } else if (user_type == 'Call Center') {  // All Call Center
        query = ``;
        if (notif_filter_id == 32) { // -- All Call Center Admins
            query += ``;
        } else if (notif_filter_id == 33) { // -- All Call Center Agents
            query += ``;
        }
    } else if (user_type == 'Single Device') {  // For Single Device

        let field = 'id as receiver_id, (SELECT group_concat(device_token) FROM tbl_user_device WHERE user_id = tbl_users.id AND CHAR_LENGTH(device_token) > 140) as device_token' // default push notification
        if (mode == 'SMS') { // SMS
            field = 'id as receiver_id, country_code, phone'
        } else if (mode == 'Email') { // Email
            field = 'id as receiver_id, email, country_name as country'
        } else if (mode == 'WhatsApp') { // WhatsApp
            field = 'id as receiver_id, whatsapp_country_code as country_code, whatsapp_phone as phone'
        }

        query = `SELECT ${field} FROM tbl_users WHERE is_verify = 1 AND is_delete = 0 AND is_active = 1 AND is_guest_user = 0 AND id in (${notif_filter_value?.split(',').map(Number)})`;
        if (notif_filter_value?.split(',').length > 1) {
            query += ` GROUP BY id`;
        }
    }

    return query?.replace('{device_type}', '');
}

async function getExcelNumbers(excel_sheet_name) {
    try {
        // Get the file from S3
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: "cjs/other/" + excel_sheet_name,
        };

        const data = await s3.getObject(params).promise();

        // Convert the file buffer to a workbook
        const workbook = xlsx.read(data.Body, { type: "buffer" });

        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Read only column A
        const columnA = [];
        const range = xlsx.utils.decode_range(sheet['!ref']);
        for (let row = range.s.r; row <= range.e.r; row++) {
            const cellAddress = xlsx.utils.encode_cell({ r: row, c: 0 }); // Column A (index 0)
            const cell = sheet[cellAddress];
            if (cell) {
                columnA.push(cell.v); // Push the cell value
            }
        }

        return columnA;
    } catch (error) {
        throw error;
    }
}

async function sendNotification(notification, users) {
    // Process users in batches for all notification types
    const batchSize = 20;
    let batches = [];

    for (let i = 0; i < users.length; i += batchSize) {
        batches.push(users.slice(i, i + batchSize));
    }

    // Process each batch
    for (const batch of batches) {

        const userLogs = (notification.is_send_internal == 0) ? await Promise.all(batch.map(async (user) => {
            try {
                const logId = await INSERT('insert into tbl_notif_admin_sent_log set ?', {
                    notification_id: notification.id,
                    receiver_id: user.receiver_id,
                    receiver_name: user.receiver_name || null,
                    country_code: user.country_code || null,
                    phone: user.phone || null,
                    status: 'Sending',
                    failed_reason: null
                });

                return { ...user, log_id: logId };
            } catch (error) {
                return null;
            }
        })) : batch;

        // Filter out failed log insertions
        const validUserLogs = notification.is_send_internal == 0 ? userLogs.filter(log => log !== null) : batch;

        // Schedule sending via limiter
        await limiter.schedule(async () => {
            await Promise.all(validUserLogs.map(async (user) => {
                try {
                    let response = {
                        status: false,
                        error: null
                    };

                    if (notification.mode === 'Push Notification') {

                        let image_url = OTHER_IMAGE_PATH + notification.media_name;
                        if (notification?.internal_type == 'campaign') {
                            image_url = notification.other_data.image_url;
                        }

                        response = await sendPush({
                            sender_id: notification.created_by,
                            sender_type: "admin",
                            receiver_id: user.receiver_id,
                            device_token: user.device_token,
                            receiver_type: (notification.user_type == 'Customer' || notification.user_type == 'Single Device') ? 'customer' : notification.user_type == 'Rider' ? 'rider' : notification.user_type == 'Branch' ? 'branch' : notification.user_type == 'Call Center' ? 'call_center' : 'system',
                            title: notification.title,
                            body: notification.description,
                            tag: notification.push_tag,
                            image_url: image_url,
                            image: notification?.media_name || null,
                        });

                    } else if (notification.mode === 'WhatsApp') {

                        response = {
                            status: false,
                            error: 'Under Development'
                        }

                    } else if (notification.mode === 'SMS') {

                        if (user.country_code === '+256') {

                            response = {
                                status: false,
                                error: 'Under Development'
                            }

                        } else if (user.country_code === '+254') {
                            response = await sendKenyaSMS({
                                country_code: user.country_code,
                                phone: user.phone,
                                message: notification.description
                            });
                        }

                    } else if (notification.mode === 'Email') {

                        if (user.country === 'Uganda') {

                            response = await sendUgandaMail({
                                from: `"${APP_NAME}" <${process.env.EMAIL_SMTP_UGANDA_USERNAME}>`,
                                to: user.email,
                                subject: notification.title,
                                html: notification.description,
                            });

                        } else if (user.country === 'Kenya') {

                            response = await sendKenyaMail({
                                from: `"${APP_NAME}" <${process.env.EMAIL_SMTP_KENYA_USERNAME}>`,
                                to: user.email,
                                subject: notification.title,
                                html: notification.description
                            });

                        }

                    }

                    if (notification.is_send_internal == 0) {
                        await UPDATE(`update tbl_notif_admin_sent_log set action_datetime = now(), ? where id = ${user.log_id}`, {
                            status: response?.status ? 'Sent' : 'Failed',
                            failed_reason: response.status ? null : response?.error || 'Unknown error'
                        });
                    }
                } catch (error) {
                    if (notification.is_send_internal == 0) {
                        await UPDATE(`update tbl_notif_admin_sent_log set action_datetime = now(), ? where id = ${user.log_id}`, {
                            status: 'Failed',
                            failed_reason: `Error: ${error.message || 'Unknown error'}`
                        });
                    }
                }
            }));
        });
    }
}

module.exports = {
    sendNotificationJob
};