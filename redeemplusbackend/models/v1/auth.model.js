const { sendResponse, sendOTP } = require('../../middleware');
const moment = require('moment');
const bcrypt = require('bcrypt');
const cryptoLib = require('cryptlib');
const jwt = require('jsonwebtoken');
const pool = require('../../config/database');
// const { sendUgandaMail, sendIndiaMail, sendKenyaMail } = require('../../utils/configEmailSMTP');

const responseCode = require('../../config/responseCode');


let auth_model = {

    async signup(req, res) {
        try {
            const {
                username,
                email,
                password,
                social_id,
                country_code_id, 
                phone,
                account_type,
                signup_type = 's', // s - simple, g - google, f - facebook, a - apple
                profile_image = null,
                business_subcategory_id = null,
                business_address = null,
                street = null,
                postal_code = null,
                zone = null,
                latitude = null,
                longitude = null,
                device_type = 'A',
                device_name = 'unknown',
                os_version = 'unknown',
                app_version = '1.0',
                device_token = 'unknown',
                timezone = 'UTC'
            } = req.body;

            if (!['s', 'g', 'f', 'a'].includes(signup_type)) {
                return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: 'invalid_signup_type' }, {});
            }

            if (!username) {
                return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: 'missing_username' }, {});
            }

            if (!email || (signup_type === 's' && !password)) {
                return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: 'missing_email_or_password' }, {});
            }

            if (!country_code_id) {
                return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: 'missing_country_code_id' }, {});
            }

            // Validate country_code_id
            const countryQuery = `
            SELECT country_code 
            FROM tbl_country_codes 
            WHERE id = $1 AND is_active = TRUE AND is_deleted = FALSE
        `;
            const { rows: countryRows } = await pool.query(countryQuery, [country_code_id]);
            if (countryRows.length === 0) {
                return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: 'invalid_country_code_id' }, {});
            }
            const resolvedCountryCode = countryRows[0].country_code;

            // Check for existing user by username OR email
            const checkUserQuery = `
            SELECT id, username, email, is_verified, signup_type 
            FROM tbl_users 
            WHERE (username = $1 OR email = $2) AND is_active = TRUE AND is_deleted = FALSE
        `;
            const { rows } = await pool.query(checkUserQuery, [username, email]);
            const existingUser = rows[0];

            if (existingUser) {
                const { signup_type: existingType, is_verified } = existingUser;

                if (existingUser.username === username || existingUser.email === email) {
                    if (existingType === 's' && !is_verified) {
                        const otpData = await sendOTP(email);
                        return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: 'not_verified_otp_sent' }, otpData);
                    }
                    return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, {
                        keyword: existingUser.email === email ? 'email_already_exists' : 'username_already_exists'
                    }, {});
                }
            }

            // For social signup
            if (signup_type !== 's') {
                if (!social_id) {
                    return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: 'missing_social_id' }, {});
                }

                const checkSocialQuery = `
                SELECT id FROM tbl_users 
                WHERE social_id = $1 AND signup_type = $2 AND is_active = TRUE AND is_deleted = FALSE;
            `;
                const { rows: socialRows } = await pool.query(checkSocialQuery, [social_id, signup_type]);
                if (socialRows.length > 0) {
                    return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: 'social_id_already_exists' }, {});
                }
            }

            // Hash password and generate OTP for simple signup
            const hashedPassword = signup_type === 's' ? await bcrypt.hash(password, 10) : null;

            const insertUserQuery = `
            INSERT INTO tbl_users 
            (username, email, password, country_code_id, phone, account_type, signup_type, social_id, profile_image, 
             is_verified, step, business_subcategory_id, business_address, street, postal_code, zone)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id
        `;
            const { rows: insertRows } = await pool.query(insertUserQuery, [
                username,
                signup_type === 's' ? email : null,
                hashedPassword,
                country_code_id,
                phone,
                account_type,
                signup_type,
                signup_type === 's' ? null : social_id,
                profile_image,
                signup_type !== 's', // is_verified
                signup_type === 's' ? 1 : 2, // step
                business_subcategory_id,
                business_address,
                street,
                postal_code,
                zone
            ]);

            const newUserId = insertRows[0].id;

            const user_token = jwt.sign({ user_id: newUserId }, process.env.JWT_SECRET_KEY, { expiresIn: '7d' });

            // Insert device info
            const insertDeviceQuery = `
            INSERT INTO tbl_device_info 
            (user_id, device_type, device_name, os_version, app_version, user_token, device_token, timezone)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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

            // Insert into tbl_delivery_addresses using resolved country_code
            const insertAddressQuery = `
            INSERT INTO tbl_delivery_addresses
            (user_id, address, street, postal_code, zone, latitude, longitude, country_code, phone_number, is_default)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
        `;
            await pool.query(insertAddressQuery, [
                newUserId,
                business_address,
                street,
                postal_code,
                zone,
                latitude,
                longitude,
                resolvedCountryCode,
                phone
            ]);

            const otpData = signup_type === 's' ? await sendOTP(email) : null;

            return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: 'success' }, {
                user_id: newUserId,
                user_token,
                ...(signup_type === 's' ? otpData : {})
            });

        } catch (err) {
            console.error('Signup Error:', err);
            return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: 'unsuccess' }, err.message);
        }
    },


    async verifyOtp(req, res) {
        try {
            const { otp } = req.body;
            const user = req.user;

            if (!otp) {
                return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: 'missing_parameters' }, {});
            }

            // Check OTP in tbl_otp
            const otpQuery = `
                SELECT * FROM tbl_otp 
                WHERE user_id = $1 AND otp = $2 AND expires_at > NOW()
                ORDER BY created_at DESC LIMIT 1
            `;
            const otpResult = await pool.query(otpQuery, [user.id, otp]);
            if (otpResult.rows.length === 0) {
                return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: 'invalid_otp' }, {});
            }

            // Mark user as verified and step = 2
            let updateUserQuery;
            if (user.step == 1) {
                updateUserQuery = `
                UPDATE tbl_users SET is_verified = TRUE, step = 2 WHERE id = $1 RETURNING is_verified, step
            `;
            } else {
                updateUserQuery = `
                UPDATE tbl_users SET is_verified = TRUE WHERE id = $1 RETURNING is_verified
            `;
            }

            const updateResult = await pool.query(updateUserQuery, [user.id]);

            // Optionally, delete or expire the OTP
            // await pool.query(`DELETE FROM tbl_otp WHERE id = $1`, [otpResult.rows[0].id]);

            return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: 'otp_verified' }, updateResult.rows[0]);
        } catch (err) {
            console.error('OTP Verification Error:', err);
            return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: 'unsuccess' }, err.message);
        }
    },

    async editProfile(req, res) {
        try {
            const user_id = req.user.id
            if (!user_id) {
                return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: 'missing_user_id' }, {});
            }

            const {
                username,
                email,
                country_code_id,
                phone,
                profile_image,
                business_subcategory_id,
                dob,
                instagram_url,
                tiktok_url,
                whatsapp_url,
                business_address,
                street,
                postal_code,
                zone,
                map_url,
                latitude,
                longitude,
            } = req.body;

            // Check if user exists
            const userCheckQuery = `
            SELECT id FROM tbl_users 
            WHERE id = $1 AND is_active = TRUE AND is_deleted = FALSE;
        `;
            const userResult = await pool.query(userCheckQuery, [user_id]);
            if (userResult.rows.length === 0) {
                return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: 'user_not_found' }, {});
            }

            // If email is being updated, check for uniqueness
            if (email) {
                const emailCheckQuery = `
                SELECT id FROM tbl_users 
                WHERE email = $1 AND id != $2 AND is_active = TRUE AND is_deleted = FALSE;
            `;
                const emailResult = await pool.query(emailCheckQuery, [email, user_id]);
                if (emailResult.rows.length > 0) {
                    return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: 'email_already_exists' }, {});
                }
            }

            // If username is being updated, check for uniqueness
            if (username) {
                const usernameCheckQuery = `
                SELECT id FROM tbl_users 
                WHERE username = $1 AND id != $2 AND is_active = TRUE AND is_deleted = FALSE;
            `;
                const usernameResult = await pool.query(usernameCheckQuery, [username, user_id]);
                if (usernameResult.rows.length > 0) {
                    return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: 'username_already_exists' }, {});
                }
            }

            // Build update query dynamically
            let fields = [];
            let values = [];
            let idx = 1;

            if (username !== undefined) {
                fields.push(`username = $${idx++}`);
                values.push(username);
            }
            if (email !== undefined) {
                fields.push(`email = $${idx++}`);
                values.push(email);
            }
            if (country_code_id !== undefined) {
                fields.push(`country_code_id = $${idx++}`);
                values.push(country_code_id);
            }
            if (phone !== undefined) {
                fields.push(`phone = $${idx++}`);
                values.push(phone);
            }
            if (profile_image !== undefined) {
                fields.push(`profile_image = $${idx++}`);
                values.push(profile_image);
            }
            if (business_subcategory_id !== undefined) {
                fields.push(`business_subcategory_id = $${idx++}`);
                values.push(business_subcategory_id);
            }
            if (dob !== undefined) {
                fields.push(`dob = $${idx++}`);
                values.push(dob);
            }
            if (instagram_url !== undefined) {
                fields.push(`instagram_url = $${idx++}`);
                values.push(instagram_url);
            }
            if (tiktok_url !== undefined) {
                fields.push(`tiktok_url = $${idx++}`);
                values.push(tiktok_url);
            }
            if (whatsapp_url !== undefined) {
                fields.push(`whatsapp_url = $${idx++}`);
                values.push(whatsapp_url);
            }
            if (business_address !== undefined) {
                fields.push(`business_address = $${idx++}`);
                values.push(business_address);
            }
            if (street !== undefined) {
                fields.push(`street = $${idx++}`);
                values.push(street);
            }
            if (postal_code !== undefined) {
                fields.push(`postal_code = $${idx++}`);
                values.push(postal_code);
            }
            if (zone !== undefined) {
                fields.push(`zone = $${idx++}`);
                values.push(zone);
            }
            if (map_url !== undefined) {
                fields.push(`map_url = $${idx++}`);
                values.push(map_url);
            }
            if (latitude !== undefined) {
                fields.push(`latitude = $${idx++}`);
                values.push(latitude);
            }
            if (longitude !== undefined) {
                fields.push(`longitude = $${idx++}`);
                values.push(longitude);
            }

            if (fields.length === 0) {
                return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: 'no_fields_to_update' }, {});
            }

            values.push(user_id);

            const updateQuery = `
            UPDATE tbl_users SET ${fields.join(', ')}
            WHERE id = $${idx}
            RETURNING id, username, email, country_code_id, phone, profile_image, 
                      business_subcategory_id, dob, instagram_url, tiktok_url, 
                      whatsapp_url, business_address, street, postal_code, zone,
                      map_url, latitude, longitude
        `;
            const updateResult = await pool.query(updateQuery, values);

            return sendResponse(
                req,
                res,
                200,
                responseCode.SUCCESS,
                { keyword: 'profile_updated' },
                updateResult.rows[0]
            );
        } catch (err) {
            console.error('Edit Profile Error:', err);
            return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: 'unsuccess' }, err.message);
        }
    },

    async login(req, res) {
        try {
            const {
                username,
                password,
                login_type = 's', // 's' for simple, 'g' for Google, 'f' for Facebook, 'a' for Apple
                social_id,
                device_type = 'A',
                device_name = 'unknown',
                os_version = 'unknown',
                app_version = '1.0',
                device_token = 'unknown',
                ip = '192.168.25.3',
                timezone = 'UTC'
            } = req.body;

            if (!username || !login_type) {
                return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: 'missing_parameters' }, {});
            }

            let userQuery, params;
            if (login_type === 's') {
                userQuery = `
                    SELECT id as user_id, email, password, is_verified, step, is_active, signup_type 
                    FROM tbl_users 
                    WHERE username = $1 AND is_active = TRUE AND is_deleted = FALSE
                `;
                params = [username];
            } else {
                userQuery = `
                    SELECT id as user_id, email, password, is_verified, step, is_active, signup_type 
                    FROM tbl_users 
                    WHERE username = $1 AND social_id = $2 AND signup_type = $3 AND is_active = TRUE AND is_deleted = FALSE
                `;
                params = [username, social_id, login_type];
            }

            const userResult = await pool.query(userQuery, params);

            if (userResult.rows.length === 0) {
                return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: 'login_invalid_credential' }, {});
            }

            const user = userResult.rows[0];

            // Check if user is already logged in on this device
            const checkDeviceQuery = `
                SELECT user_id FROM tbl_device_info
                WHERE user_id = $1 AND device_token IS NOT NULL AND user_token IS NOT NULL
            `;
            const deviceResult = await pool.query(checkDeviceQuery, [user.id]);
            // console.log("Device Result:", deviceResult.rows[0]);
            if (deviceResult.rows.length > 0) {
                return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: 'already_logged_in_on_device' }, {});
            }

            if (login_type === 's') {

                const validPassword = await bcrypt.compare(password, user.password);
                if (!validPassword) {
                    return sendResponse(req, res, 200, responseCode.OPERATION_FAILED, { keyword: 'login_invalid_credential' }, {});
                }
            }

            if (!user.is_verified) {

                const otpData = await sendOTP(user.email)
                console.log("OTP Data:", otpData);

                return sendResponse(req, res, 200, responseCode.OTP_NOT_VERYFIED, { keyword: 'not_verified_otp_sent' }, user);
            }

            if (!user.is_active) {
                return sendResponse(req, res, 200, responseCode.INACTIVE_ACCOUNT, { keyword: 'account_is_deactivated' }, user);
            }
            console.log("User Step:", user.step);
            if (user.step < 3) {
                return sendResponse(req, res, 200, responseCode.CODE_NULL, { keyword: 'choose_membership_plan' }, user);
            }

            // Generate token
            const user_token = jwt.sign({ user_id: user.user_id }, process.env.JWT_SECRET_KEY, { expiresIn: '7d' });
            // Update device info only, do not insert
            const updateDeviceQuery = `
                UPDATE tbl_device_info SET
                    device_type = $1,
                    device_name = $2,
                    os_version = $3,
                    app_version = $4,
                    user_token = $5,
                    timezone = $6,
                    device_token = $7,
                    ip = $8
                WHERE user_id = $9
            `;
            await pool.query(updateDeviceQuery, [
                device_type,
                device_name,
                os_version,
                app_version,
                user_token,
                timezone,
                device_token,
                ip,
                user.user_id
            ]);

            return sendResponse(
                req,
                res,
                200,
                responseCode.SUCCESS,
                { keyword: 'success' },
                { ...user, user_token }
            );
        } catch (err) {
            console.error('Login Error:', err);
            return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: 'unsuccess' }, err.message);
        }
    },

    async resendOtp(req, res) {
        try {
            const user = req.user;
            const email = user.email;

            const otpData = await sendOTP(email);

            return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: 'otp_resent' }, { otp: otpData.otp });
        } catch (err) {
            console.error('Resend OTP Error:', err);
            return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: 'unsuccess' }, err.message);
        }
    },

    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            if (!email) {
                return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: 'missing_email' }, {});
            }

            const otpData = await sendOTP(email, 'forgot');
            console.log("User1428752:", otpData);

            // generate token for verification
            const user_token = jwt.sign({ user_id: otpData.user_id }, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });

            const updateDeviceTokenQuery = `
                UPDATE tbl_device_info
                SET user_token = $1
                WHERE user_id = (
                    SELECT id FROM tbl_users WHERE email = $2 AND is_active = TRUE AND is_deleted = FALSE
                )
            `;
            await pool.query(updateDeviceTokenQuery, [user_token, email]);

            return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: 'forgot_password_otp_sent' }, { otp: otpData.otp, user_token });
        } catch (err) {
            console.error('Forgot Password Error:', err);
            return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: 'unsuccess' }, err.message);
        }
    },

    async resetPassword(req, res) {
        try {
            const { email, new_password } = req.body;
            if (!email || !new_password) {
                return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: 'missing_parameters' }, {});
            }

            // Check user exists
            const userQuery = `
                SELECT id FROM tbl_users 
                WHERE email = $1 AND is_active = TRUE AND is_deleted = FALSE
            `;
            const userResult = await pool.query(userQuery, [email]);
            if (userResult.rows.length === 0) {
                return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: 'user_not_found' }, {});
            }
            const user = userResult.rows[0];

            // Hash new password
            const hashedPassword = await bcrypt.hash(new_password, 10);

            // Update password and clear OTP
            const updateQuery = `
                UPDATE tbl_users SET password = $1, otp = NULL WHERE id = $2 RETURNING id
            `;
            const updateResult = await pool.query(updateQuery, [hashedPassword, user.id]);

            return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: 'password_reset_success' }, { user_id: updateResult.rows[0].id });
        } catch (err) {
            console.error('Reset Password Error:', err);
            return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: 'unsuccess' }, err.message);
        }
    },

    async logout(req, res) {
        try {
            const user_id = req.user.id;
            if (!user_id) {
                return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: 'missing_user_id' }, {});
            }

            // Check if already logged out
            const checkDeviceQuery = `
                SELECT device_token, user_token FROM tbl_device_info
                WHERE user_id = $1
            `;
            const checkResult = await pool.query(checkDeviceQuery, [user_id]);

            const { device_token, user_token } = checkResult.rows[0];
            if (!device_token && !user_token) {
                return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: 'already_logged_out' }, { user_id });
            }

            const updateDeviceQuery = `
                UPDATE tbl_device_info
                SET device_token = NULL, user_token = NULL
                WHERE user_id = $1 RETURNING user_id
            `;
            const result = await pool.query(updateDeviceQuery, [user_id]);

            return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: 'logout_success' }, result.rows[0]);
        } catch (err) {
            console.error('Logout Error:', err);
            return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: 'unsuccess' }, err.message);
        }
    },

};

module.exports = auth_model;
