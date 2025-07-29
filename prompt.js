router.post("/signup", checkApiKey, validateJoi(Joi.object({
    username: Joi.string().max(32).required(),
    email: Joi.string().email().max(255).required(),
    phone: Joi.string().max(20).required(),
    country_code: Joi.string().max(6).required(),
    password: Joi.string().required(),
    account_type: Joi.string().valid('individual', 'business').required(),
    signup_type: Joi.string().valid('s', 'g', 'a', 'f').required(), // s: standard, g: google, a: apple, f: facebook
    profile_image: Joi.string().optional(),
    social_id: Joi.string().max(255).optional(),
    business_category_id: Joi.number().optional(),
    instagram_url: Joi.string().uri().optional(),
    tiktok_url: Joi.string().uri().optional(),
    whatsapp_url: Joi.string().uri().optional(),
    business_address: Joi.string().optional(),
    street: Joi.string().max(16).optional(),
    postal_code: Joi.string().max(16).optional(),
    zone: Joi.string().max(16).optional(),
    latitude: Joi.string().max(16).optional(),
    longitude: Joi.string().max(16).optional()
})), authModel.signup);

router.post("/verifyOtp", checkApiKey, checkToken, validateJoi(Joi.object({
    otp: Joi.string().required()
})), authModel.verifyOtp);

router.post("/editProfile", checkApiKey, checkToken, validateJoi(Joi.object({
    username: Joi.string().max(32).optional(),
    email: Joi.string().email().max(255).optional(),
    phone: Joi.string().max(20).optional(),
    country_code: Joi.string().max(6).optional(),
    profile_image: Joi.string().optional(),
    business_category_id: Joi.number().optional(),
    instagram_url: Joi.string().uri().optional(),
    tiktok_url: Joi.string().uri().optional(),
    whatsapp_url: Joi.string().uri().optional(),
    business_address: Joi.string().optional(),
    street: Joi.string().max(16).optional(),
    postal_code: Joi.string().max(16).optional(),
    zone: Joi.string().max(16).optional(),
    latitude: Joi.string().max(16).optional(),
    longitude: Joi.string().max(16).optional()
})), authModel.editProfile);

router.post("/login", checkApiKey, validateJoi(Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
    device_type: Joi.string().valid('A', 'I', 'W').required(),
    device_name: Joi.string().max(64).optional(),
    os_version: Joi.string().max(8).required(),
    app_version: Joi.string().max(8).optional(),
    ip: Joi.string().max(45).required(),
    device_token: Joi.string().required(),
    timezone: Joi.string().max(32).required(),
})), authModel.login);

router.post("/resendOtp", checkApiKey, checkToken, authModel.resendOtp);

router.post("/forgotPassword", checkApiKey, validateJoi(Joi.object({
    email: Joi.string().email().required()
})), authModel.forgotPassword);

router.post("/resetPassword", checkApiKey, validateJoi(Joi.object({
    new_password: Joi.string().required()
})), authModel.resetPassword);

router.post("/logout", checkApiKey, checkToken, authModel.logout);



// Get profile (own or other user's)
router.post(
  "/getProfile",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      profile_user_id: Joi.number().optional(), // If not provided, returns own profile
    }),
  ),
  profileModel.getProfile,
)

// Update profile
router.post(
  "/updateProfile",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      username: Joi.string()
        .min(3)
        .max(20)
        .pattern(/^[a-zA-Z0-9._]+$/)
        .optional(),
      email: Joi.string().email().max(255).optional(),
      phone: Joi.string().max(20).optional(),
      country_code: Joi.string().max(6).optional(),
      profile_image: Joi.string().optional(),
      business_category_id: Joi.number().optional(),
      dob: Joi.date().optional(),
      instagram_url: Joi.string().uri().optional(),
      tiktok_url: Joi.string().uri().optional(),
      whatsapp_url: Joi.string().uri().optional(),
      business_address: Joi.string().optional(),
      street: Joi.string().max(16).optional(),
      postal_code: Joi.string().max(16).optional(),
      zone: Joi.string().max(16).optional(),
      map_url: Joi.string().uri().optional(),
      latitude: Joi.string().max(16).optional(),
      longitude: Joi.string().max(16).optional(),
    }),
  ),
  profileModel.updateProfile,
)

