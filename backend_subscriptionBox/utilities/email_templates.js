const globals = {
  app_name: "SubscriptionBox",
}

exports.OTP = (result) => {
  const template = `<!DOCTYPE html>
  <html>
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>OTP Verification</title>
  </head>
  <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
      <center>
          <table width="600" style="background-color: #ffffff; padding: 20px; border-radius: 5px;">
              <tr>
                  <td style="text-align: center;">
                      <h2 style="color: #333;">OTP Verification</h2>
                      <p>Dear <strong>${result.first_name}</strong>,</p>
                      <p>Your One-Time Password (OTP) for verification is:</p>
                      <h3 style="color: #007BFF; font-size: 24px;">${result.otp}</h3>
                      <p>Please enter this OTP to complete your verification process.</p>
                      <p>This OTP is valid for 10 minutes. Do not share it with anyone.</p>
                      <p>Thank you,</p>
                      <p><strong>${globals.app_name} Team</strong></p>
                  </td>
              </tr>
          </table>
      </center>
  </body>
  </html>`
  return template
}

exports.welcome_email = (result) => {
  const template = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Welcome to ${globals.app_name}</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <center>
        <table width="600" style="background-color: #ffffff; padding: 20px; border-radius: 5px;">
            <tr>
                <td style="text-align: center;">
                    <h2 style="color: #333;">Welcome, ${result.first_name}!</h2>
                    <p>We're excited to have you join <strong>${globals.app_name}</strong>.</p>
                    <p>Get started by logging into your account and exploring our features.</p>
                    <p>If you have any questions, feel free to contact our support team.</p>
                    <p>Happy exploring!</p>
                    <p>Thank you,</p>
                    <p><strong>${globals.app_name} Team</strong></p>
                </td>
            </tr>
        </table>
    </center>
</body>
</html>`
  return template
}

exports.order_accepted = (emailData) => {
  const template = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Order Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <center>
        <table width="600" style="background-color: #ffffff; padding: 20px; border-radius: 5px;">
            <tr>
                <td style="text-align: center;">
                    <h2 style="color: #333;">Order Confirmation</h2>
                    <p>Dear <strong>${emailData.first_name}</strong>,</p>
                    <p>Thank you for your order! Your payment of <strong>${emailData.currency} ${emailData.amount}</strong> has been successfully processed.</p>
                    <p>Order ID: <strong>#${emailData.order_id}</strong></p>
                    <p>We're preparing your subscription box for shipping and will notify you once it's on the way.</p>
                    <p>Thank you for choosing us!</p>
                    <p><strong>${globals.app_name} Team</strong></p>
                </td>
            </tr>
        </table>
    </center>
</body>
</html>`
  return template
}

exports.orderDelivered = (emailData) => {
  const template = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Order Delivered</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <center>
        <table width="600" style="background-color: #ffffff; padding: 20px; border-radius: 5px;">
            <tr>
                <td style="text-align: center;">
                    <h2 style="color: #333;">Your Order Has Been Delivered!</h2>
                    <p>Dear <strong>${emailData.first_name}</strong>,</p>
                    <p>Great news! Your order <strong>#${emailData.order_id}</strong> has been delivered.</p>
                    <p>We hope you enjoy your subscription box. If you have any feedback or questions, please don't hesitate to contact us.</p>
                    <p>Thank you for your business!</p>
                    <p><strong>${globals.app_name} Team</strong></p>
                </td>
            </tr>
        </table>
    </center>
</body>
</html>`
  return template
}

exports.payment_failed = (emailData) => {
  const template = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Payment Failed</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <center>
        <table width="600" style="background-color: #ffffff; padding: 20px; border-radius: 5px;">
            <tr>
                <td style="text-align: center;">
                    <h2 style="color: #333;">Payment Failed</h2>
                    <p>Dear <strong>${emailData.first_name}</strong>,</p>
                    <p>We're sorry, but your payment of <strong>${emailData.currency} ${emailData.amount}</strong> could not be processed.</p>
                    <p>This could be due to insufficient funds, expired card, or other issues with your payment method.</p>
                    <p>Please log in to your account and update your payment information to complete your subscription.</p>
                    <p>If you need assistance, please contact our support team.</p>
                    <p>Thank you,</p>
                    <p><strong>${globals.app_name} Team</strong></p>
                </td>
            </tr>
        </table>
    </center>
</body>
</html>`
  return template
}

