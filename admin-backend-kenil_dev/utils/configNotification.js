const admin = require('firebase-admin');
const { SELECT, INSERT } = require('../utils/SQLWorker');
// Initialize Firebase Admin SDK
const serviceAccount = require('../constant/notificationConfig.json');
const mapValues = require('lodash/mapValues');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const sendPush = async (params) => {
    let userDetails, insertData, message;
    try {
        let addWhere = '';

        if (params.device_token == undefined) {
            if (params?.receiver_type == 'customer') {

                userDetails = await SELECT.One(`select u.id as receiver_id, (select group_concat(device_token) from tbl_user_device where user_id = u.id ${addWhere} AND CHAR_LENGTH(device_token) > 140) as device_token from tbl_users as u where u.id = ${params.receiver_id} AND u.is_verify = 1 AND u.is_active = 1 AND u.is_delete = 0`);

            } else if (params?.receiver_type == 'rider') {

                userDetails = await SELECT.One(`select r.id as receiver_id, (select group_concat(device_token) from tbl_rider_user_device where rider_id = r.id AND CHAR_LENGTH(device_token) > 140) as device_token from tbl_rider_users as r where r.id = ${params.receiver_id} AND r.is_active = 1 AND r.is_delete = 0 group by r.id`);

            } else if (params?.receiver_type == 'admin') {

                userDetails = await SELECT.One(`select a.id as receiver_id, (select group_concat(device_token) from tbl_admin_device where admin_id = a.id AND CHAR_LENGTH(device_token) > 140) as device_token from tbl_admin_users as a where a.id = ${params.receiver_id} AND a.is_active = 1 AND a.is_delete = 0 group by a.id`);

            }

            userDetails.device_token = userDetails.device_token?.split(',') || []

        } else {
            userDetails = {
                receiver_id: params.receiver_id,
                device_token: params.device_token?.split(',') || []
            };
        }

        if (params?.is_insert != 0 && params?.receiver_type == 'customer') {

            insertData = {
                sender_id: params.sender_id,
                sender_type: params.sender_type || 'system',
                receiver_id: params?.receiver_id,
                receiver_type: params?.receiver_type || 'customer',
                title: params.title,
                body: params.body,
                image: params?.image || null,
                ref_id: params?.ref_id || null,
                ref_tbl_name: params?.ref_tbl_name || null,
                tag: params?.tag || 'admin_notification',
                is_read: params?.is_read != 1 ? 0 : 1,
                other_data: JSON.stringify(params?.other_data || {})
            };

            INSERT('INSERT INTO tbl_notif_users SET ?', insertData).catch(e => { });

        } else if (params?.is_insert != 0 && params?.receiver_type == 'rider') {

            insertData = {
                sender_id: params.sender_id,
                sender_type: params.sender_type || 'system',
                receiver_id: params?.receiver_id,
                receiver_type: params?.receiver_type || 'rider',
                title: params.title,
                body: params.body,
                image: params?.image || null,
                ref_id: params?.ref_id || null,
                ref_tbl_name: params?.ref_tbl_name || null,
                tag: params?.tag || 'ADMIN',
                is_read: params?.is_read != 1 ? 0 : 1,
                other_data: JSON.stringify(params?.other_data || {})
            };

            INSERT('INSERT INTO tbl_notif_riders SET ?', insertData).catch(e => { });

        }

        params.other_data = mapValues(params?.other_data || {}, (value) => String(value));

        if (userDetails.device_token?.length == 0) {
            throw new Error('Token not found Or Invalid');
        }

        message = {
            "notification": {
                "title": params.title.toString(),
                "body": params.body.toString(),
            },
            "data": {
                "title": params.title.toString(),
                "message": params.body.toString(),
                "tag": params.tag.toString(),
                "ref_id": (params?.ref_id || "").toString(),
                "ref_name": (params?.ref_tbl_name || "").toString(),
                "image": params?.image_url || "",
                ...params?.other_data
            },
            "tokens": userDetails.device_token
        };

        await admin.messaging().sendEachForMulticast(message);

        return { status: true, message: 'Notification sent successfully' };
    }
    catch (e) {
        return { status: false, error: e?.message };
    } finally {
        // Free up memory
        userDetails = null;
        insertData = null;
        message = null;
        params = null;
    }
}

module.exports = sendPush;