const httpStatus = require('http-status-codes')
const database = require('../config/database');
responseCode = require('./response_code');
const nodemailer = require('nodemailer');
const middleware = require('../middleware/validators');


class Utility {
    generateToken() {
        // generate referral code of 40 alphanumeric characters
        let referralCode = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        for (let i = 0; i < 40; i++) {
            referralCode += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return referralCode;
    }

    generateOTP() {
        // generate otp of 4 digit 
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    generateSocialId() {
        // generate social id of 6 alphanumeric characters
        return Math.random().toString(36).substring(2, 12).toUpperCase();
    }

    response(res, message, status_code = httpStatus.OK) {
        const encryptedMessage = middleware.encryption(message);
        return res.status(status_code).json(encryptedMessage);
        // return res.status(status_code).json(message);
    }

    validateEmail(email) {
        // validate email
        const re = /\S+@\S+\.\S+/;
        return re.test(email);
    }

    sendMail = async (subject, to_email, message) => {
        try {
            const transporter = nodemailer.createTransport({
                host: "smtp.gmail.com", 
                port: 465, 
                secure: true,
                auth: {
                    user: process.env.mailer_email,
                    pass: process.env.mailer_password
                }
            });

            const mailOptions = {
                from: "example@gmail.com",
                to: to_email,
                subject: subject,
                html: message
            };

            const info = await transporter.sendMail(mailOptions);
            return info;
        } catch (error) {
            throw error;
        }
    };


    getUserDetail(user_id, callback) {
        const selectQuery = 'SELECT * FROM tbl_user WHERE id = ?';
        database.query(selectQuery, [user_id.id], (err, results) => {

            if (err) {
                callback(err, null);
            }

            if (results.length > 0) {
                console.log("Results1:", results);
                callback(null, results[0]);
            } else {
                callback(new Error('User not found'), null);
            }
        });
    }

    updateUserInfo(user_id, data, callback) {
        console.log("User ID:", user_id);
        if (!user_id || Object.keys(data).length === 0) {
            return callback(new Error("Invalid user ID or no data provided"), null);
        }
        console.log("Data:", data);
        const updateQuery = 'UPDATE tbl_user SET ? WHERE id = ?';
        database.query(updateQuery, [data, user_id.id], (err, results) => {
            if (err) {
                console.log("SQL Error1:", err);
                return callback(err, null);
            }
            console.log("SQL Results1:", results);
            if (results.affectedRows === 0) {
                return callback(new Error("User not found or no changes made"), null);
            }

            this.getUserDetail(user_id, (err, userDetails) => {
                if (err) {
                    console.log("SQL Error2:", err);
                    return callback(err, null);
                }
                console.log("SQL Results2:", userDetails);
                callback(null, userDetails);
            });
        });
    }

    updateDeviceInfo(user_id, data, callback) {
        const updateQuery = 'UPDATE tbl_device_info SET ? WHERE user_id = ?;';

        database.query(updateQuery, [data, user_id], (err, results) => {
            console.log("SQL Error:", err);
            console.log("SQL Results:", results);

            if (err) {
                return callback(err, null);
            }

            if (results.affectedRows === 0) {
                return callback(null, { message: "No rows updated. Check if user_id exists." });
            }

            return callback(null, results);
        });
    }


    /**
     * The function `getServiceProvidersListing` retrieves a list of service providers based on specified filters and returns the results through a callback function.
     * @param req - `req` is the request object containing information such as user details, language and other necessary data for processing the request.
     */
    getServiceProvidersListing(req, filters, callback) {
        let { latitude, longitude, distance = 1000, categories, sort_by, page, limit, is_featured = false, is_trending = false, is_nearby = false } = filters;

        page = page || 1;
        limit = limit || 5;
        const offset = (page - 1) * limit;
        let queryParams = [latitude, longitude, latitude, req.user.id]; // User ID for favorites

        let query = `
            SELECT sp.id, sp.name, sp.banner_url, sp.logo_url, sp.avg_rating, sp.address, sp.is_featured,
            c.name AS category_name,
            ROUND(6371 * ACOS(
                COS(RADIANS(?))
                * COS(RADIANS(sp.latitude))
                * COS(RADIANS(sp.longitude) - RADIANS(?))
                + SIN(RADIANS(?))
                * SIN(RADIANS(sp.latitude))), 1) AS distance_km,
            CASE WHEN f.id IS NULL THEN 0 ELSE 1 END AS favorite_status
            FROM tbl_service_providers sp
            LEFT JOIN tbl_categories c ON c.id = sp.category_id
            LEFT JOIN tbl_favorites f ON f.service_provider_id = sp.id
                AND f.user_id = ? AND f.is_voucher = 0
            WHERE sp.is_active = 1 AND sp.is_deleted = 0
        `;

        // Apply filters
        if (is_featured) {
            query += " AND sp.is_featured = 1";
        }


        // Category filter
        if (categories && categories.length > 0) {
            const categoryPlaceholders = categories.map(() => '?').join(',');
            query += ` AND c.name IN (${categoryPlaceholders}) `;
            queryParams.push(...categories);
        }


        if (is_trending) {
            query += " ORDER BY sp.avg_rating DESC, sp.rating_count DESC";
        }
        if (is_nearby) {
            query += " HAVING distance_km < ?";
            queryParams.push(distance);
        }

        // Sorting conditions
        if (sort_by === 'top_rated' && !is_trending) {
            query += ` ORDER BY sp.avg_rating DESC, sp.rating_count DESC `;
        } else if (sort_by === 'distance' && is_trending) {
            query += ` ORDER BY distance_km ASC `;
        } else if (sort_by === 'featured' && !is_nearby && !is_trending) {
            query += ` AND sp.is_featured = 1 ORDER BY sp.id DESC `;
        } else if (sort_by === 'nearby') {
            query += ` ORDER BY distance_km ASC `;
        }

        // Pagination
        query += ` LIMIT ? OFFSET ? `;
        queryParams.push(limit, offset);

        console.log("Query:", query);
        console.log("Query Params:", queryParams);

        database.query(query, queryParams, (error, results) => {
            if (error) {
                return callback({
                    code: req.language.OPERATION_FAILED,
                    message: req.language.unsuccess,
                    data: error.sqlMessage,
                });
            }
            callback(null, {
                code: req.language.SUCCESS,
                message: req.language.success,
                data: results,
            });
        });
    }




    // single function for all service providers listing
    getServiceProvidersByType(req, res) {
        const filters = {
            latitude: req.query.latitude || req.user.latitude || 0,
            longitude: req.query.longitude || req.user.longitude || 0,
            categories: Array.isArray(req.body.categories) ? req.body.categories : [],
            distance: req.body.distance || 1000,
            sort_by: req.body.sort_by || null,
            page: req.query.page || 1,
            limit: req.query.limit || 5,
            user_id: req.user ? req.user.id : 1,
            is_featured: req.body.is_featured || false,
            is_trending: req.body.is_trending || false,
            is_nearby: req.body.is_nearby || false
        };

        this.getServiceProvidersListing(req, filters, (error, result) => {
            if (error) {
                console.log("Error11:", error);
                return res.status(500).json({
                    code: responseCode.OPERATION_FAILED,
                    message: req.language.unsuccess,
                    data: error.sqlMessage,
                });
            }
            return res.status(200).json(result);
        });
    };

}

module.exports = new Utility();