// Change password
router.post(
  "/changePassword",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      old_password: Joi.string().required(),
      new_password: Joi.string().min(8).required(),
    }),
  ),
  profileModel.changePassword,
)

// Delete account
router.post("/deleteAccount", checkApiKey, checkToken, profileModel.deleteAccount)

// Get my reviews
router.post(
  "/getMyReviews",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
    }),
  ),
  profileModel.getMyReviews,
)



// Get all membership plans
router.post("/getplans", checkApiKey, checkToken, membershipModel.getMembershipPlans)

// Get current membership
router.post("/getcurrentmembership", checkApiKey, checkToken, membershipModel.getCurrentMembership)

// Purchase membership
router.post(
  "/purchasemembership",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      plan_id: Joi.number().required(),
      payment_method: Joi.string().optional(),
      transaction_id: Joi.string().optional(),
    }),
  ),
  membershipModel.purchaseMembership,
)

// Get membership history
router.post(
  "/gethistory",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
    }),
  ),
  membershipModel.getMembershipHistory,
)



// Get business categories
router.post(
  "/getbusinesscategories",
  checkApiKey,
  validateJoi(
    Joi.object({
      include_subcategories: Joi.boolean().optional(),
    }),
  ),
  categoryModel.getBusinessCategories,
)

// Get offer types
router.post(
  "/getoffertypes",
  checkApiKey,
  validateJoi(
    Joi.object({
      include_subcategories: Joi.boolean().optional(),
    }),
  ),
  categoryModel.getOfferTypes,
)

// Get category statistics
router.post(
  "/getcategorystats",
  checkApiKey,
  validateJoi(
    Joi.object({
      category_type: Joi.string().valid("business", "offer").optional(),
    }),
  ),
  categoryModel.getCategoryStats,
)

// Get popular categories
router.post(
  "/getpopularcategories",
  checkApiKey,
  validateJoi(
    Joi.object({
      limit: Joi.number().min(1).max(50).optional(),
      category_type: Joi.string().valid("business", "offer").optional(),
    }),
  ),
  categoryModel.getPopularCategories,
)

// Search categories
router.post(
  "/searchcategories",
  checkApiKey,
  validateJoi(
    Joi.object({
      query: Joi.string().min(2).required(),
      category_type: Joi.string().valid("business", "offer").optional(),
      limit: Joi.number().min(1).max(50).optional(),
    }),
  ),
  categoryModel.searchCategories,
)

// Get category details
router.post(
  "/getcategorydetails",
  checkApiKey,
  validateJoi(
    Joi.object({
      category_id: Joi.number().required(),
      category_type: Joi.string().valid("business", "offer").optional(),
    }),
  ),
  categoryModel.getCategoryDetails,
)



// Create offer
router.post(
  "/createOffer",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_type_id: Joi.number().required(),
      business_category_id: Joi.number().optional(),
      image: Joi.string().required(),
      title: Joi.string().max(100).required(),
      subtitle: Joi.string().max(255).optional(),
      description: Joi.string().optional(),
      terms_of_use: Joi.string().optional(),
      discount_percentage: Joi.number().min(0).max(100).optional(),
      total_price: Joi.number().min(0.01).required(),
      old_price: Joi.number().min(0).optional(),
      duration: Joi.number().min(1).max(365).required(),
      quantity_available: Joi.number().min(1).required(),
      quantity_per_user: Joi.number().min(1).optional(),
      pin_code: Joi.string().min(4).max(10).required(),
      is_redeemable_in_store: Joi.boolean().optional(),
      is_delivery_available: Joi.boolean().optional(),
      delivery_fee: Joi.number().min(0).optional(),
      estimated_delivery_time: Joi.string().optional(),
      valid_days: Joi.string()
        .length(7)
        .pattern(/^[01]{7}$/)
        .optional(),
      offer_latitude: Joi.string().optional(),
      offer_longitude: Joi.string().optional(),
      available_branches: Joi.string().optional(),
      valid_times: Joi.array()
        .items(
          Joi.object({
            start_time: Joi.string()
              .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
              .required(),
            end_time: Joi.string()
              .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
              .required(),
          }),
        )
        .optional(),
      user_acknowledgment: Joi.boolean().valid(true).required(),
    }),
  ),
  offerModel.createOffer,
)

