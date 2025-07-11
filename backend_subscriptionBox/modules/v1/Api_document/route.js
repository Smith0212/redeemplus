var express = require('express');
var path = require('path');
var globals = require('../Api_document/view/globals');
var user_model = require('../../v1/user/models/user_model');
var constant = require('../Api_document/view/constants');
//var tutor_model=require("../Tutor/model/Tutor-model");

// Language file load
/* const { t } = require('localizify'); */

//console.log(globals);
app = express();
var router = express.Router(); // get an instance of the express Router

//set the template engine ejs
app.set('view engine', 'ejs')
//routes
router.get('/api_doc', (req, res) => {

    res.render(path.join(__dirname + '/view/api_doc.ejs'), { globals: globals })
});

//routes
router.get('/v1/api_doc/code', (req, res) => {
    res.render(path.join(__dirname + '/view/reference_code.ejs'), { globals: globals })
});

//routes
router.get('/user_list', (req, res) => {
    user_model.api_user_list((error, response) => {
        if (error) {
            console.error("Database Error:", error);
            return res.status(500).send("Error fetching user list.");
        }
        res.render(path.join(__dirname, 'view', 'user_list.ejs'), { 
            data: Array.isArray(response) ? response : [],  // Ensure data is an array
            globals: globals,
            base_url: constant.base_url // Pass base_url to EJS
        });
    });
});

module.exports = router;