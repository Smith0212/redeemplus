require('dotenv').config();
const { ENCRYPTION_BYPASS } = require('./config/constants.js');
const en = require('./languages/en.js');
const ar = require('./languages/ar.js');
const cryptoLib = require('cryptlib');
const shaKey = cryptoLib.getHashSha256(process.env.KEY, 32);
const { default: localizify } = require('localizify');
const { t } = require('localizify');
const jwt = require('jsonwebtoken');
const pool = require('./config/database');
const { sendIndiaMail } = require('./utils/configEmailSMTP');



// Function to validate API key of header (Note : Header keys are encrypted)
const checkApiKey = function (req, res, next) {

    if (req.headers['api-key'] == process.env.API_KEY) {
        next();
    } else {
        sendResponse(req, res, 401, '-1', { keyword: 'invalid_api_key', components: {} }, {});
    }
}

const checkToken = async function (req, res, next) {
    try {
        req.loginUser = {};
        console.log("secret key :", process.env.JWT_SECRET_KEY);
        console.log("token :", req.headers['token']);
        const data = jwt.verify(req.headers['token'], process.env.JWT_SECRET_KEY);
        console.log('token data : -------------------------------------', data);
        const { rows } = await pool.query(
            `SELECT * FROM tbl_users WHERE id = $1 AND is_deleted = FALSE`,
            [data.user_id]
        );
        const user = rows[0];
        // console.log("user : ", user);
        if (!user) {
            return sendResponse(req, res, 401, '-1', { keyword: 'user_not_found', components: {} }, {});
        }
        req.user = user;

        next();
    } catch (e) {
        // Access Denied 
        let keyword = 'token_invalid';
        sendResponse(req, res, 401, '-1', { keyword: keyword, components: {} }, {});
    }
}

const generateOTP = () => {
    // generate otp of 4 digit 
    return Math.floor(1000 + Math.random() * 9000).toString();
}

const sendOTP = async (email, action = 'signup') => {
    // Find user by email to get user_id
    const userQuery = 'SELECT id FROM tbl_users WHERE email = $1 AND is_deleted = FALSE';
    const userResult = await pool.query(userQuery, [email]);
    if (userResult.rows.length === 0) {
        throw new Error('User not found');
    }
    const user_id = userResult.rows[0].id;

    // Generate OTP and expiry (e.g., 10 minutes from now)
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Insert OTP into tbl_otp
    // Upsert OTP: if exists, update; else, insert (PostgreSQL ON CONFLICT)
    const upsertOtpQuery = `
            INSERT INTO tbl_otp (user_id, otp, expires_at, action, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (user_id, action)
            DO UPDATE SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at, created_at = NOW()
            RETURNING id, user_id, otp, expires_at, action, created_at
        `;
    const otpResult = await pool.query(upsertOtpQuery, [user_id, otp, expiresAt, action]);
    const otpRow = otpResult.rows[0];

    // send OTP via email here
    // For simple signup, send OTP to email

    await sendIndiaMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Welcome to RedeemPlus - Your OTP',
        html: `Your OTP is ${otp}. Please use this to complete your registration.`,
    });

    // Convert to IST or your local time
    const localExpiresAt = new Date(otpRow.expires_at).toLocaleString();

    return {
        user_id: otpRow.user_id,
        otp: otpRow.otp,
        expires_at: localExpiresAt,
        action: otpRow.action
    };
}

// Middleware function for validation
const validateJoi = (schema) => {
    return (req, res, next) => {
        const options = {
            errors: {
                wrap: {
                    label: false
                }
            },
            stripUnknown: true
        };

        const { error } = schema.validate(req.body, options);

        // req.body = value;

        if (error) {
            return res.status(200).json(encryption({ code: 0, message: error.details[0].message }));
            // return res.status(200).json({ code: 0, message: error.details[0].message });
        }

        next();
    };
}

// Function to return response for any api
const sendResponse = function (req, res, statuscode, responsecode, { keyword = 'failed', components = {} }, responsedata) {
    let formatmsg = getMessage(req.headers?.['accept-language'], keyword, components);

    if (keyword == 'no_data') {
        responsecode = 2;
    }

    // let encrypted_data = encryption({ code: responsecode, message: formatmsg, data: responsedata });

    let encrypted_data = { code: responsecode, message: formatmsg, data: responsedata };

    res.status(statuscode);
    res.send(encrypted_data);
}

const decryption = function (req, res, next) {
    console.log(req.originalUrl, '-----------------------------------------------------------------------------------');
    if (!ENCRYPTION_BYPASS) {
        try {
            if (req.body != undefined && Object.keys(req.body).length !== 0) {
                req.body = JSON.parse(cryptoLib.decrypt(req.body, shaKey, process.env.IV));
                console.log('-----------------------------------------------------------------------------------');
                console.log('req.body :', req.body);
                console.log('-----------------------------------------------------------------------------------');
                next();
            } else {
                next();
            }
        } catch (e) {
            res.status(200);
            res.json({ code: 0, message: "badEncrypt" });
        }
    } else {
        next();
    }
}

// Function to encrypt the response body before sending response
const encryption = function (response_data) {
    if (!ENCRYPTION_BYPASS) {
        return cryptoLib.encrypt(JSON.stringify(response_data), shaKey, process.env.IV);
    } else {
        return response_data;
    }
}

// Function to send users language from any place
const getMessage = function (requestLanguage = 'en', key, value) {
    try {
        localizify
            .add('en', en)
            .add('ar', ar)
            .setLocale(requestLanguage);

        let message = t(key, value);

        return message;
    } catch (e) {
        return "Something went wrong";
    }
}

module.exports = {
    checkApiKey,
    checkToken,
    generateOTP,
    sendOTP,
    sendResponse,
    decryption,
    encryption,
    validateJoi
};