// Get offers with filters
router.post(
  "/getOffers",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      category: Joi.string().valid("all", "nearby", "subscribed").optional(),
      offer_type: Joi.number().optional(),
      business_category_id: Joi.number().optional(),
      sort_by: Joi.string().valid("created_at", "price_low", "price_high", "rating", "distance").optional(),
      latitude: Joi.number().optional(),
      longitude: Joi.number().optional(),
      search_query: Joi.string().optional(),
      min_rating: Joi.number().min(1).max(5).optional(),
      max_rating: Joi.number().min(1).max(5).optional(),
      redeem_method: Joi.string().valid("store", "delivery", "both").optional(),
      listed_in_rplus: Joi.boolean().optional(),
    }),
  ),
  offerModel.getOffers,
)

// Get offer details
router.post(
  "/getOfferDetails",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().required(),
    }),
  ),
  offerModel.getOfferDetails,
)

// Update offer
router.post(
  "/updateOffer",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().required(),
      image: Joi.string().optional(),
      title: Joi.string().max(100).optional(),
      subtitle: Joi.string().max(255).optional(),
      description: Joi.string().optional(),
      terms_of_use: Joi.string().optional(),
      pin_code: Joi.string().min(4).max(10).optional(),
      delivery_fee: Joi.number().min(0).optional(),
      estimated_delivery_time: Joi.string().optional(),
      available_branches: Joi.string().optional(),
      valid_times: Joi.array()
        .items(
          Joi.object({
            start_time: Joi.string()
              .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
              .required(),
            end_time: Joi.string()
              .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
              .required(),
          }),
        )
        .optional(),
      user_acknowledgment: Joi.boolean().valid(true).required(),
    }),
  ),
  offerModel.updateOffer,
)

// Delete offer
router.post(
  "/deleteOffer",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().required(),
    }),
  ),
  offerModel.deleteOffer,
)

// List offer in RedeemPlus store
router.post(
  "/listInStore",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().required(),
    }),
  ),
  offerModel.listInRedeemPlusStore,
)

// Get my offers
router.post(
  "/getMyOffers",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      status: Joi.string().valid("active", "expired", "all").optional(),
    }),
  ),
  offerModel.getMyOffers,
)



// Redeem with PIN code
router.post(
  "/redeemwithpin",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().required(),
      pin_code: Joi.string().required(),
      quantity: Joi.number().min(1).optional(),
    }),
  ),
  redemptionModel.redeemWithPinCode,
)

// Request delivery
router.post(
  "/requestdelivery",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().required(),
      delivery_address_id: Joi.number().required(),
      quantity: Joi.number().min(1).optional(),
      special_request: Joi.string().optional(),
    }),
  ),
  redemptionModel.requestDelivery,
)

// Get delivery requests (for business owners)
router.post(
  "/getdeliveryrequests",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      status: Joi.string().valid("all", "pending", "approved", "rejected", "delivered").optional(),
    }),
  ),
  redemptionModel.getDeliveryRequests,
)

// Approve delivery request
router.post(
  "/approvedelivery",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      redemption_id: Joi.number().required(),
    }),
  ),
  redemptionModel.approveDeliveryRequest,
)

// Reject delivery request
router.post(
  "/rejectdelivery",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      redemption_id: Joi.number().required(),
      rejection_reason: Joi.string().required(),
    }),
  ),
  redemptionModel.rejectDeliveryRequest,
)

// Mark as delivered
router.post(
  "/markdelivered",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      redemption_id: Joi.number().required(),
    }),
  ),
  redemptionModel.markAsDelivered,
)

// Get my redemptions
router.post(
  "/getmyredemptions",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      type: Joi.string().valid("all", "pin_code", "delivery").optional(),
    }),
  ),
  redemptionModel.getMyRedemptions,
)

// Get redemption details
router.post(
  "/getredemptiondetails",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      redemption_id: Joi.number().required(),
    }),
  ),
  redemptionModel.getRedemptionDetails,
)



// Add address
router.post(
  "/addaddress",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      address: Joi.string().required(),
      street: Joi.string().max(16).optional(),
      postal_code: Joi.string().max(16).optional(),
      zone: Joi.string().max(16).optional(),
      latitude: Joi.string().max(16).optional(),
      longitude: Joi.string().max(16).optional(),
      country_code: Joi.string().max(6).optional(),
      phone_number: Joi.string().max(20).optional(),
      is_default: Joi.boolean().optional(),
    }),
  ),
  addressModel.addAddress,
)

