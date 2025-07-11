const user_model = require("../models/user_model");
const importRules = require("../../../../utilities/rules");
const middleware = require("../../../../middleware/validators");

class user {

  signup(req, res) {
    console.log("body: ", req.body)

    const userData = middleware.decryption(req.body);
    req.body = userData; 
    console.log("userData", userData)

    var rules = importRules.signup;
    var message = {
      required: req.language.required,
    };
    var keywords = {
      password: req.language.password,
      phone: req.language.phone,
      email: req.language.email
    };

    if (middleware.checkValidationRules(req, res, userData, rules, message, keywords)) {
      user_model.signup(req, res);
    }
  }

  verifyOTP(req, res) {
    const user_otp_info = middleware.decryption(req.body);
    req.body = user_otp_info;
    console.log("user_otp_info", user_otp_info);

    const rules = importRules.verifyOtp;
    const message = {
      required: req.language.required,
    };
    const keywords = {
      'otp': req.language.otp,
    };

    if (middleware.checkValidationRules(req, res, user_otp_info, rules, message, keywords)) {
      user_model.verifyOTP(req, res);
    }
  }

  login(req, res) {
    const userData = middleware.decryption(req.body);
    req.body = userData;
    console.log("body", req.body)

    var rules = importRules.login_simple;
    var message = {
      required: req.language.required,
    };
    const keywords = {
      'email_phone': req.language.email_phone,
      'password': req.language.password,
    };

    if (middleware.checkValidationRules(req, res, userData, rules, message, keywords)) {
      user_model.login(req, res);
    }
  }

  viewProfile(req, res) {
    user_model.viewProfile(req, res)
  }

  editProfile(req, res) {
    const userData = middleware.decryption(req.body)
    req.body = userData
    console.log("userData", userData)

    var rules = importRules.editProfile
    var message = {
      required: req.language.required,
    }
    var keywords = {
      name: req.language.name,
      phone: req.language.phone,
      countryCode: req.language.countryCode,
    }

    if (middleware.checkValidationRules(req, res, userData, rules, message, keywords)) {
      user_model.editProfile(req, res)
    }
  }

  logout(req, res) {
    user_model.logout(req, res)
  }

  getCategories(req, res) {
    user_model.getCategories(req, res);
  }

  getAllSubBoxes(req, res) {
    const filters = middleware.decryption(req.body);
    req.body = filters;
    console.log("body", req.body)

    user_model.getAllSubBoxes(req, res);
  }

  getPlansByBoxId(req, res) {
    user_model.getPlansByBoxId(req, res)
  }

  getSubscriptionBoxById(req, res) {
    user_model.getSubscriptionBoxById(req, res)
  }

  subscribeToBox(req, res) {
    const subscriptionData = middleware.decryption(req.body)
    req.body = subscriptionData

    const rules = importRules.subscribeToBox
    const message = {
      required: req.language.required,
    }
    const keywords = {
      plan_id: req.language.plan_id,
      payment_method: req.language.payment_method,
    }

    if (middleware.checkValidationRules(req, res, subscriptionData, rules, message, keywords)) {
      user_model.subscribeToBox(req, res)
    }
  }

  getUserSubscriptions(req, res) {
    user_model.getUserSubscriptions(req, res)
  }

  getUserOrders(req, res) {
    user_model.getUserOrders(req, res)
  }

  getOrderDetails(req, res) {
    user_model.getOrderDetails(req, res)
  }

  cancelSubscription(req, res) {
    user_model.cancelSubscription(req, res)
  }

}

module.exports = new user();
