const mysql = require("mysql2");

const db = mysql.createPool({
  host: process.env.host,
  user: process.env.user,
  password: process.env.password,
  database: process.env.database,
  port: process.env.port,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}, console.log("Database connected"));

module.exports = db;