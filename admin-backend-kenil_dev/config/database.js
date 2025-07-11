const { Pool } = require('pg');

const configuration = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    // ssl: { rejectUnauthorized: false }, // Uncomment if using SSL
};

const pool = new Pool(configuration);

let isProcessDone = false;

(async () => {
    try {
        const client = await pool.connect();
        try {
            let check = await require('../utils/getCredentials')(pool);
            if (check) {
                isProcessDone = true;
                console.log('Database connected ✅');
            } else {
                console.log('Failed to get credentials');
                isProcessDone = true;
                throw new Error('Failed to get credentials');
            }
        } finally {
            client.release();
        }
    } catch (err) {
        console.log(err);
        throw err;
    }
})();

require('@kaciras/deasync').loopWhile(() => !isProcessDone);

module.exports = pool;