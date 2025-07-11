const payment_model = require("../models/payment_model")
const importRules = require("../../../../utilities/rules")
const middleware = require("../../../../middleware/validators")

class payment {
  // Create a payment intent
  createPaymentIntent(req, res) {
    const paymentData = middleware.decryption(req.body)
    req.body = paymentData

    const rules = importRules.createPaymentIntent
    const message = {
      required: req.language.required,
    }
    const keywords = {
      amount: req.language.amount,
    }

    if (middleware.checkValidationRules(req, res, paymentData, rules, message, keywords)) {
      payment_model.createPaymentIntent(req, res)
    }
  }

  // Handle Stripe webhook
  handleWebhook(req, res) {
    payment_model.handleWebhook(req, res)
  }

  // Get payment history
  getPaymentHistory(req, res) {
    payment_model.getPaymentHistory(req, res)
  }
}

module.exports = new payment()
