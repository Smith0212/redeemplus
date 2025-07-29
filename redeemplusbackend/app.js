require("dotenv").config()
const con = require("./config/database") // Database connection setup
const express = require("express")
const cros = require("cors")

const app = express()

// Setting up express for text parser
app.use(cros())
app.use(express.text())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Import all routes
const auth_route = require("./routes/v1/auth.route")
const profile_route = require("./routes/v1/profile.route")
const offer_route = require("./routes/v1/offer.route")
const membership_route = require("./routes/v1/membership.route")
const redemption_route = require("./routes/v1/redemption.route")
const address_route = require("./routes/v1/address.route")
const search_route = require("./routes/v1/search.route")
const notification_route = require("./routes/v1/notification.route")
const review_route = require("./routes/v1/review.route")
const subscription_route = require("./routes/v1/subscription.route")
const wishlist_route = require("./routes/v1/wishlist.route")
const report_route = require("./routes/v1/report.route")
const settings_route = require("./routes/v1/settings.route")
const static_route = require("./routes/v1/static.route")
const category_route = require("./routes/v1/category.route")

// Use routes
app.use("/api/v1/auth", auth_route)
app.use("/api/v1/profile", profile_route)
app.use("/api/v1/offer", offer_route)
app.use("/api/v1/membership", membership_route)
app.use("/api/v1/redemption", redemption_route)
app.use("/api/v1/address", address_route)
app.use("/api/v1/search", search_route)
app.use("/api/v1/notification", notification_route)
app.use("/api/v1/review", review_route)
app.use("/api/v1/subscription", subscription_route)
app.use("/api/v1/wishlist", wishlist_route)
app.use("/api/v1/report", report_route)
app.use("/api/v1/settings", settings_route)
app.use("/api/v1/static", static_route)
app.use("/api/v1/category", category_route)

try {
  const port = process.env.PORT || 3000

  console.log("DEV_MODE:", process.env.DEV_MODE)
  if (process.env.DEV_MODE === "true") {
    app.listen(port, () => {
      console.log("Server running on port :", port)
    })
  } else {
    // Production configuration
  }
} catch (err) {
  console.log("err :", err)
  console.log("Failed to connect")
}
