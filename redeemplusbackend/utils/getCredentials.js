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

























// const cryptoLib = require('cryptlib');
// const shaKey = cryptoLib.getHashSha256(process.env.KEY, 32);

// module.exports = async function (con) {
//     try {
//         console.log('Fetching credentials from database...');
        
//         // Use the Promise-based approach instead of callback
//         const result = await con.query('SELECT * FROM tbl_credentials');
        
//         console.log('Raw credentials result:', result);
        
//         // Handle the result properly
//         let secrets = {};
//         if (result && result.rows && Array.isArray(result.rows)) {
//             secrets = result.rows.reduce((obj, item) => {
//                 obj[item.key_name] = item.value;
//                 return obj;
//             }, {});
//         } else {
//             console.error('Unexpected result format:', result);
//             return false;
//         }
        
//         console.log('Processed secrets:', secrets);

//         // Set environment variables
//         if (secrets.JWT_SECRET_KEY) {
//             process.env['JWT_SECRET_KEY'] = secrets.JWT_SECRET_KEY;
//         }
//         if (secrets.API_KEY) {
//             process.env['API_KEY'] = secrets.API_KEY;
//         }
//         if (secrets.DB_HOST) {
//             process.env['DB_HOST'] = secrets.DB_HOST;
//         }
//         if (secrets.DB_USER) {
//             process.env['DB_USER'] = secrets.DB_USER;
//         }
//         if (secrets.DB_PASSWORD) {
//             process.env['DB_PASSWORD'] = secrets.DB_PASSWORD;
//         }
//         if (secrets.DB_DATABASE) {
//             process.env['DB_DATABASE'] = secrets.DB_DATABASE;
//         }
//         if (secrets.DB_PORT) {
//             process.env['DB_PORT'] = secrets.DB_PORT;
//         }
//         if (secrets.DEV_MODE) {
//             process.env['DEV_MODE'] = secrets.DEV_MODE;
//         }

//         console.log('Environment variables set successfully');
//         return true;
//     }
//     catch (err) {
//         console.error('Failed to get credentials - err:', err);
//         return false;
//     }
// }
