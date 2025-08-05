// send OTP via email here
// For simple signup, send OTP to email
// module | days
// userProfile = 1 (28 july)
// membership = 2
// category = 2
// offer = 3 (4 august)
// redeemption = 7
// address = 1
// report (3 types: 1-problem(with audio and attachment), 2-profile, 3-offer) & rewiew (2 types: 1-offer, 2-profile) = 4
// searches and filter = 1
// user settings and notification settings management = 1
// payment and notification integration = 3
// subscription and wishlist management = 2
// static pages = 1



// module | days
// userProfile = 1 (28 july)
// membership = 2
// address = 1
// offer = 3 (4 august)

// userProfile apis:
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

// membership apis:
// Get all membership plans
router.post("/getplans", checkApiKey, checkToken, membershipModel.getMembershipPlans)

// Get current membership
router.post("/getcurrentmembership", checkApiKey, checkToken, membershipModel.getCurrentMembership)

// Purchase membership (with payment gateway integration)
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

// offer apis:
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

router.post(
  "/listOffers",
  checkApiKey,
  checkToken,
  validateJoi(
    Joi.object({
      page: Joi.number().min(1).optional().default(1),
      limit: Joi.number().min(1).max(50).optional().default(10),
      type: Joi.string().valid("all", "nearby", "subscribed").optional().default("all"),
      // Support both single value and array parameters
      offer_type: Joi.number().optional(), // For backward compatibility
      offer_type_ids: Joi.array().items(Joi.number()).optional(), // New array parameter
      business_category_id: Joi.number().optional(), // For backward compatibility
      business_category_ids: Joi.array().items(Joi.number()).optional(), // New array parameter
      sort_by: Joi.string()
        .valid("created_at", "price_low", "price_high", "rating", "distance", "relevance")
        .optional()
        .default("created_at"),
      latitude: Joi.number().when('type', {
        is: 'nearby',
        then: Joi.required(),
        otherwise: Joi.optional()
      }).when('sort_by', {
        is: 'distance',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      longitude: Joi.number().when('type', {
        is: 'nearby',
        then: Joi.required(),
        otherwise: Joi.optional()
      }).when('sort_by', {
        is: 'distance',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      search_query: Joi.string().optional(), // Original parameter name
      min_rating: Joi.number().min(0).max(5).optional(),
      max_rating: Joi.number().min(0).max(5).optional(),
      redeem_method: Joi.string().valid("store", "delivery", "both").optional(), // For backward compatibility
      redeem_methods: Joi.array().items(Joi.string().valid("store", "delivery")).optional(), // New array parameter
      listed_in_rplus: Joi.boolean().optional(),
      profile_types: Joi.array().items(Joi.string().valid("bronze", "silver", "gold")).optional(),
    })
    .with('latitude', 'longitude')
    .with('longitude', 'latitude')
    .with('min_rating', ['min_rating', 'max_rating'])
    .with('max_rating', ['min_rating', 'max_rating'])
  ),
  offerModel.listOffers
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

// address apis:
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

// category apis:
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

// Search categories
router.post(
  "/searchcategories",
  checkApiKey,
  validateJoi(
    Joi.object({
      query: Joi.string().min(2).required(),
      limit: Joi.number().min(1).max(50).optional(),
    }),
  ),
  categoryModel.searchCategories,
)


// 
// 1. User Profile Module (1 day)
// Functionality Covered:

// Get Profile (self/other)

// Update Profile (with business info, social links, coordinates)

// Change Password (old → new with validations)

// Delete Account (logical deletion)

// Fetch My Reviews (with pagination)

// Details:
// Covers complete user profile management. Includes strong validations, social links parsing, and pagination in reviews. Unit tests will validate all API responses and error scenarios (e.g., invalid user ID, email conflicts). Edge case handling includes partial updates, empty profile data, and password mismatch errors.

// 2. Membership Module (2 days)
// Functionality Covered:

// Get Membership Plans

// Get Current Membership

// Purchase Membership (with/without payment)

// Get Membership History (paginated)

// Details:
// Handles full membership lifecycle from plan fetch to purchase and history. Includes free vs paid plan logic, integration hooks for payment handling, and tracking expiry or active status. Unit tests will verify membership states, payment bypass, and invalid transaction handling. Edge case testing covers plan ID mismatches, repurchase attempts, and expired memberships.

// 3. Offer Module (4 days)
// Functionality Covered:

// Create Offer (with pricing, delivery/store options, valid days checking and time slots management)

// List Offers (with filters: type, distance, rating, category, etc.)

// Get Offer Details

// Update Offer

// Delete Offer

// List in Store (RedeemPlus) !!!

// Get My Offers (paginated + by status)

// Details:
// Comprehensive offer management with full search, filter, sort, and CRUD operations. Complex logic includes Haversine formula for distance-based sorting, time-based availability, and redeem/delivery options. Unit testing will cover each function for correctness, validation failures, and filter results. Edge cases include overlapping time ranges, expired offers, and incorrect geo-coordinates.

// Payment Integration Buffer (6 hours)
// 5 hours for friday (to equate -5 hours)

