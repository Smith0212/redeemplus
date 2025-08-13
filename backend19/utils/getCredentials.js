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
        // If secrets is a Result object (like from pg), use secrets.rows
        if (secrets && Array.isArray(secrets.rows)) {
            secrets = secrets.rows.reduce((obj, item) => {
            obj[item.key_name] = item.value;
            return obj;
            }, {});
        } else if (Array.isArray(secrets)) {
            // fallback for raw array
            secrets = secrets.reduce((obj, item) => {
            obj[item.key_name] = item.value;
            return obj;
            }, {});
        }

        //jwt key
        process.env['JWT_SECRET_KEY'] = secrets.JWT_SECRET_KEY;

        


        //api keys
        process.env['API_KEY'] = secrets.API_KEY;
        process.env['DB_HOST'] = secrets.DB_HOST;
        process.env['DB_USER'] = secrets.DB_USER;
        process.env['DB_PASSWORD'] = secrets.DB_PASSWORD;
        process.env['DB_DATABASE'] = secrets.DB_DATABASE;
        process.env['DB_PORT'] = secrets.DB_PORT || 5432;
        process.env['DEV_MODE'] = secrets.DEV_MODE || true; 


        //password encryption keys
        // ...

        //email smtp keys
        // ...


        return true;
    }
    catch (err) {
        console.log('Failed to get credentials - err :', err);
        return false;
    }
}
