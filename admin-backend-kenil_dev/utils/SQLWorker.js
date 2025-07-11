const con = require("../config/database");
module.exports = {
    //////////////////////////////////////////////////////////////////////
    //                           DB  Workers                            //
    //////////////////////////////////////////////////////////////////////

    SELECT: {
        One: (query, no_data_err = true, { no_data_msg = 'no_data', failed_msg = 'failed_to_fetch' } = {}) => {
            return new Promise((resolve, reject) => {
                con.query(query + " LIMIT 1", (err, result) => {
                    if (!err) {
                        if (result.length > 0) {
                            resolve(result[0]);
                        } else {
                            if (no_data_err) {
                                reject(new Error(no_data_msg));
                            } else {
                                resolve({});
                            }
                        }
                    } else {
                        reject(new Error(failed_msg));
                    }
                });
            });
        },

        All: (query, no_data_err = true, { no_data_msg = 'no_data', failed_msg = 'failed_to_fetch' } = {}) => {
            return new Promise((resolve, reject) => {
                con.query(query, (err, result) => {
                    if (!err) {
                        if (result.length > 0) {
                            resolve(result);
                        } else {
                            if (no_data_err) {
                                reject(new Error(no_data_msg));
                            } else {
                                resolve([]);
                            }
                        }
                    } else {
                        reject(new Error(failed_msg));
                    }
                });
            });
        }
    },

    UPDATE: (query, data) => {
        return new Promise((resolve, reject) => {
            con.query(query, data, (err, result) => {
                if (!err) {
                    resolve(result);
                } else {
                    reject(new Error("failed_to_update"));
                }
            })
        });
    },

    INSERT: (query, data) => {
        return new Promise((resolve, reject) => {
            con.query(query, data, (err, result) => {
                if (!err) {
                    resolve(result.insertId);
                } else {
                    if (err.code === 'ER_DUP_ENTRY') {
                        reject(new Error('duplicate_entry'));
                    } else {
                        reject(new Error("failed_to_add"));
                    }
                }
            })
        });
    },

    DELETE: (query, data) => {
        return new Promise((resolve, reject) => {
            con.query(query, data, (err, result) => {
                if (!err) {
                    resolve();
                } else {
                    reject(new Error("failed_to_delete"));
                }
            });
        });
    },
};