const pool = require("../../../../config/database")
const stripeConfig = require("../../../../config/stripe")
const common = require("../../../../utilities/common")
const responseCode = require("../../../../utilities/response_code")
const response_message = require("../../../../language/en")
const templates = require("../../../../utilities/email_templates")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)


class payment_model {
  // Create a payment intent
  async createPaymentIntent(req, res) {
    const { amount, order_id, subscription_id } = req.body
    console.log("hellllllllll", req.body)
    const user_id = req.user.id

    try {

      // Check for existing pending payment intent for this subscription
      if (subscription_id) {
        const [existing] = await pool.promise().query(
          `SELECT * FROM tbl_payment_transaction 
         WHERE subscription_id = ? AND user_id = ? AND status = 'pending' 
         ORDER BY created_at DESC LIMIT 1`,
          [subscription_id, user_id]
        );

        if (existing.length > 0) {
          const existingIntent = existing[0];
          // Verify the intent is still valid with Stripe
          try {
            const intent = await stripe.paymentIntents.retrieve(existingIntent.payment_intent_id);
            if (intent.status === 'requires_payment_method') {
              return common.response(res, {
                code: responseCode.SUCCESS,
                message: response_message.payment_intent_created,
                data: {
                  clientSecret: intent.client_secret,
                  paymentIntentId: intent.id,
                  transaction_id: existingIntent.id,
                },
              });
            }
          } catch (e) {
            // Intent no longer valid, proceed to create new one
            console.error("Error retrieving existing payment intent:", e.message);
            return common.response(res, {
              code: responseCode.OPERATION_FAILED,
              message: response_message.payment_intent_failed,
              data: error.message,
            })
          }
        }
      }

      // Get user details
      const userQuery = "SELECT * FROM tbl_user WHERE id = ?"
      const [users] = await pool.promise().query(userQuery, [user_id])

      if (users.length === 0) {
        return common.response(res, {
          code: responseCode.OPERATION_FAILED,
          message: response_message.user_not_found,
          data: null,
        })
      }

      const user = users[0]

      // Check if user has a Stripe customer ID, if not create one
      let customer_id = user.stripe_customer_id
      if (!customer_id) {
        const customer = await stripeConfig.createCustomer(user)
        customer_id = customer.id

        // Update user with Stripe customer ID
        await pool.promise().query("UPDATE tbl_user SET stripe_customer_id = ? WHERE id = ?", [customer_id, user_id])
      }

      // Create metadata for the payment intent
      const metadata = {
        user_id,
      }

      if (order_id) metadata.order_id = order_id
      if (subscription_id) metadata.subscription_id = subscription_id

      // Create payment intent
      const paymentIntent = await stripeConfig.createPaymentIntent(amount, customer_id, metadata)
      console.log("Payment Intent Created:", paymentIntent)
      // Record the payment transaction
      const transactionData = {
        user_id,
        order_id: order_id || null,
        subscription_id: subscription_id || null,
        payment_intent_id: paymentIntent.id,
        amount,
        currency: "usd",
        status: "pending",
      }

      const [result] = await pool.promise().query("INSERT INTO tbl_payment_transaction SET ?", transactionData)

      return common.response(res, {
        code: responseCode.SUCCESS,
        message: response_message.payment_intent_created,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          transaction_id: result.insertId,
        },
      })
    } catch (error) {
      console.error("Payment Intent Error:", error)
      return common.response(res, {
        code: responseCode.OPERATION_FAILED,
        message: response_message.payment_intent_failed,
        data: error.message,
      })
    }
  }

  // Handle Stripe webhook events
  async handleWebhook(req, res) {
    const signature = req.headers["stripe-signature"]
    // console.log("Received Webhook Signature:", signature)
    try {
      const event = stripeConfig.verifyWebhookSignature(req, signature)
      console.log("eventttttWWWWWW :", event.type)

      // Handle the event based on its type
      switch (event.type) {
        case "payment_intent.succeeded":
          await this.handlePaymentSuccess(event.data.object)
          break
        case "payment_intent.payment_failed":
          await this.handlePaymentFailure(event.data.object)
          break
        // Add more event types as needed
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error("Webhook Error:", error)
      return common.response(res, {
        code: responseCode.OPERATION_FAILED,
        message: "Webhook error",
        data: error.message,
      })
    }
  }

  // Handle successful payment
  async handlePaymentSuccess(paymentIntent) {
    try {
      // Update payment transaction
      await pool
        .promise()
        .query("UPDATE tbl_payment_transaction SET status = 'succeeded' WHERE payment_intent_id = ?", [
          paymentIntent.id,
        ])
        console.log("1111111111111111")
      // Get transaction details
      const [transactions] = await pool
        .promise()
        .query("SELECT * FROM tbl_payment_transaction WHERE payment_intent_id = ?", [paymentIntent.id])

      console.log("transactionsssssssswwwwwwwww :", transactions)


      if (transactions.length === 0) {
        console.error("Transaction not found for payment intent:", paymentIntent.id)
        return
      }

      const transaction = transactions[0]

      // Update order or subscription status based on metadata
      if (transaction.order_id) {
        await pool
          .promise()
          .query("UPDATE tbl_order SET payment_method = 'stripe', order_status = 'pending' WHERE id = ?", [
            transaction.order_id,
          ])

        // Send order confirmation email
        await this.sendOrderConfirmationEmail(transaction.order_id)
      }

    } catch (error) {
      console.error("Payment Success Handler Error:", error)
    }
  }

  // Handle failed payment
  async handlePaymentFailure(paymentIntent) {
    try {
      // Update payment transaction
      await pool
        .promise()
        .query("UPDATE tbl_payment_transaction SET status = 'failed', error_message = ? WHERE payment_intent_id = ?", [
          paymentIntent.last_payment_error?.message || "Payment failed",
          paymentIntent.id,
        ])

      // Get transaction details
      const [transactions] = await pool
        .promise()
        .query("SELECT * FROM tbl_payment_transaction WHERE payment_intent_id = ?", [paymentIntent.id])

      if (transactions.length === 0) {
        console.error("Transaction not found for payment intent:", paymentIntent.id)
        return
      }

      const transaction = transactions[0]

      // Get user email
      const [users] = await pool.promise().query("SELECT * FROM tbl_user WHERE id = ?", [transaction.user_id])

      if (users.length === 0) {
        console.error("User not found for transaction:", transaction.id)
        return
      }

      const user = users[0]

      // Send payment failure email
      const subject = "Payment Failed - Action Required"
      const message = templates.payment_failed({
        first_name: user.name.split(" ")[0],
        amount: transaction.amount,
        error: paymentIntent.last_payment_error?.message || "Payment failed",
      })

      await common.sendMail(subject, user.email, message)
    } catch (error) {
      console.error("Payment Failure Handler Error:", error)
    }
  }

  // Get payment history for a user
  async getPaymentHistory(req, res) {
    const user_id = req.user.id

    try {
      const query = `
        SELECT pt.*, o.order_status, us.status as subscription_status,
        sp.name as plan_name, sb.name as box_name
        FROM tbl_payment_transaction pt
        LEFT JOIN tbl_order o ON pt.order_id = o.id
        LEFT JOIN tbl_user_subscription us ON pt.subscription_id = us.id
        LEFT JOIN tbl_subscription_plans sp ON (o.plan_id = sp.id OR us.plan_id = sp.id)
        LEFT JOIN tbl_subscription_boxes sb ON sp.box_id = sb.id
        WHERE pt.user_id = ? AND pt.is_deleted = 0
        ORDER BY pt.created_at DESC
      `

      const [payments] = await pool.promise().query(query, [user_id])

      return common.response(res, {
        code: responseCode.SUCCESS,
        message: response_message.success,
        data: payments,
      })
    } catch (error) {
      console.error("Get Payment History Error:", error)
      return common.response(res, {
        code: responseCode.OPERATION_FAILED,
        message: response_message.unsuccess,
        data: error.message,
      })
    }
  }
}

module.exports = new payment_model()