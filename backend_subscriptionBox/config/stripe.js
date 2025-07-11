const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const common = require("../utilities/common")

module.exports = {
  stripe,

  // Create a Stripe customer
  async createCustomer(user) {
    try {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        phone: user.country_code + user.phone,
        metadata: {
          user_id: user.id,
        },
      })

      return customer
    } catch (error) {
      console.error("Stripe Create Customer Error:", error)
      throw error
    }
  },

  // Create a payment intent
  async createPaymentIntent(amount, customer_id, metadata = {}) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        customer: customer_id,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      })

      return paymentIntent
    } catch (error) {
      console.error("Stripe Payment Intent Error:", error)
      throw error
    }
  },

  // Retrieve a payment intent
  async retrievePaymentIntent(paymentIntentId) {
    try {
      return await stripe.paymentIntents.retrieve(paymentIntentId)
    } catch (error) {
      console.error("Stripe Retrieve Payment Intent Error:", error)
      throw error
    }
  },

  // Create a refund
  async createRefund(paymentIntentId, amount = null) {
    try {
      const refundParams = {
        payment_intent: paymentIntentId,
      }

      if (amount) {
        refundParams.amount = Math.round(amount * 100) // Convert to cents
      }

      return await stripe.refunds.create(refundParams)
    } catch (error) {
      console.error("Stripe Refund Error:", error)
      throw error
    }
  },

  // Verify webhook signature
  verifyWebhookSignature(req, signature) {
    try {
      return stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (error) {
      console.error("Stripe Webhook Signature Error:", error)
      throw error
    }
  },
}
