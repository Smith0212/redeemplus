require('dotenv').config();
let con = require('./config/database'); // Database connection setup
const express = require('express');
const cros = require('cors');


let app = express();

// Setting up express for text parser
app.use(cros());
app.use(express.text());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


let auth_route = require('./routes/v1/auth.route');


app.use('/api/v1/auth', auth_route);

try {
    const port = process.env.PORT || 3000;

    console.log("DEV_MODE:", process.env.DEV_MODE);
    if (process.env.DEV_MODE === 'true') {
        app.listen(port, () => {
            console.log("Server running on port :", port);
        });
    } else {
       // ...
    }

} catch (err) {
    console.log('err :', err);
    console.log("Failed to connect");
}