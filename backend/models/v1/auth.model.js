const { SELECT, INSERT, UPDATE, DELETE } = require('../../utils/SQLWorker');
const { sendResponse } = require('../../middleware');
// const common = require('../../utils/common');
const moment = require('moment');
const bcrypt = require('bcrypt');
const cryptoLib = require('cryptlib');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const pool = new Pool(require("../../config/database"));
const responseCode = require('../../config/responseCode');
// const response_message = require('../../config/responseMessage');
// const shaKey = cryptoLib.getHashSha256(process.env.PASSWORD_ENC_KEY, 32);
// const { ADMIN_IMAGE_PATH, permissions, COUNTRY_IMAGE_PATH } = require('../../config/constants');
// const NodeCache = require("node-cache");
// Cache instance stdTTL is set to 3600 seconds (60 minutes) and check period is set to 60 seconds
// const myCache = new NodeCache({ stdTTL: 3600, checkperiod: 60 });

let auth_model = {
 async signup(req, res) {
    try {
        console.log("Request Body model:", req.body);
        const {
            username,
            email,
            password,
            country_code = '+91',
            phone,
            account_type,
            profile_image = null,
            device_type = 'A',
            device_name = 'unknown',
            os_version = 'unknown',
            app_version = '1.0',
            device_token = 'unknown',
            timezone = 'UTC'
        } = req.body;

        // Check if email already exists
        const checkEmailQuery = `
            SELECT id FROM tbl_users 
            WHERE email = $1  AND is_active = TRUE AND is_deleted = FALSE;
        `;

        console.log("111111")
        const emailResult = await pool.query(checkEmailQuery, [email]);
        console.log("1Email Result:", JSON.stringify(emailResult));
        if (emailResult.rows.length > 0) {
            return sendResponse(
                req,
                res,
                200,
                responseCode.OPERATION_FAILED,
                { keyword: 'email_already_exists' },
                {}
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("2Hashed Password:", hashedPassword);
        // Insert user
        const insertUserQuery = `
            INSERT INTO tbl_users 
            (username, email, password, country_code, phone, account_type, profile_image, is_active, is_deleted)
            VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, FALSE)
            RETURNING id
        `;
        const userResult = await pool.query(insertUserQuery, [
            username,
            email,
            hashedPassword,
            country_code,
            phone,
            account_type,
            profile_image
        ]);
        console.log("3User Insert Result:", userResult);

        const newUserId = userResult.rows[0].id;

        // Generate token
        const user_token = jwt.sign({ user_id: newUserId }, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });

        // Insert device info
        const insertDeviceQuery = `
            INSERT INTO tbl_device_info 
            (user_id, device_type, device_name, os_version, app_version, user_token, device_token, timezone, is_active, is_deleted)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, FALSE)
        `;
        await pool.query(insertDeviceQuery, [
            newUserId,
            device_type,
            device_name,
            os_version,
            app_version,
            user_token,
            device_token,
            timezone
        ]);

        // Placeholder for OTP (implement later)
        const otp = null;

        return sendResponse(
            req,
            res,
            200,
            responseCode.SUCCESS,
            { keyword: 'success' },
            { user_id: newUserId, user_token, otp }
        );
    } catch (err) {
        console.error('Signup Error:', err);
        return sendResponse(
            req,
            res,
            500,
            responseCode.OPERATION_FAILED,
            { keyword: 'unsuccess' },
            err.message
        );
    }
}


};

module.exports = auth_model;