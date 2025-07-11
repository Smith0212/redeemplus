const { Pool } = require('pg');
const pool = new Pool(require("../config/database")); // Ensure your config exports a valid pg config object

module.exports = {
    //////////////////////////////////////////////////////////////////////
    //                           DB  Workers                            //
    //////////////////////////////////////////////////////////////////////

    SELECT: {
        One: async (query, no_data_err = true, { no_data_msg = 'no_data', failed_msg = 'failed_to_fetch' } = {}) => {
            try {
                const res = await pool.query(query + " LIMIT 1");
                if (res.rows.length > 0) {
                    return res.rows[0];
                } else {
                    if (no_data_err) throw new Error(no_data_msg);
                    return {};
                }
            } catch (err) {
                throw new Error(failed_msg);
            }
        },

        All: async (query, no_data_err = true, { no_data_msg = 'no_data', failed_msg = 'failed_to_fetch' } = {}) => {
            try {
                const res = await pool.query(query);
                if (res.rows.length > 0) {
                    return res.rows;
                } else {
                    if (no_data_err) throw new Error(no_data_msg);
                    return [];
                }
            } catch (err) {
                throw new Error(failed_msg);
            }
        }
    },

    UPDATE: async (query, data) => {
        try {
            const res = await pool.query(query, data);
            return res;
        } catch (err) {
            throw new Error("failed_to_update");
        }
    },

    INSERT: async (query, data) => {
        try {
            const res = await pool.query(query, data);
            // PostgreSQL does not return insertId by default, use RETURNING id in your query
            return res.rows[0]?.id || null;
        } catch (err) {
            if (err.code === '23505') { // unique_violation
                throw new Error('duplicate_entry');
            } else {
                throw new Error("failed_to_add");
            }
        }
    },

    DELETE: async (query, data) => {
        try {
            await pool.query(query, data);
        } catch (err) {
            throw new Error("failed_to_delete");
        }
    },
};
