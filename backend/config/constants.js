module.exports = {

    'APP_NAME': `Cj's`,

    'COUNTRY': ['Kenya', 'Uganda'],
    'CURRENCY': ['KES', 'UGX'],
    'SERVICE_TYPE': ['delivery', 'carhop', 'dine_in', 'pick_up'],
    'PAYMENT_MODES': ['cash_on_delivery', 'momo_pay', 'airtel_money', 'wallet', 'card', 'm_pesa'],

    'UGANDA_TIMEZONE': "Africa/Kampala",
    'KENYA_TIMEZONE': "Africa/Nairobi",

    'ADMIN_IMAGE_PATH': process.env.AWS_S3_PATH + 'admin/',
    'USER_IMAGE_PATH': process.env.AWS_S3_PATH + 'customer/',
    'RIDER_IMAGE_PATH': process.env.AWS_S3_PATH + 'rider/',
    'CATEGORY_IMAGE_PATH': process.env.AWS_S3_PATH + 'category/',
    'MENU_IMAGE_PATH': process.env.AWS_S3_PATH + 'menu_items/',
    'MENU_ACCOMPANIMENTS_IMAGE_PATH': process.env.AWS_S3_PATH + 'menu_accompaniments/',
    'MENU_ADD_ONS_IMAGE_PATH': process.env.AWS_S3_PATH + 'menu_add_ons/',
    'MENU_CHOICE_ITEMS_IMAGE_PATH': process.env.AWS_S3_PATH + 'menu_choice/',
    'MENU_COMPLIMENTARY_IMAGE_PATH': process.env.AWS_S3_PATH + 'menu_complimentary/',
    'ADMIN_BANNER_PATH': process.env.AWS_S3_PATH + 'admin_banner/',
    'CAREER_IMAGE_PATH': process.env.AWS_S3_PATH + 'careers/',
    'SETTING_IMAGE_PATH': process.env.AWS_S3_PATH + 'setting/',
    'RESTAURANT_IMAGE_PATH': process.env.AWS_S3_PATH + 'restaurant/',
    'APP_IMAGE_PATH': process.env.AWS_S3_PATH + 'app/',
    'GIFT_CARD_IMAGE_PATH': process.env.AWS_S3_PATH + 'gift_card/',
    'LOYALTY_IMAGE_PATH': process.env.AWS_S3_PATH + 'loyalty/',
    'COUNTRY_IMAGE_PATH': process.env.AWS_S3_PATH + 'other/country_images/',
    'OTHER_IMAGE_PATH': process.env.AWS_S3_PATH + 'other/',
    'FEEDBACK_REVIEW_IMAGE_PATH': process.env.AWS_S3_PATH + 'feedback_review/',
    'TUTORIAL_IMAGE_PATH': process.env.AWS_S3_PATH + 'tutorial/',
    'INVENTORY_IMAGE_PATH': process.env.AWS_S3_PATH + 'inventory/',
    'CAMPAIGN_EVENTS_MEDIA_PATH': process.env.AWS_S3_PATH + 'campaign_events/',
    'ORDER_REPORT_IMAGE_PATH': process.env.AWS_S3_PATH + 'order_report/',

    'GIFT_CARD_SETTING_KEY': 'user_gift_card',
    'USER_MEMBERSHIP_SETTING_KEY': 'user_premium_membership',
    'LOYALTY_SETTING_KEY': 'loyalty_points',
    'WALLET_PAYMENT_MODES_SETTINGS_KEY': 'wallet_payment_modes',

    'TaxPercentage': 0.18,

    'FILE_EXTENSIONS': {
        'video': [
            "mp4", "mov", "avi", "wmv", "mkv", "flv", "webm",
            "3gp", "m4v", "mpg", "mpeg", "avchd", "ts",
            "hevc", "vob", "ogv"
        ],
        'presentations': [
            "ppt", "pptx", "pps", "ppsx", "odp", "key",
            "pecha", "gslides"
        ],
        'documents': [
            "txt", "doc", "docx", "rtf", "odt", "pdf",
            "epub", "mobi", "xls", "xlsx", "ods", "csv",
            "xml", "md"
        ]
    },

    'USER_COLOR_CODES': {
        "NEW": 18,
        "REGULAR": 19,
        "PREMIUM": 20,
        "RED_FLAG": 21,
        "PRANK": 22,
        "CONCESSION": 23,
        "COMPLAINING": 24,
        "CANCELLING": 25,
        "INACTIVE": 26,
        "BLOCKED": 27,
        "DOUBLE_ORDER": 28,
        "WRONG_ADDRESS": 29,
        "CHANGE_IN_SERVICE": 30,
        "SPECIFIC_BRANCH": 31,
    },

    "permissions": [
        // dashboard module --------------------------------
        "dashboards",

        // user module --------------------------------
        "customers",

        // restaurant module --------------------------------
        "restaurant",
        "time_table",

        // rider module --------------------------------
        "rider",
        "leaderboard",
        "inventory",
        "rider_delayed",
        "tutorials",

        // career module --------------------------------
        "category",
        "sub_category",

        // order module --------------------------------
        "order",
        "delivery",
        "pick_up",
        "dine_in",
        "carhop",
        "report_order",

        // campaign module --------------------------------
        "services",
        "promocodes",
        "gift_card",
        "campaigns",
        "send_notification",
        "app_escalation",

        // feedback module --------------------------------
        "feedback",

        // menu module --------------------------------
        "menus",
        "add_items",
        "menu_list",
        "accompaniment",
        "add_ons",
        "delivery_charges",

        // manage pages module --------------------------------
        "manage_pages",

        // loyalty module --------------------------------
        "loyalty_points",
        "rewards",
        "membership",

        // setting module --------------------------------
        "setting",
        "reports",
        "page_content",

        // alerts module --------------------------------
        "alerts", 
        "alerts_customer",
        "alerts_branch",
        "alerts_rider",
        "alerts_call_centre"
    ],

    //////////////////////////////////////////////////////////////////////
    //                           development                            //
    //////////////////////////////////////////////////////////////////////

    'ENCRYPTION_BYPASS': false,
};