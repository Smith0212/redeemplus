require('dotenv').config();
require('./config/database'); // Database connection setup

const http = require('http');
const express = require('express');
let app = express();
app.disable("x-powered-by");

const https = require('https')
var path = require('path');
var fs = require('fs');
const projectRootPath = path.resolve(__dirname + '../../../../../../');

const moment = require('moment');
moment.locale('en');

// Setting up express for text parser
app.use(express.text());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

require('./utils/cron');
require('./utils/configEmailSMTP');

const AWS = require("aws-sdk");
require('aws-sdk/lib/maintenance_mode_message').suppress = true;

// Configure AWS S3
new AWS.Config({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

//////////////////////////////////////////////////////////////////////
//                          Sockets paths                           //
//////////////////////////////////////////////////////////////////////

// const SocketConnect = require('./utils/socket');

//////////////////////////////////////////////////////////////////////
//                          customer paths                          //
//////////////////////////////////////////////////////////////////////

let auth_route = require('./routes/v1/auth.route');
let dashboard_route = require('./routes/v1/dashboard.route');
let user_route = require('./routes/v1/user.route');
let restaurant_route = require('./routes/v1/restaurant.route');
let rider_route = require('./routes/v1/rider.route');
let category_route = require('./routes/v1/category.route');
let menu_route = require('./routes/v1/menu.route');
let order_route = require('./routes/v1/order.route');
let report_route = require('./routes/v1/report.route');
let service_route = require('./routes/v1/service.route');
let loyalty_route = require('./routes/v1/loyalty.route');
let setting_route = require('./routes/v1/setting.route');
let other_route = require('./routes/v1/other.route');

app.use('/api/v1/auth', auth_route);
app.use('/api/v1/dashboard', dashboard_route);
app.use('/api/v1/user', user_route);
app.use('/api/v1/restaurant', restaurant_route);
app.use('/api/v1/rider', rider_route);
app.use('/api/v1/other', other_route);
app.use('/api/v1/category', category_route);
app.use('/api/v1/menu', menu_route);
app.use('/api/v1/order', order_route);
app.use('/api/v1/report', report_route);
app.use('/api/v1/service', service_route);
app.use('/api/v1/loyalty', loyalty_route);
app.use('/api/v1/setting', setting_route);

app.use("*", (req, res) => {
    res.status(404);
    res.send('404 Not Found');
});

try {
    const port = process.env.PORT || 5552;

    let server = null;

    if (process.env.DEV_MODE === 'True') {
        server = app.listen(port);
        console.log(`😈 Cj's Admin Running ⚡ On at ${port}`);
    } else {
        server = https.createServer({
            key: fs.readFileSync(projectRootPath + "etc/letsencrypt/live/hyperlinkdevteam.link/privkey.pem"),
            cert: fs.readFileSync(projectRootPath + "etc/letsencrypt/live/hyperlinkdevteam.link/fullchain.pem"),
        }, app).listen(port, () => {
            console.log(`😈 Cj's Admin Running ⚡ On at ${port}`);
        });
    }

    server.setTimeout(50000);

    // Socket.io server
    // const socketPort = process.env.SOCKET_PORT || 5553;
    // const socketServer = http.createServer();

    // const io = require('socket.io')(socketServer, {
    //     cors: {
    //         cors: {
    //             origin: '*',
    //         }
    //     }
    // });

    // SocketConnect.restaurantSocket(io);

    // socketServer.listen(socketPort, () => {
    //     console.log(`😈 Cj's Admin Socket Running ⚡ On at ${socketPort}`);
    // });
} catch (err) {
    console.log('err :', err);
    console.log("Failed to connect");
}