exports.subscription_renewed = (emailData) => {
  const template = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Subscription Renewed</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <center>
        <table width="600" style="background-color: #ffffff; padding: 20px; border-radius: 5px;">
            <tr>
                <td style="text-align: center;">
                    <h2 style="color: #333;">Subscription Renewed</h2>
                    <p>Dear <strong>${emailData.first_name}</strong>,</p>
                    <p>Your subscription for <strong>${emailData.box_name}</strong> has been successfully renewed.</p>
                    <p>Payment of <strong>${emailData.currency} ${emailData.amount}</strong> has been processed.</p>
                    <p>Your next box will be shipped according to your subscription schedule.</p>
                    <p>Thank you for your continued support!</p>
                    <p><strong>${globals.app_name} Team</strong></p>
                </td>
            </tr>
        </table>
    </center>
</body>
</html>`
  return template
}

exports.subscription_cancelled = (emailData) => {
  const template = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Subscription Cancelled</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <center>
        <table width="600" style="background-color: #ffffff; padding: 20px; border-radius: 5px;">
            <tr>
                <td style="text-align: center;">
                    <h2 style="color: #333;">Subscription Cancelled</h2>
                    <p>Dear <strong>${emailData.first_name}</strong>,</p>
                    <p>Your subscription for <strong>${emailData.box_name}</strong> has been cancelled as requested.</p>
                    <p>You will no longer be charged for this subscription.</p>
                    <p>We're sorry to see you go. If you'd like to resubscribe in the future, you can do so from your account.</p>
                    <p>Thank you for being a customer!</p>
                    <p><strong>${globals.app_name} Team</strong></p>
                </td>
            </tr>
        </table>
    </center>
</body>
</html>`
  return template
}

exports.subscription_confirmation = (emailData) => {
    const template = `<!DOCTYPE html>
<html>
<head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Subscription Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
        <center>
                <table width="600" style="background-color: #ffffff; padding: 20px; border-radius: 5px;">
                        <tr>
                                <td style="text-align: center;">
                                        <h2 style="color: #333;">Subscription Confirmed</h2>
                                        <p>Dear <strong>${emailData.first_name}</strong>,</p>
                                        <p>Your subscription (<strong>#${emailData.subscription_id}</strong>) for <strong>${emailData.box_name}</strong> (${emailData.plan_name}) has been successfully activated.</p>
                                        <p>Amount: <strong>${emailData.amount}</strong></p>
                                        <p>Start Date: <strong>${emailData.start_date}</strong></p>
                                        <p>End Date: <strong>${emailData.end_date}</strong></p>
                                        <p>Thank you for subscribing to <strong>${globals.app_name}</strong>!</p>
                                        <p><strong>${globals.app_name} Team</strong></p>
                                </td>
                        </tr>
                </table>
        </center>
</body>
</html>`
    return template
}

exports.order_confirmation = (emailData) => {
    const template = `<!DOCTYPE html>
<html>
<head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Order Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
        <center>
                <table width="600" style="background-color: #ffffff; padding: 20px; border-radius: 5px;">
                        <tr>
                                <td style="text-align: center;">
                                        <h2 style="color: #333;">Order Confirmation</h2>
                                        <p>Dear <strong>${emailData.first_name}</strong>,</p>
                                        <p>Thank you for your order!</p>
                                        <p><strong>Order ID:</strong> #${emailData.order_id}</p>
                                        <p><strong>Box:</strong> ${emailData.box_name}</p>
                                        <p><strong>Plan:</strong> ${emailData.plan_name}</p>
                                        <p><strong>Amount:</strong> ${emailData.amount}</p>
                                        <p><strong>Order Date:</strong> ${emailData.order_date}</p>
                                        <p>We are processing your order and will notify you once it ships.</p>
                                        <p>Thank you for choosing <strong>${globals.app_name}</strong>!</p>
                                        <p><strong>${globals.app_name} Team</strong></p>
                                </td>
                        </tr>
                </table>
        </center>
</body>
</html>`
    return template
}
