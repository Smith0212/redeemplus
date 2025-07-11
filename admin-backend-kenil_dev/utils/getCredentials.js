const cryptoLib = require('cryptlib');
const shaKey = cryptoLib.getHashSha256(process.env.KEY, 32);

module.exports = async function (con) {
    try {
        let secrets = await new Promise((resolve, reject) => {
            con.query('SELECT * FROM tbl_credentials', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });

        secrets = secrets?.reduce((obj, item) => {
            obj[item.key_name] = cryptoLib.decrypt(item.value, shaKey, process.env.IV);
            return obj;
        }, {});

        //s3 keys
        process.env['AWS_BUCKET_NAME'] = secrets.AWS_BUCKET_NAME;
        process.env['AWS_ACCESS_KEY_ID'] = secrets.AWS_ACCESS_KEY_ID;
        process.env['AWS_SECRET_ACCESS_KEY'] = secrets.AWS_SECRET_ACCESS_KEY;
        process.env['AWS_REGION'] = secrets.AWS_REGION;

        //jwt key
        process.env['JWT_SECRET_KEY'] = secrets.JWT_SECRET_KEY;

        //password encryption keys
        process.env['PASSWORD_ENC_KEY'] = secrets.PASSWORD_ENC_KEY;
        process.env['PASSWORD_ENC_IV'] = secrets.PASSWORD_ENC_IV;

        //api keys
        process.env['API_KEY'] = secrets.API_KEY;
        process.env['RUN_LOGS'] = secrets.RUN_LOGS;

        //email smtp keys
        process.env['EMAIL_SMTP_UGANDA_USERNAME'] = secrets.EMAIL_SMTP_UGANDA_USERNAME;
        process.env['EMAIL_SMTP_UGANDA_PASSWORD'] = secrets.EMAIL_SMTP_UGANDA_PASSWORD;
        process.env['EMAIL_SMTP_KENYA_USERNAME'] = secrets.EMAIL_SMTP_KENYA_USERNAME;
        process.env['EMAIL_SMTP_KENYA_PASSWORD'] = secrets.EMAIL_SMTP_KENYA_PASSWORD;

        //sms keys
        process.env['ADVANTA_SMS_API_KEY'] = secrets.ADVANTA_SMS_API_KEY;
        process.env['ADVANTA_SMS_PARTNER_ID'] = secrets.ADVANTA_SMS_PARTNER_ID;
        process.env['ADVANTA_SMS_SENDER_ID'] = secrets.ADVANTA_SMS_SENDER_ID;

        return true;
    }
    catch (err) {
        console.log('Failed to get credentials - err :', err);
        return false;
    }
}