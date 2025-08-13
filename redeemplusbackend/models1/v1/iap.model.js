const { sendResponse } = require("../../middleware")
const pool = require("../../config/database")
const responseCode = require("../../config/responseCode")
const jwt = require("jsonwebtoken")

const iap_model = {
  // iOS In-App Purchase Webhook Handler
  async handleiOSWebhook(req, res) {
    try {
      console.log("Incoming iOS Subscription Webhook:", JSON.stringify(req.body))

      const { decodeJwt } = await import("jose")

      const payload = req?.body?.signedPayload
      if (!payload) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "invalid_payload" }, {})
      }

      const decodeData = decodeJwt(payload)
      const signedRenewalInfo = decodeJwt(decodeData.data.signedRenewalInfo)
      const signedTransactionInfo = decodeJwt(decodeData.data.signedTransactionInfo)

      const originalTransactionId = signedTransactionInfo.originalTransactionId
      const notification_type = decodeData.notificationType
      const subtype = decodeData.subtype
      const product_id = signedTransactionInfo.productId
      const plan_price = signedTransactionInfo.price
      const expiresDate = signedTransactionInfo?.expiresDate

      console.log("iOS Webhook Data:", {
        originalTransactionId,
        notification_type,
        subtype,
        product_id,
        plan_price,
        expiresDate,
      })

      // Find the plan by iOS product ID
      const planQuery = `
        SELECT * FROM tbl_membership_plans 
        WHERE ios_product_id = $1 AND is_active = TRUE AND is_deleted = FALSE
      `
      const planResult = await pool.query(planQuery, [product_id])

      if (planResult.rows.length === 0) {
        console.log("Plan not found for product_id:", product_id)
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "plan_not_found" }, {})
      }

      const plan = planResult.rows[0]

      // Find existing payment record
      const paymentQuery = `
        SELECT p.*, um.user_id, um.id as membership_id
        FROM tbl_payments p
        LEFT JOIN tbl_user_memberships um ON p.id = um.payment_id
        WHERE p.original_transaction_id = $1 OR p.transaction_id = $1
        ORDER BY p.created_at DESC LIMIT 1
      `
      const paymentResult = await pool.query(paymentQuery, [originalTransactionId])

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        if (notification_type === "DID_RENEW") {
          // Handle subscription renewal
          if (paymentResult.rows.length > 0) {
            const existingPayment = paymentResult.rows[0]
            const user_id = existingPayment.user_id

            // Create new payment record for renewal
            const newPaymentQuery = `
              INSERT INTO tbl_payments (
                user_id, amount, currency, payment_method, transaction_id, 
                original_transaction_id, product_id, status, description, 
                payment_type, platform, webhook_data, verified_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              RETURNING id
            `

            const newPaymentResult = await client.query(newPaymentQuery, [
              user_id,
              plan_price / 1000000, // Convert from micros
              "USD",
              "ios_iap",
              signedTransactionInfo.transactionId,
              originalTransactionId,
              product_id,
              "completed",
              `${plan.name} Membership Renewal`,
              "membership",
              "ios",
              JSON.stringify(decodeData),
              new Date(),
            ])

            const new_payment_id = newPaymentResult.rows[0].id

            // Update existing membership
            const newEndDate = new Date(expiresDate)
            await client.query(
              `UPDATE tbl_user_memberships 
               SET end_date = $1, payment_id = $2, updated_at = CURRENT_TIMESTAMP 
               WHERE user_id = $3 AND plan_id = $4 AND is_active = TRUE`,
              [newEndDate, new_payment_id, user_id, plan.id],
            )

            console.log("iOS subscription renewed successfully")
          }
        } else if (notification_type === "DID_CHANGE_RENEWAL_STATUS") {
          // Handle auto-renewal status change
          if (paymentResult.rows.length > 0) {
            const existingPayment = paymentResult.rows[0]
            const auto_renewing = subtype === "AUTO_RENEW_ENABLED"

            await client.query(
              `UPDATE tbl_user_memberships 
               SET auto_renewing = $1, updated_at = CURRENT_TIMESTAMP 
               WHERE id = $2`,
              [auto_renewing, existingPayment.membership_id],
            )

            console.log("iOS auto-renewal status updated:", auto_renewing)
          }
        } else if (notification_type === "EXPIRED" || notification_type === "GRACE_PERIOD_EXPIRED") {
          // Handle subscription expiration
          if (paymentResult.rows.length > 0) {
            const existingPayment = paymentResult.rows[0]

            await client.query(
              `UPDATE tbl_user_memberships 
               SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP 
               WHERE id = $1`,
              [existingPayment.membership_id],
            )

            await client.query(
              `UPDATE tbl_payments 
               SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
               WHERE id = $1`,
              [existingPayment.id],
            )

            console.log("iOS subscription expired")
          }
        }

        await client.query("COMMIT")
        return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "webhook_processed" }, {})
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }
    } catch (err) {
      console.error("iOS Webhook Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "webhook_failed" }, err.message)
    }
  },

  // Android In-App Purchase Webhook Handler
  async handleAndroidWebhook(req, res) {
    try {
      console.log("Incoming Android Subscription Webhook:", JSON.stringify(req.body))

      const { message, subscription } = req.body

      if (!message || !message.data) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "invalid_payload" }, {})
      }

      // Decode the base64 message
      const decodedData = JSON.parse(Buffer.from(message.data, "base64").toString())

      const {
        subscriptionNotification: { subscriptionId, purchaseToken, notificationType },
        packageName,
      } = decodedData

      console.log("Android Webhook Data:", {
        subscriptionId,
        purchaseToken,
        notificationType,
        packageName,
      })

      // Find the plan by Android product ID
      const planQuery = `
        SELECT * FROM tbl_membership_plans 
        WHERE android_product_id = $1 AND is_active = TRUE AND is_deleted = FALSE
      `
      const planResult = await pool.query(planQuery, [subscriptionId])

      if (planResult.rows.length === 0) {
        console.log("Plan not found for subscriptionId:", subscriptionId)
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "plan_not_found" }, {})
      }

      const plan = planResult.rows[0]

      // Find existing payment record
      const paymentQuery = `
        SELECT p.*, um.user_id, um.id as membership_id
        FROM tbl_payments p
        LEFT JOIN tbl_user_memberships um ON p.id = um.payment_id
        WHERE p.transaction_id = $1 OR p.receipt_data = $1
        ORDER BY p.created_at DESC LIMIT 1
      `
      const paymentResult = await pool.query(paymentQuery, [purchaseToken])

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        // Handle different notification types
        switch (notificationType) {
          case 2: // SUBSCRIPTION_RENEWED
            if (paymentResult.rows.length > 0) {
              const existingPayment = paymentResult.rows[0]
              const user_id = existingPayment.user_id

              // Create new payment record for renewal
              const newPaymentQuery = `
                INSERT INTO tbl_payments (
                  user_id, amount, currency, payment_method, transaction_id, 
                  receipt_data, product_id, status, description, 
                  payment_type, platform, webhook_data, verified_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id
              `

              const newPaymentResult = await client.query(newPaymentQuery, [
                user_id,
                plan.price,
                "USD",
                "android_iap",
                purchaseToken,
                purchaseToken,
                subscriptionId,
                "completed",
                `${plan.name} Membership Renewal`,
                "membership",
                "android",
                JSON.stringify(decodedData),
                new Date(),
              ])

              const new_payment_id = newPaymentResult.rows[0].id

              // Update existing membership
              const newEndDate = new Date()
              newEndDate.setDate(newEndDate.getDate() + plan.duration_days)

              await client.query(
                `UPDATE tbl_user_memberships 
                 SET end_date = $1, payment_id = $2, updated_at = CURRENT_TIMESTAMP 
                 WHERE user_id = $3 AND plan_id = $4 AND is_active = TRUE`,
                [newEndDate, new_payment_id, user_id, plan.id],
              )

              console.log("Android subscription renewed successfully")
            }
            break

          case 13: // SUBSCRIPTION_EXPIRED
            if (paymentResult.rows.length > 0) {
              const existingPayment = paymentResult.rows[0]

              await client.query(
                `UPDATE tbl_user_memberships 
                 SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $1`,
                [existingPayment.membership_id],
              )

              await client.query(
                `UPDATE tbl_payments 
                 SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $1`,
                [existingPayment.id],
              )

              console.log("Android subscription expired")
            }
            break

          default:
            console.log("Unhandled Android notification type:", notificationType)
        }

        await client.query("COMMIT")
        return sendResponse(req, res, 200, responseCode.SUCCESS, { keyword: "webhook_processed" }, {})
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }
    } catch (err) {
      console.error("Android Webhook Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "webhook_failed" }, err.message)
    }
  },

  // Verify and process IAP purchase
  async verifyPurchase(req, res) {
    try {
      const user_id = req.user.id
      const {
        platform, // 'ios' or 'android'
        product_id,
        transaction_id,
        receipt_data,
        original_transaction_id, // For iOS
      } = req.body

      if (!platform || !product_id || !transaction_id || !receipt_data) {
        return sendResponse(req, res, 400, responseCode.OPERATION_FAILED, { keyword: "missing_parameters" }, {})
      }

      // Find the plan by product ID
      const productIdField = platform === "ios" ? "ios_product_id" : "android_product_id"
      const planQuery = `
        SELECT * FROM tbl_membership_plans 
        WHERE ${productIdField} = $1 AND is_active = TRUE AND is_deleted = FALSE
      `
      const planResult = await pool.query(planQuery, [product_id])

      if (planResult.rows.length === 0) {
        return sendResponse(req, res, 404, responseCode.OPERATION_FAILED, { keyword: "plan_not_found" }, {})
      }

      const plan = planResult.rows[0]

      // Check if transaction already exists
      const existingPaymentQuery = `
        SELECT * FROM tbl_payments 
        WHERE transaction_id = $1 OR (original_transaction_id = $2 AND $2 IS NOT NULL)
      `
      const existingPayment = await pool.query(existingPaymentQuery, [transaction_id, original_transaction_id])

      if (existingPayment.rows.length > 0) {
        return sendResponse(
          req,
          res,
          200,
          responseCode.OPERATION_FAILED,
          { keyword: "transaction_already_processed" },
          {},
        )
      }

      const client = await pool.connect()

      try {
        await client.query("BEGIN")

        // Create payment record
        const paymentQuery = `
          INSERT INTO tbl_payments (
            user_id, amount, currency, payment_method, transaction_id, 
            original_transaction_id, receipt_data, product_id, status, 
            description, payment_type, platform, verified_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id
        `

        const paymentResult = await client.query(paymentQuery, [
          user_id,
          plan.price,
          "USD",
          `${platform}_iap`,
          transaction_id,
          original_transaction_id,
          receipt_data,
          product_id,
          "completed",
          `${plan.name} Membership Purchase`,
          "membership",
          platform,
          new Date(),
        ])

        const payment_id = paymentResult.rows[0].id

        // Deactivate existing membership
        await client.query(
          "UPDATE tbl_user_memberships SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE",
          [user_id],
        )

        // Create new membership
        const start_date = new Date()
        const end_date = new Date()
        end_date.setDate(start_date.getDate() + plan.duration_days)

        const membershipQuery = `
          INSERT INTO tbl_user_memberships 
          (user_id, plan_id, payment_id, start_date, end_date, auto_renewing)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `

        const membershipResult = await client.query(membershipQuery, [
          user_id,
          plan.id,
          payment_id,
          start_date,
          end_date,
          true, // IAP subscriptions are auto-renewing by default
        ])

        await client.query("COMMIT")

        // Update user step if needed
        let stepResult
        if (req.user.step == 2) {
          stepResult = await pool.query("UPDATE tbl_users SET step = 3 WHERE id = $1 RETURNING step", [user_id])
        }

        return sendResponse(
          req,
          res,
          200,
          responseCode.SUCCESS,
          { keyword: "membership_purchased" },
          {
            membership_id: membershipResult.rows[0].id,
            payment_id,
            step: req.user.step == 2 ? stepResult.rows[0].step : null,
            plan_name: plan.name,
            start_date,
            end_date,
          },
        )
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }
    } catch (err) {
      console.error("Verify Purchase Error:", err)
      return sendResponse(req, res, 500, responseCode.OPERATION_FAILED, { keyword: "failed" }, err.message)
    }
  },
}

module.exports = iap_model
