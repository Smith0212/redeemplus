const nodemailer = require('nodemailer');

// Create a transporter object for Uganda using the default SMTP transport
let ugandaTransporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_SMTP_UGANDA_USERNAME, // Uganda Office 365 email address
        pass: process.env.EMAIL_SMTP_UGANDA_PASSWORD // Uganda Office 365 email password
    },
    pool: true,
    maxConnections: 3,
    rateDelta: 1000,
    rateLimit: 5
});

let indiaTransporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_SMTP_INDIA_USERNAME, // India Office 365 email address
        pass: process.env.EMAIL_SMTP_INDIA_PASSWORD // India Office 365 email password
    },
    pool: true,
    maxConnections: 3,
    rateDelta: 1000,
    rateLimit: 5
});

// Create a transporter object for Kenya using the default SMTP transport
let kenyaTransporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_SMTP_KENYA_USERNAME, // Kenya Office 365 email address
        pass: process.env.EMAIL_SMTP_KENYA_PASSWORD // Kenya Office 365 email password
    },
    pool: true,
    maxConnections: 3,
    rateDelta: 1000,
    rateLimit: 5
});

// Function to send email using Uganda transporter
function sendUgandaMail(mailOptions) {
    return new Promise((resolve, reject) => {
        ugandaTransporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                reject({
                    error: error?.message,
                    status: false
                });
            } else {
                resolve({
                    status: true,
                    info: info
                });
            }
        });
    });
}

// Function to send email using Kenya transporter
function sendKenyaMail(mailOptions) {
    return new Promise((resolve, reject) => {
        kenyaTransporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                reject({
                    error: error.message,
                    status: false
                });
            } else {
                resolve({
                    status: true,
                    info: info
                });
            }
        });
    });
}

// Function to send email using India transporter
function sendIndiaMail(mailOptions) {
    return new Promise((resolve, reject) => {
        indiaTransporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                reject({
                    error: error?.message,
                    status: false
                });
            } else {
                resolve({
                    status: true,
                    info: info
                });
            }
        });
    });
}

module.exports = {
    sendUgandaMail,
    sendKenyaMail,
    sendIndiaMail
};