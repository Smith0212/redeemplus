const express = require('express')
const user = require("../controllers/user")
const admin = require("../controllers/admin")
const payment = require("../controllers/payment")

const userRouter = (app) => {
  //auth
  app.post("/v1/user/signup", user.signup)
  app.post("/v1/user/login", user.login)
  app.post("/v1/user/verifyOtp", user.verifyOTP)
  app.post("/v1/user/editProfile", user.editProfile)
  app.get("/v1/user/viewProfile", user.viewProfile)
  app.post("/v1/user/logout", user.logout)

  app.get("/v1/subscription/getCategories", user.getCategories)

  //subscription
  app.post("/v1/subscription/boxes", user.getAllSubBoxes)
  app.get("/v1/subscription/box/:id", user.getSubscriptionBoxById)
  app.post("/v1/subscription/subscribe", user.subscribeToBox)
  app.get("/v1/subscription/user/subscriptions", user.getUserSubscriptions)
  app.post("/v1/subscription/cancel/:id", user.cancelSubscription)

  //user orders
  app.get("/v1/order/user/orders", user.getUserOrders)
  app.get("/v1/order/details/:order_id", user.getOrderDetails)

  // // Payment Routes
  // app.post("/v1/payment/create-intent", payment.createPaymentIntent)
  // app.post("/v1/payment/webhook", payment.handleWebhook)
  // app.get("/v1/payment/history", payment.getPaymentHistory)

  //subscription crud
  app.post("/v1/admin/subscription/box/create", admin.createSubscriptionBox)
  app.post("/v1/admin/subscription/box/update", admin.updateSubscriptionBox)
  app.post("/v1/admin/subscription/box/delete", admin.deleteSubscriptionBox)

  //subscription plan crud
  app.post("/v1/admin/subscription/plan/create", admin.createSubscriptionPlan)
  app.post("/v1/admin/subscription/plan/update", admin.updateSubscriptionPlan)
  app.post("/v1/admin/subscription/plan/delete", admin.deleteSubscriptionPlan)

  // Admin Product Management Routes
  app.post("/v1/admin/product/get", admin.getProductsByPlan)
  app.post("/v1/admin/product/add", admin.addProductToPlan)
  app.post("/v1/admin/product/update", admin.updateProduct)
  app.post("/v1/admin/product/delete", admin.deleteProduct)

  //admin orders
  app.get("/v1/admin/orders", admin.getAllOrders)
  app.post("/v1/admin/order/update-status", admin.updateOrderStatus)

  //admin dashboard
  app.get("/v1/admin/dashboard", admin.getSubscriptionAnalytics)

  // Payment routes
  app.post("/v1/payment/create-intent", payment.createPaymentIntent)
  app.post("/v1/payment/webhook", payment.handleWebhook)
  app.get("/v1/payment/history", payment.getPaymentHistory)
}

module.exports = userRouter
