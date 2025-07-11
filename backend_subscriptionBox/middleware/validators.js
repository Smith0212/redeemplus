const Validator = require('Validator');
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const { default: localizify } = require('localizify');
var en = require('../language/en');
var ar = require('../language/ar');
// const { t } = require('localizify');


var con = require('../config/database');

var cryptoLib = require('cryptlib')
var shaKey = cryptoLib.getHashSha256(process.env.KEY, 32)

var bypassMethods = new Array("login", "signup", "webhook");

const hash_key = crypto.createHash('sha256').update('xza548sa3vcr641b5ng5nhy9mlo64r6k').digest(); // 32 bytes
const iv = Buffer.from('5ng5nhy9mlo64r6k'); // 16 bytes


var middleware = {

    checkValidationRules: function (req, res, request, rules, message, keywords) {
        const v = Validator.make(request, rules, message, keywords);
        console.log(v.fails())
        if (v.fails()) {
            console.log("request", request)
            console.log("rules", rules)
            console.log("message", message)
            console.log(v.getErrors())
            const errors = v.getErrors();
            console.log("Error2:", errors);

            var error_data = "";
            for (var key in errors) {
                error_data = errors[key][0];
                break;
            }
            response_data = {
                code: "0",
                message: error_data,
            }
            res.status(200);
            res.send(middleware.encryption(response_data));

            return false;
        } else {
            return true;
        }
    },

    extractHeaderLanguage: function (req, res, callback) {
        var headerlang = (req.headers['accept-language'] != undefined && req.headers['accept-language'] != "") ? req.headers['accept-language'] : 'en';
        console.log(headerlang)
        req.language = (headerlang == 'en') ? en : ar;

        localizify
            .add('en', en)
            .add('ar', ar)
            .setLocale(req.language);

        callback();
    },

    checkJson(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    },

    decryption(requestedData) {
        try {
            if (!requestedData) return {}
            const decipher = crypto.createDecipheriv('aes-256-cbc', hash_key, iv);
            let decrypted = decipher.update(requestedData, 'hex', 'utf-8');
            decrypted += decipher.final('utf-8');
            return (this.checkJson(decrypted)) ? JSON.parse(decrypted) : decrypted
        } catch (error) {
            console.error("decryption Error:", error)
            return error;
        }
    },

    encryption(requestedData) {
        try {
            if (!requestedData) return null;
            const data = typeof requestedData === "object" ? JSON.stringify(requestedData) : requestedData;
            const cipher = crypto.createCipheriv('aes-256-cbc', hash_key, iv)
            let encrypted = cipher.update(data, 'utf-8', 'hex')
            encrypted += cipher.final('hex')
            return encrypted
        } catch (error) {
            console.error("Encryption Error", error)
            return error;
        }
    },

    validateApiKey: function (req, res, callback) {
        const api_key = req.headers['api-key'] || '';
        if (api_key === process.env.API_KEY) {
            callback();
        } else {
            response_data = {
                code: '0',
                message: req.language.header_key_value_incorrect
            }
            res.status(401).send(middleware.encryption(response_data));
        }
    },

    validateHeaderToken: function (req, res, callback) {
        const bypass = bypassMethods.includes(req.path.split('/')[3]);
        if (bypass) {
            return callback();
        }
        let token = (req.headers['token'] != undefined && req.headers['token'] != "") ? req.headers['token'] : '';

        // token = middleware.decryption(token);

        console.log("token B: ", token)

        if (!token) {
            response_data = {
                code: '0',
                message: req.language.header_authorization_token_error
            }
            return res.status(401).send(middleware.encryption(response_data));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log("decoded: ", decoded)
            const userId = decoded.user_id;

            con.query('SELECT * FROM tbl_user WHERE id = ?', [userId], (err, results) => {
                if (err || results.length === 0) {
                    console.error("Error fetching user:", err);
                    response_data = {
                        code: '0',
                        message: req.language.header_authorization_token_error
                    };
                    return res.status(401).send(middleware.encryption(response_data));
                }

                const user = results[0];
                if (user) {
                    req.user = user;
                } else {
                    response_data = {
                        code: '0',
                        message: req.language.header_authorization_token_error
                    };
                    return res.status(401).send(middleware.encryption(response_data));
                }

                callback();
            });
            
        } catch (error) {
            response_data = {
                code: '0',
                message: req.language.header_authorization_token_error
            }
            res.status(401).send(middleware.encryption(response_data));
        }
    },
};


module.exports = middleware;