// Get addresses
router.post("/getaddresses", checkApiKey, checkToken, addressModel.getAddresses)

// Update address
router.post(
  "/updateaddress",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      address_id: Joi.number().required(),
      address: Joi.string().optional(),
      street: Joi.string().max(16).optional(),
      postal_code: Joi.string().max(16).optional(),
      zone: Joi.string().max(16).optional(),
      latitude: Joi.string().max(16).optional(),
      longitude: Joi.string().max(16).optional(),
      country_code: Joi.string().max(6).optional(),
      phone_number: Joi.string().max(20).optional(),
      is_default: Joi.boolean().optional(),
    }),
  ),
  addressModel.updateAddress,
)

// Delete address
router.post(
  "/deleteaddress",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      address_id: Joi.number().required(),
    }),
  ),
  addressModel.deleteAddress,
)

// Set default address
router.post(
  "/setdefaultaddress",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      address_id: Joi.number().required(),
    }),
  ),
  addressModel.setDefaultAddress,
)



// Create report
router.post(
  "/createreport",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      report_type: Joi.string().valid("user", "offer", "problem").required(),
      reported_user_id: Joi.number().optional(),
      reported_offer_id: Joi.number().optional(),
      reason: Joi.string().required(),
      additional_details: Joi.string().max(1000).optional(),
      voice_notes: Joi.array()
        .items(
          Joi.object({
            audio_url: Joi.string().required(),
            duration_seconds: Joi.number().min(1).max(60).required(),
          }),
        )
        .max(3)
        .optional(),
    }),
  ),
  reportModel.createReport,
)

// Get my reports
router.post(
  "/getmyreports",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      status_filter: Joi.string().valid("all", "pending", "reviewed", "resolved", "dismissed").optional(),
      report_type_filter: Joi.string().valid("all", "user", "offer", "problem").optional(),
    }),
  ),
  reportModel.getMyReports,
)

// Get report details
router.post(
  "/getreportdetails",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      report_id: Joi.number().required(),
    }),
  ),
  reportModel.getReportDetails,
)

// Get report reasons
router.post(
  "/getreportreasons",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      report_type: Joi.string().valid("user", "offer", "problem").required(),
    }),
  ),
  reportModel.getReportReasons,
)

// Get report statistics
router.post("/getreportstats", checkApiKey, checkToken, reportModel.getReportStats)

// Update report
router.post(
  "/updatereport",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      report_id: Joi.number().required(),
      additional_details: Joi.string().max(1000).required(),
    }),
  ),
  reportModel.updateReport,
)

// Cancel report
router.post(
  "/cancelreport",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      report_id: Joi.number().required(),
    }),
  ),
  reportModel.cancelReport,
)



// Search offers and users
router.post(
  "/search",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      query: Joi.string().min(2).required(),
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      type: Joi.string().valid("all", "offers", "users").optional(),
      business_category_ids: Joi.array().items(Joi.number()).optional(),
      offer_type_ids: Joi.array().items(Joi.number()).optional(),
      profile_types: Joi.array()
        .items(Joi.string().valid("bronze", "silver", "gold"))
        .optional(),
      redeem_methods: Joi.array().items(Joi.string().valid("store", "delivery")).optional(),
      listed_in_rplus: Joi.boolean().optional(),
      min_rating: Joi.number().min(1).max(5).optional(),
      max_rating: Joi.number().min(1).max(5).optional(),
      latitude: Joi.number().optional(),
      longitude: Joi.number().optional(),
      sort_by: Joi.string().valid("relevance", "rating", "distance", "price_low", "price_high").optional(),
    }),
  ),
  searchModel.search,
)

// Get recently viewed offers
router.post(
  "/getrecentlyviewed",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
    }),
  ),
  searchModel.getRecentlyViewed,
)



// Get settings
router.post("/getsettings", checkApiKey, checkToken, settingsModel.getSettings)

