const m = require('./language/en')
const express = require('express')
require('dotenv').config();
const app_routing = require('./modules/app_routing');
const middleware = require('./middleware/validators');
const bodyParser = require('body-parser');
const payment = require("./modules/v1/user/controllers/payment");


const app = express();

app.post('/v1/payment/webhook', bodyParser.raw({ type: 'application/json' }), payment.handleWebhook);

const cookieParser = require('cookie-parser');
app.use(cookieParser());


const cors = require('cors');


app.use(cors({
    origin: [
        'https://subscription-management-q1kn.vercel.app',
        'http://localhost:3001'
    ],
    credentials: true 
}));


// app.use(express.json());
app.use(express.text());

// extracting language from header
app.use('/', middleware.extractHeaderLanguage);
// app.use('/',middleware.validateApiKey);
app.use('/', middleware.validateHeaderToken);

app_routing.v1(app);

const port = process.env.port || 26450;
app.listen(port, () => {
    console.log("Server running on port :", port);
});

// STRIPE_WEBHOOK_SECRET=whsec_f5318a29c1701e6da01c9a508e8aeddd8dd7a27c81b26f11259540f1424119fc
