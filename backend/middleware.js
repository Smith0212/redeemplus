require('dotenv').config();
const { SELECT } = require('./utils/SQLWorker.js');
const { ENCRYPTION_BYPASS } = require('./config/constants.js');
const en = require('./languages/en.js');
const cryptoLib = require('cryptlib');
const shaKey = cryptoLib.getHashSha256(process.env.KEY, 32);
const { default: localizify } = require('localizify');
const { t } = require('localizify');
const jwt = require('jsonwebtoken');

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
        const { data } = jwt.verify(req.headers['token'], process.env.JWT_SECRET_KEY);
        console.log('token data : -------------------------------------\n', data);

        req.loginUser.admin_id = data.admin_id;
        req.loginUser.country = data?.country || 'Uganda';
        // req.loginUser.country = req.headers['accept-country'] || 'Uganda';
        req.loginUser.language = req.headers['accept-language'] || 'en';
        // req.loginUser.currency = (req.headers['accept-country'] == 'Kenya') ? 'KES' : 'UGX';
        req.loginUser.currency = (data?.country == 'Kenya') ? 'KES' : 'UGX';

        // await SELECT.One(`select a.id from tbl_admin_users as a JOIN tbl_admin_device as ad ON a.id = ad.admin_id where a.id = ${data.admin_id} AND a.is_delete = 0 AND ad.token = '${req.headers['token']}'`, 'single');

        await SELECT.One(`select ad.id from tbl_admin_device as ad where ad.id = ${data.device_id} AND ad.token = '${req.headers['token']}'`);

        next();
    } catch (e) {
        // Access Denied 
        let keyword = 'token_invalid';
        sendResponse(req, res, 401, '-1', { keyword: keyword, components: {} }, {});
    }
}

const checkRolePermission = function (module, actionType) {
    return async (req, res, next) => {
        let count = await SELECT.All(`select a.id from tbl_admin_users as a join tbl_admin_role_permission as b on a.id = b.admin_id where a.id = ${req.loginUser.admin_id} AND a.is_${actionType}_permission = 1 AND b.permission = '${module}'`, false);

        if (count.length > 0) {
            next();
        } else {
            sendResponse(req, res, 403, 0, { keyword: 'permission_denied' });
        }
    }
}

const checkRolePermissionInModel = async function (adminId, module, actionType) {

    let count = await SELECT.All(`select a.id from tbl_admin_users as a join tbl_admin_role_permission as b on a.id = b.admin_id where a.id = ${adminId} AND a.is_${actionType}_permission = 1 AND b.permission = '${module}'`, false);

    if (count.length > 0) {
        return true;
    } else {
        throw new Error('permission_denied');
    }
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
            // return res.status(200).json(encryption({ code: 0, message: error.details[0].message }));
            return res.status(200).json({ code: 0, message: error.details[0].message });
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
    checkRolePermissionInModel,
    checkRolePermission,
    sendResponse,
    decryption,
    encryption,
    validateJoi
};