// Update settings
router.post(
  "/updatesettings",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      notification_enabled: Joi.boolean().optional(),
      sound_enabled: Joi.boolean().optional(),
      vibrate_enabled: Joi.boolean().optional(),
      app_updates_enabled: Joi.boolean().optional(),
      delivery_status_enabled: Joi.boolean().optional(),
      subscribers_notification_enabled: Joi.boolean().optional(),
      redeemed_offers_notification_enabled: Joi.boolean().optional(),
      delivery_request_notification_enabled: Joi.boolean().optional(),
      new_service_notification_enabled: Joi.boolean().optional(),
      new_tips_notification_enabled: Joi.boolean().optional(),
      language: Joi.string().valid("en", "ar", "es", "fr", "de", "it", "pt", "ru", "zh", "ja", "ko").optional(),
    }),
  ),
  settingsModel.updateSettings,
)

// Reset settings to default
router.post("/resetsettings", checkApiKey, checkToken, settingsModel.resetSettings)

// Update specific notification setting
router.post(
  "/updatenotificationsetting",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      notification_type: Joi.string()
        .valid(
          "notification_enabled",
          "sound_enabled",
          "vibrate_enabled",
          "app_updates_enabled",
          "delivery_status_enabled",
          "subscribers_notification_enabled",
          "redeemed_offers_notification_enabled",
          "delivery_request_notification_enabled",
          "new_service_notification_enabled",
          "new_tips_notification_enabled",
        )
        .required(),
      enabled: Joi.boolean().required(),
    }),
  ),
  settingsModel.updateNotificationSettings,
)

// Update language
router.post(
  "/updatelanguage",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      language: Joi.string().valid("en", "ar", "es", "fr", "de", "it", "pt", "ru", "zh", "ja", "ko").required(),
    }),
  ),
  settingsModel.updateLanguage,
)

// Get notification preferences
router.post("/getnotificationpreferences", checkApiKey, checkToken, settingsModel.getNotificationPreferences)



// Subscribe to business
router.post(
  "/subscribe",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      business_id: Joi.number().required(),
    }),
  ),
  subscriptionModel.subscribeToBusiness,
)

// Unsubscribe from business
router.post(
  "/unsubscribe",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      business_id: Joi.number().required(),
    }),
  ),
  subscriptionModel.unsubscribeFromBusiness,
)

// Get my subscriptions
router.post(
  "/getmysubscriptions",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
    }),
  ),
  subscriptionModel.getMySubscriptions,
)

// Get my subscribers
router.post(
  "/getmysubscribers",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
    }),
  ),
  subscriptionModel.getMySubscribers,
)

// Get subscription status
router.post(
  "/getsubscriptionstatus",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      business_id: Joi.number().required(),
    }),
  ),
  subscriptionModel.getSubscriptionStatus,
)

// Get offers from subscribed businesses
router.post(
  "/getsubscribedoffers",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      offer_type_id: Joi.number().optional(),
      business_category_id: Joi.number().optional(),
      sort_by: Joi.string().valid("created_at", "price_low", "price_high", "rating").optional(),
    }),
  ),
  subscriptionModel.getSubscribedOffers,
)

// Get subscription statistics
router.post("/getsubscriptionstats", checkApiKey, checkToken, subscriptionModel.getSubscriptionStats)



// Add to wishlist
router.post(
  "/addtowishlist",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().required(),
    }),
  ),
  wishlistModel.addToWishlist,
)

// Remove from wishlist
router.post(
  "/removefromwishlist",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().required(),
    }),
  ),
  wishlistModel.removeFromWishlist,
)

// Get wishlist
router.post(
  "/getwishlist",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional(),
      limit: Joi.number().min(1).max(50).optional(),
      category_filter: Joi.number().optional(),
      sort_by: Joi.string().valid("added_date", "price_low", "price_high", "expiry_soon").optional(),
      status_filter: Joi.string().valid("active", "expired", "all").optional(),
    }),
  ),
  wishlistModel.getWishlist,
)

// Get wishlist statistics
router.post("/getwishliststats", checkApiKey, checkToken, wishlistModel.getWishlistStats)

// Clear expired offers
router.post("/clearexpiredoffers", checkApiKey, checkToken, wishlistModel.clearExpiredOffers)

// Check wishlist status
router.post(
  "/checkwishliststatus",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      offer_id: Joi.number().required(),
    }),
  ),
  wishlistModel.checkWishlistStatus,
)