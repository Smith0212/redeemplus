// var encryptLib = require("cryptlib");  
var baseurl = "baseurl/";

var constant = {
    app_name: "deals on demand",

    // encryptionKey: encryptLib.getHashSha256("xza548sa3vcr641b5ng5nhy9mlo64r6k", 32),
    // encryptionIV: "5ng5nhy9mlo64r6k",
    // byPassApi: ['forgot Password', 'resendOTP', 'login', 'check_unique', 'signup', 'verify0TP', 'setPassword'],

    profile_image: baseurl + "profile_image/",
    product_image: baseurl + "product_image/",
    main_image: baseurl + "main_image/",
    image: baseurl + "image/",
    goalImage: baseurl + "goalImage/",
    mealImage: baseurl + "mealImage/",
    category: baseurl + "category_image/",
    service_provider_image: baseurl + "service_provider_image/",
};

module.exports = constant;