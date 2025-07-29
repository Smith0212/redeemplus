const { Pool } = require('pg');

const configuration = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT || 5432, // Default PostgreSQL port
    ssl: process.env.DB_SSL === 'true', // Optional, depending on your setup
};

const pool = new Pool(configuration);

let isProcessDone = false;

(async () => {
    try {
        const client = await pool.connect();

        try {
            const check = await require('../utils/getCredentials')(pool);
            console.log('Credentials fetched:', check);
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
        console.error('Connection error:', err);
        throw err;
    }
})();
require('deasync').loopWhile(() => !isProcessDone);

module.exports = pool;

























// const { Pool } = require('pg');

// const configuration = {
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_DATABASE,
//     port: process.env.DB_PORT || 5432,
//     ssl: process.env.DB_SSL === 'true',
//     // Add these for better connection handling
//     max: 20, // Maximum number of clients in the pool
//     idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
//     connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
// };

// console.log('Database configuration:', {
//     host: configuration.host,
//     user: configuration.user,
//     database: configuration.database,
//     port: configuration.port,
//     ssl: configuration.ssl
// });

// const pool = new Pool(configuration);

// // Handle pool errors
// pool.on('error', (err) => {
//     console.error('Unexpected error on idle client', err);
//     process.exit(-1);
// });

// let isProcessDone = false;

// (async () => {
//     try {
//         console.log('Attempting to connect to database...');
//         const client = await pool.connect();

//         try {
//             console.log('Database connection established, fetching credentials...');
//             const check = await require('../utils/getCredentials')(pool);
//             console.log('Credentials fetched successfully:', check);
//             if (check) {
//                 isProcessDone = true;
//                 console.log('Database connected ✅');
//             } else {
//                 console.error('Failed to get credentials');
//                 isProcessDone = true;
//                 throw new Error('Failed to get credentials');
//             }
//         } finally {
//             client.release();
//         }
//     } catch (err) {
//         console.error('Connection error:', err);
//         isProcessDone = true;
//         throw err;
//     }
// })();

// require('deasync').loopWhile(() => !isProcessDone);

// module.exports = pool;
